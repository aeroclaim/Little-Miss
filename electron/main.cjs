const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const TABLES = ['collections', 'products', 'printOrders', 'stores', 'priceTiers', 'deliveries', 'sales', 'payments', 'returns', 'preorders'];
const EMPTY_DATA = () => Object.fromEntries([...TABLES, 'settings'].map((table) => [table, []]));
const storePath = () => path.join(app.getPath('userData'), 'data.json');
const uploadsPath = () => path.join(app.getPath('userData'), 'uploads');

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
  for (const table of TABLES) {
    if (!Array.isArray(backup[table])) throw new Error('Backup is missing data tables');
  }
  return mutateStore(async (data) => {
    for (const table of TABLES) data[table] = backup[table];
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
    data.settings = data.settings.map((setting) => ({ ...setting, value: fileRefs.get(setting.value) || setting.value }));
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
  return { bytes: await fs.readFile(path.join(uploadsPath(), metadata.filename)), type: metadata.type };
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
  if (process.env.VITE_DEV_SERVER_URL) await window.loadURL(process.env.VITE_DEV_SERVER_URL);
  else await window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !isAllowedLocalUrl(details.url) });
  });
  return createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});