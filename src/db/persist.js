const JsonDB = require('node-json-db');

const db = new JsonDB('db', true, false);

const fromDB = db.getData('/');

function addOrder({ coin, type, value, amount } = {}) {
  db.push(coin, { type, value, amount }, true);
}

function removeOrder({ coin }) {
  db.delete(coin);
}

module.exports = {
  fromDB,
  addOrder,
  removeOrder,
};
