// ============================================================================
//  THE DATA-ACCESS LAYER  -  the ONLY file in the app that talks to a database.
//
//  Everything else (screens, hooks, business logic in src/lib/logic) works on plain
//  JavaScript objects and calls only the functions exported here.
//
//  Hosted builds use Base44; Electron desktop builds use local JSON and file storage
//  through the preload bridge while keeping this interface unchanged.
//
//    dataLayer.loadAll()                    -> { collections, products, printOrders, stores, priceTiers,
//                                                deliveries, sales, payments, returns, preorders }
//                                              (each an array of records with `id` and `created_date`)
//    dataLayer.loadSettings()               -> array of { id, key, value }
//    dataLayer.create(table, data)          -> the created record (with id + created_date)
//    dataLayer.bulkCreate(table, rows)      -> array of created records
//    dataLayer.update(table, id, patch)     -> the updated record
//    dataLayer.remove(table, id)            -> void
//    dataLayer.uploadPrivateFile(file)      -> a file reference string (e.g. a local file name / IndexedDB key)
//    dataLayer.resolveFileUrl(fileRef)      -> a URL the browser can play / open (e.g. an object URL)
// ============================================================================
import { base44 } from '@/api/base44Client';

const ENTITIES = {
  collections: 'Collection',
  products: 'Product',
  printOrders: 'PrintOrder',
  stores: 'Store',
  towns: 'Town',
  priceTiers: 'PriceTier',
  deliveries: 'Delivery',
  sales: 'StoreSale',
  payments: 'StorePayment',
  returns: 'StoreReturn',
  preorders: 'Preorder',
  packageBatches: 'PackageBatch',
  packages: 'Package',
  expenses: 'Expense',
};
const SETTINGS_ENTITY = 'AppSetting';
const PAGE_SIZE = 1000;

export const TABLES = Object.keys(ENTITIES);

async function listAll(entityName) {
  const entity = base44.entities[entityName];
  const rows = [];
  let cursor;
  for (;;) {
    const page = await entity.list({ sort: 'created_date', limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) });
    rows.push(...(page.items || []));
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return rows;
}

const entityOf = (table) => base44.entities[table === 'settings' ? SETTINGS_ENTITY : ENTITIES[table]];

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export const dataLayer = {
  async loadAll() {
    if (window.littlemissDesktop) return window.littlemissDesktop.loadAll();
    const entries = await Promise.all(TABLES.map(async (table) => [table, await listAll(ENTITIES[table])]));
    return Object.fromEntries(entries);
  },

  loadSettings() {
    if (window.littlemissDesktop) return window.littlemissDesktop.loadSettings();
    return listAll(SETTINGS_ENTITY);
  },

  create(table, data) {
    if (window.littlemissDesktop) return window.littlemissDesktop.create(table, data);
    return entityOf(table).create(data);
  },

  bulkCreate(table, rows) {
    if (window.littlemissDesktop) return window.littlemissDesktop.bulkCreate(table, rows);
    return entityOf(table).bulkCreate(rows);
  },

  update(table, id, patch) {
    if (window.littlemissDesktop) return window.littlemissDesktop.update(table, id, patch);
    return entityOf(table).update(id, patch);
  },

  async remove(table, id) {
    if (window.littlemissDesktop) return window.littlemissDesktop.remove(table, id);
    await entityOf(table).delete(id);
  },

  // Files are stored privately; the app keeps only the returned reference.
  async uploadPrivateFile(file) {
    if (window.littlemissDesktop) {
      return window.littlemissDesktop.saveFile({ name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) });
    }
    const res = await base44.integrations.Core.UploadPrivateFile({ file });
    return res.file_uri;
  },

  // Turns a stored file reference into a short-lived URL the browser can play / open.
  async resolveFileUrl(fileRef, expiresIn = 3600) {
    if (window.littlemissDesktop) {
      const stored = await window.littlemissDesktop.readFile(fileRef);
      return URL.createObjectURL(new Blob([stored.bytes], { type: stored.type }));
    }
    const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileRef, expires_in: expiresIn });
    return res.signed_url;
  },

  async resolveFileAsset(fileRef, expiresIn = 3600) {
    if (window.littlemissDesktop) {
      let stored;
      if (String(fileRef).startsWith('local-file:')) {
        stored = await window.littlemissDesktop.readFile(fileRef);
      } else {
        const path = localFilePath(fileRef);
        if (path) stored = await window.littlemissDesktop.readFilePath(path);
      }
      if (stored) {
        return {
          url: URL.createObjectURL(new Blob([stored.bytes], { type: stored.type })),
          type: stored.type,
        };
      }
      if (!/^https?:\/\//i.test(String(fileRef))) throw new Error('Unsupported file reference');
      return { url: String(fileRef), type: fileTypeFromReference(fileRef) };
    }
    if (/^https?:\/\//i.test(String(fileRef))) {
      return { url: String(fileRef), type: fileTypeFromReference(fileRef) };
    }
    const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileRef, expires_in: expiresIn });
    return { url: res.signed_url, type: fileTypeFromReference(fileRef) };
  },

  async exportBackup() {
    const [tables, settings] = await Promise.all([this.loadAll(), this.loadSettings()]);
    const files = [];
    const fileRefs = new Set([
      ...settings.map((setting) => setting.value),
      ...(tables.products || []).map((product) => product.file_link),
      ...(tables.expenses || []).map((expense) => expense.receipt_file),
    ].filter((value) => String(value || '').startsWith('local-file:')));
    for (const fileRef of fileRefs) {
      let blob;
      let name = String(fileRef).split(':').pop();
      if (window.littlemissDesktop) {
        const stored = await window.littlemissDesktop.readFile(fileRef);
        blob = new Blob([stored.bytes], { type: stored.type });
        name = stored.name || name;
      } else {
        const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileRef, expires_in: 3600 });
        const response = await fetch(signed.signed_url);
        if (!response.ok) throw new Error(`Could not download ${fileRef} for backup`);
        blob = await response.blob();
        name = String(fileRef).split('/').pop() || name;
      }
      files.push({ ref: fileRef, name, type: blob.type, data: await toBase64(blob) });
    }
    return { version: 1, exportedAt: new Date().toISOString(), ...tables, settings, files };
  },

  importBackup(backup) {
    if (!window.littlemissDesktop) throw new Error('Backups can only be imported into the desktop app');
    return window.littlemissDesktop.importBackup(backup);
  },
};

function localFilePath(fileRef) {
  const value = String(fileRef || '');
  if (/^[a-z]:[\\/]/i.test(value) || /^\\\\/.test(value)) return value;
  if (!/^file:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    const pathname = decodeURIComponent(url.pathname);
    if (url.hostname) return `\\\\${url.hostname}${pathname.replace(/\//g, '\\')}`;
    return pathname.replace(/^\/([a-z]:)/i, '$1').replace(/\//g, '\\');
  } catch {
    return null;
  }
}

function fileTypeFromReference(fileRef) {
  const path = String(fileRef || '').split(/[?#]/, 1)[0].toLowerCase();
  if (/\.pdf$/.test(path)) return 'application/pdf';
  const imageTypes = {
    '.avif': 'image/avif',
    '.bmp': 'image/bmp',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };
  return imageTypes[Object.keys(imageTypes).find((extension) => path.endsWith(extension))] || '';
}