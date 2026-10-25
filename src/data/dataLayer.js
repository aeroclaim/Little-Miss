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
  priceTiers: 'PriceTier',
  deliveries: 'Delivery',
  sales: 'StoreSale',
  payments: 'StorePayment',
  returns: 'StoreReturn',
  preorders: 'Preorder',
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

  async exportBackup() {
    const [tables, settings] = await Promise.all([this.loadAll(), this.loadSettings()]);
    const files = [];
    const videoSetting = settings.find((setting) => setting.key === 'welcome_video_ref');
    if (videoSetting?.value) {
      let blob;
      let name = 'welcome-video';
      if (window.littlemissDesktop) {
        const stored = await window.littlemissDesktop.readFile(videoSetting.value);
        blob = new Blob([stored.bytes], { type: stored.type });
      } else {
        const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: videoSetting.value, expires_in: 3600 });
        const response = await fetch(signed.signed_url);
        if (!response.ok) throw new Error('Could not download the welcome video for backup');
        blob = await response.blob();
        name = videoSetting.value.split('/').pop() || name;
      }
      files.push({ ref: videoSetting.value, name, type: blob.type, data: await toBase64(blob) });
    }
    return { version: 1, exportedAt: new Date().toISOString(), ...tables, settings, files };
  },

  importBackup(backup) {
    if (!window.littlemissDesktop) throw new Error('Backups can only be imported into the desktop app');
    return window.littlemissDesktop.importBackup(backup);
  },
};