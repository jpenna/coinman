const fs = require('fs');
const path = require('path');
const error = require('debug')('coinman:persist:error');

const ordersDBPath = path.resolve(process.cwd(), 'src/db/orders.json');
const assetsDBPath = path.resolve(process.cwd(), 'src/db/assets.json');

if (!fs.existsSync(ordersDBPath)) fs.writeFileSync(ordersDBPath, '{}');
if (!fs.existsSync(assetsDBPath)) fs.writeFileSync(assetsDBPath, '{}');

const ordersDB = require(ordersDBPath); // eslint-disable-line
const assetsDB = require(assetsDBPath); // eslint-disable-line

function updateDB(dbPath, data) {
  try {
    // secure file backup, if write interrupted, file is lost
    fs.writeFile(dbPath, JSON.stringify(data), (err) => { if (err) throw err; });
  } catch (err) {
    error(`Error saving DB ${dbPath}`, err);
  }
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
