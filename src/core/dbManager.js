const fs = require('fs');
const path = require('path');
const dbDebug = require('debug')('coinman:persist');
const dbError = require('debug')('coinman:persist:error');

const { gracefulExit } = require('../utils/gracefulExit');

const writting = { count: 0 };

function onExit() {
  return new Promise((function rerun(wrt, resolve) {
    if (!wrt.count) resolve();
    dbDebug(`Waiting all writes to finish. Count: ${wrt.count}`);
    setTimeout(rerun.bind(this, wrt, resolve), 100);
  }).bind(this, writting));
}
gracefulExit(onExit);

const ordersDBPath = path.resolve(process.cwd(), 'src/db/orders.json');
const assetsDBPath = path.resolve(process.cwd(), 'src/db/assets.json');

if (!fs.existsSync(ordersDBPath)) fs.writeFileSync(ordersDBPath, '{}');
if (!fs.existsSync(assetsDBPath)) fs.writeFileSync(assetsDBPath, '{}');

const ordersDB = require(ordersDBPath); // eslint-disable-line
const assetsDB = require(assetsDBPath); // eslint-disable-line

const updatesStack = {
  [ordersDBPath]: [],
  [assetsDBPath]: [],
};

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

function updateDB(dbPath, data) {
  // secure file backup, if write interrupted, file is lost
  const that = this;
  this.retries = 0;
  this.writting = writting;

  writting.count++;

  if (updatesStack[dbPath].length > 0) return updatesStack[dbPath].push(data);

  fs.truncate(dbPath, 0, (truncError) => {
    if (truncError) {
      return process.nextTick(updateDB.bind(that, updateDB, dbPath, data));
    }
    fs.writeFile(dbPath, JSON.stringify(data), fileCallback.bind(that, updateDB, dbPath, data));
  });
}

function addOrder({ pair, type, value, amount } = {}) {
  Object.assign(ordersDB, { [pair]: { type, value, amount } });
  updateDB(ordersDBPath, ordersDB);
}

function removeOrder({ pair }) {
  Object.assign(ordersDB, { [pair]: undefined });
  updateDB(ordersDBPath, ordersDB);
}

function updateBuyPrice({ pair, buyPrice, buyTime }) {
  Object.assign(assetsDB[pair], { buyPrice, buyTime });
  updateDB(assetsDBPath, assetsDB);
}

module.exports = {
  ordersDB,
  assetsDB,
  addOrder,
  removeOrder,
  updateBuyPrice,
};
