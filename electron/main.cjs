const { app, BrowserWindow, dialog, ipcMain, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

app.setName('Little Miss');
app.setPath('userData', path.join(app.getPath('appData'), 'Little Miss'));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-gpu-sandbox');

const TABLES = ['collections', 'products', 'printOrders', 'stores', 'towns', 'priceTiers', 'deliveries', 'sales', 'payments', 'returns', 'preorders', 'packageBatches', 'packages', 'expenses'];
const EMPTY_DATA = () => Object.fromEntries([...TABLES, 'settings'].map((table) => [table, []]));
const storePath = () => path.join(app.getPath('userData'), 'data.json');
const uploadsPath = () => path.join(app.getPath('userData'), 'uploads');

async function migrateLegacyUserData() {
  const currentPath = storePath();
  const current = await readStore();
  const currentCount = TABLES.reduce((sum, table) => sum + current[table].length, 0);
  if (currentCount) return;

  const legacyDir = path.join(app.getPath('appData'), 'littlemiss');
  const legacyPath = path.join(legacyDir, 'data.json');
  if (path.resolve(legacyPath).toLowerCase() === path.resolve(currentPath).toLowerCase()) return;

  let legacy;
  try {
    legacy = JSON.parse(await fs.readFile(legacyPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  const legacyCount = TABLES.reduce((sum, table) => sum + (Array.isArray(legacy[table]) ? legacy[table].length : 0), 0);
  if (!legacyCount) return;

  const fileIdMap = new Map();
  await fs.mkdir(uploadsPath(), { recursive: true });
  for (const [id, metadata] of Object.entries(legacy.files || {})) {
    const newId = current.files?.[id] ? randomUUID() : id;
    const extension = path.extname(metadata.filename || '');
    const filename = `${newId}${extension}`;
    await fs.copyFile(path.join(legacyDir, 'uploads', metadata.filename), path.join(uploadsPath(), filename));
    current.files = { ...current.files, [newId]: { ...metadata, filename } };
    fileIdMap.set(id, newId);
  }

  const rewriteRefs = (value) => {
    if (Array.isArray(value)) return value.map(rewriteRefs);
    if (!value || typeof value !== 'object') {
      if (typeof value !== 'string') return value;
      return value.replace(/local-file:([^/?#]+)/g, (reference, id) => `local-file:${fileIdMap.get(id) || id}`);
    }
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, rewriteRefs(child)]));
  };
  const migrated = rewriteRefs(legacy);
  const existingSettings = new Map((current.settings || []).map((setting) => [setting.key, setting]));
  migrated.settings = [...(migrated.settings || []).filter((setting) => !existingSettings.has(setting.key)), ...existingSettings.values()];
  migrated.files = { ...(migrated.files || {}), ...(current.files || {}) };
  for (const table of TABLES) current[table] = Array.isArray(migrated[table]) ? migrated[table] : [];
  current.settings = migrated.settings;
  current.files = migrated.files;

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const currentExists = await fs.stat(currentPath).then(() => true, (error) => {
    if (error.code === 'ENOENT') return false;
    throw error;
  });
  if (currentExists) await fs.copyFile(currentPath, `${currentPath}.before-legacy-migration-${timestamp}`);
  await writeStore(current);
}

async function readStore() {
  try {
    const stored = JSON.parse(await fs.readFile(storePath(), 'utf8'));
    return { ...EMPTY_DATA(), ...stored };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return EMPTY_DATA();
  }
}

async function writeStore(data) {
  const target = storePath();
  const temporary = `${target}.tmp`;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(temporary, JSON.stringify(data), 'utf8');
  await fs.rename(temporary, target);
}

let storeQueue = Promise.resolve();
function mutateStore(mutator) {
  const operation = storeQueue.then(async () => {
    const data = await readStore();
    const result = await mutator(data);
    await writeStore(data);
    return result;
  });
  storeQueue = operation.catch(() => {});
  return operation;
}

function assertTable(table) {
  if (![...TABLES, 'settings'].includes(table)) throw new Error('Unknown data table');
}

function createRecord(values) {
  return { ...values, id: values.id || randomUUID(), created_date: values.created_date || new Date().toISOString() };
}

ipcMain.handle('data:load-all', async () => {
  const data = await readStore();
  return Object.fromEntries(TABLES.map((table) => [table, data[table]]));
});

ipcMain.handle('data:load-settings', async () => (await readStore()).settings);

ipcMain.handle('data:import', async (_event, backup) => {
  if (backup?.version !== 1 || !Array.isArray(backup.settings)) throw new Error('Unsupported backup file');
  const optionalTables = new Set(['towns', 'packageBatches', 'packages', 'expenses']);
  for (const table of TABLES) {
    if (!Array.isArray(backup[table]) && !optionalTables.has(table)) throw new Error('Backup is missing data tables');
  }
  return mutateStore(async (data) => {
    for (const table of TABLES) data[table] = backup[table] || [];
    data.settings = backup.settings;
    data.files = {};
    const fileRefs = new Map();
    await fs.mkdir(uploadsPath(), { recursive: true });
    for (const file of backup.files || []) {
      const id = randomUUID();
      const extension = path.extname(path.basename(file.name || '')).slice(0, 16);
      const filename = `${id}${extension}`;
      await fs.writeFile(path.join(uploadsPath(), filename), Buffer.from(file.data, 'base64'));
      data.files[id] = { filename, type: file.type || 'application/octet-stream' };
      fileRefs.set(file.ref, `local-file:${id}`);
    }
    const rewriteRefs = (value) => {
      if (Array.isArray(value)) return value.map(rewriteRefs);
      if (!value || typeof value !== 'object') {
        if (typeof value !== 'string') return value;
        return value.replace(/local-file:([^/?#]+)/g, (reference, id) => fileRefs.get(`local-file:${id}`) || reference);
      }
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, rewriteRefs(child)]));
    };
    for (const table of TABLES) data[table] = rewriteRefs(data[table]);
    data.settings = rewriteRefs(data.settings);
    return true;
  });
});

ipcMain.handle('data:create', async (_event, table, values) => {
  assertTable(table);
  return mutateStore((data) => {
    const record = createRecord(values);
    data[table].push(record);
    return record;
  });
});

ipcMain.handle('data:bulk-create', async (_event, table, rows) => {
  assertTable(table);
  return mutateStore((data) => {
    const records = rows.map(createRecord);
    data[table].push(...records);
    return records;
  });
});

ipcMain.handle('data:update', async (_event, table, id, patch) => {
  assertTable(table);
  return mutateStore((data) => {
    const index = data[table].findIndex((record) => record.id === id);
    if (index < 0) throw new Error('Record not found');
    data[table][index] = { ...data[table][index], ...patch, id };
    return data[table][index];
  });
});

ipcMain.handle('data:remove', async (_event, table, id) => {
  assertTable(table);
  return mutateStore((data) => {
    data[table] = data[table].filter((record) => record.id !== id);
  });
});

ipcMain.handle('file:save', async (_event, { name, type, bytes }) => {
  const id = randomUUID();
  const extension = path.extname(path.basename(name || '')).slice(0, 16);
  const filename = `${id}${extension}`;
  await fs.mkdir(uploadsPath(), { recursive: true });
  await fs.writeFile(path.join(uploadsPath(), filename), Buffer.from(bytes));
  await mutateStore((data) => {
    data.files = { ...data.files, [id]: { filename, type: type || 'application/octet-stream' } };
  });
  return `local-file:${id}`;
});

ipcMain.handle('file:read', async (_event, fileRef) => {
  const id = String(fileRef).replace(/^local-file:/, '');
  const metadata = (await readStore()).files?.[id];
  if (!metadata) throw new Error('File not found');
  return { bytes: await fs.readFile(path.join(uploadsPath(), metadata.filename)), type: metadata.type, name: metadata.filename };
});

ipcMain.handle('file:read-path', async (_event, filePath) => {
  const target = String(filePath || '');
  const allowedExtensions = new Set(['.avif', '.bmp', '.gif', '.jpeg', '.jpg', '.pdf', '.png', '.svg', '.webp']);
  if (!path.isAbsolute(target) || !allowedExtensions.has(path.extname(target).toLowerCase())) {
    throw new Error('Only local image and PDF files can be previewed');
  }
  const details = await fs.stat(target);
  if (!details.isFile() || details.size > 50 * 1024 * 1024) throw new Error('The preview file is unavailable or exceeds 50 MB');
  const types = {
    '.avif': 'image/avif',
    '.bmp': 'image/bmp',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };
  return { bytes: await fs.readFile(target), type: types[path.extname(target).toLowerCase()] };
});

function isAllowedLocalUrl(value) {
  try {
    const target = new URL(value);
    if (target.protocol === 'blob:' || target.protocol === 'data:' || target.protocol === 'file:') return true;
    if (!process.env.VITE_DEV_SERVER_URL) return false;
    const devServer = new URL(process.env.VITE_DEV_SERVER_URL);
    return target.hostname === devServer.hostname && target.port === devServer.port;
  } catch {
    return false;
  }
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 650,
    icon: path.join(__dirname, '..', process.env.VITE_DEV_SERVER_URL ? 'public' : 'dist', 'app-icon.ico'),
    backgroundColor: '#f7f4f2',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, target) => {
    if (!isAllowedLocalUrl(target)) event.preventDefault();
  });
  window.webContents.once('did-finish-load', () => {
    window.show();
  });
  window.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (isMainFrame && code !== -3) {
      dialog.showErrorBox('Little Miss could not load', `${description}\n${url}`);
      window.show();
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !isAllowedLocalUrl(details.url) });
  });
  return migrateLegacyUserData().then(createWindow);
}).catch((error) => {
  const details = error?.stack || error?.message || String(error);
  console.error('Little Miss startup failed:', details);
  dialog.showErrorBox('Little Miss could not start', details);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});