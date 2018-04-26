const fs = require('fs');
const path = require('path');
const dbDebug = require('debug')('coinman:persist');
const dbError = require('debug')('coinman:persist:error');

const { gracefulExit } = require('../tools/gracefulExit');

const writting = { count: 0 };

const backupsPath = path.resolve(process.cwd(), 'src/db/backups');
const ordersDBPath = path.resolve(process.cwd(), 'src/db/orders.json');
const assetsDBPath = path.resolve(process.cwd(), 'src/db/assets.json');

// TODO fallback to bkp, then delete the old backup if the latest works
if (!fs.existsSync(ordersDBPath)) fs.writeFileSync(ordersDBPath, '{}');
if (!fs.existsSync(assetsDBPath)) fs.writeFileSync(assetsDBPath, '{}');

const ordersDB = require(ordersDBPath); // eslint-disable-line
const assetsDB = require(assetsDBPath); // eslint-disable-line

const dbMap = new Map([[ordersDBPath, ordersDB], [assetsDBPath, assetsDB]]);

const updatesStack = {
  [ordersDBPath]: [],
  [assetsDBPath]: [],
};

function createBackup() {
  const promises = [];
  const date = (new Date()).toISOString();
  return new Promise((resolve) => {
    try {
      fs.mkdirSync(backupsPath);
    } catch (e) {
      if (e.code !== 'EEXIST') return dbDebug('Error creating backup folder', e);
    }
    dbMap.forEach((db, dbPath) => {
      const bkpPath = dbPath.replace(/([^/]+)\.json$/, (m, g1) => `backups/${g1}_${date}.json`);
      const saving = new Promise((res) => {
        fs.writeFile(bkpPath, JSON.stringify(db, null, 2), (e) => {
          if (e) return dbDebug(`Error creating backup ${bkpPath}`, e);
          res();
        });
      });
      promises.push(saving);
    });
    resolve(Promise.all(promises));
  });
}

function onExit() {
  return new Promise((function rerun(wrt, resolve) {
    if (!wrt.count) return createBackup().then(resolve);
    dbDebug(`Waiting all writes to finish. Count: ${wrt.count}`);
    setTimeout(rerun.bind(this, wrt, resolve), 100);
  }).bind(this, writting));
}
gracefulExit(onExit);

function fileCallback(rerun, dbPath, data, err) {
  if (err) {
    dbError(`Error saving DB ${dbPath}`, err);
    this.retries++;
    if (this.retries < 3) {
      return process.nextTick(rerun.bind(this, dbPath, data));
    }
  }

  this.writting.count--;

  if (updatesStack[dbPath].length > 0) {
    const nextData = updatesStack[dbPath].shift();
    process.nextTick(rerun.bind(this, dbPath, nextData));
  }
}

function updateDB(dbPath) {
  // secure file backup, if write interrupted, file is lost
  const that = this;
  const data = dbMap.get(dbPath);
  this.retries = 0;
  this.writting = writting;

  writting.count++;

  if (updatesStack[dbPath].length > 0) return updatesStack[dbPath].push(data);

  fs.truncate(dbPath, 0, (truncError) => {
    if (truncError) {
      return process.nextTick(updateDB.bind(that, updateDB, dbPath, data));
    }
    fs.writeFile(dbPath, JSON.stringify(data, null, 2), fileCallback.bind(that, updateDB, dbPath, data));
  });
}

function addOrder({ pair, type, value, amount } = {}) {
  Object.assign(ordersDB, { [pair]: { type, value, amount } });
  updateDB(ordersDBPath);
}

function removeOrder({ pair }) {
  Object.assign(ordersDB, { [pair]: undefined });
  updateDB(ordersDBPath);
}

function updateBuyPrice({ pair, buyPrice, buyTime }) {
  Object.assign(assetsDB[pair], { buyPrice, buyTime });
  updateDB(assetsDBPath);
}

function updateAssetsProperty(pair, data) {
  Object.assign(assetsDB[pair], data);
  updateDB(assetsDBPath);
}

function updateOrdersProperty(pair, data) {
  Object.assign(ordersDB[pair], data);
  updateDB(ordersDBPath);
}

module.exports = {
  ordersDB,
  assetsDB,
  addOrder,
  removeOrder,
  updateBuyPrice,
  updateAssetsProperty,
  updateOrdersProperty,
};
