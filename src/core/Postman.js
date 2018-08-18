const debugLog = require('debug')('coinman:Postman');

class Postman {
  constructor({ dataKeeper, dbManager, skipedSymbol }) {
    this.dataKeeper = dataKeeper;
    this.dbManager = dbManager;
    this.skipedSymbol = skipedSymbol;
    this.startTime = Date.now();
    this.runningSet = new Set();
    process.on('cleanup', Postman.cleanupModule.bind(this));

    this.advices = this.dataKeeper.advices;

    setTimeout(this.resetRunningSet.bind(this), 180000);
  }

  resetRunningSet() {
    const runningFor = `(${((Date.now() - this.startTime) / 60000).toFixed(0)} minutes)`;
    const pairs = Object.keys(this.dataKeeper.tickers);
    if (this.runningSet.size !== pairs.length) {
      const missing = pairs.filter(k => !this.runningSet.has(k));
      const msg = `Not all assets are running (${missing.length}): ${missing} ${runningFor}`;
      debugLog(msg);
    } else {
      debugLog(`All assets are running ${runningFor}`);
    }

    this.runningSet.clear();
    setTimeout(this.resetRunningSet.bind(this), 180000);
  }

  static cleanupModule() {
    process[this.skipedSymbol] = {};
    Object.getOwnPropertyNames(Postman.prototype).forEach((key) => {
      if (key !== 'constructor' && typeof Postman.prototype[key] === 'function') {
        Postman.prototype[key] = () => {
          // Count missed requests after system is flagged to shut down
          process[this.skipedSymbol][key] = (process[this.skipedSymbol].key || 0) + 1;
        };
      }
    });
  }

  receivedBinanceCandle(data) {
    if (!this.runningSet.has(data.pair)) this.runningSet.add(data.pair);
    this.dataKeeper.updateMainStrategyValues(data);
  }

  setBuyPrice({ pair, buyPrice, buyTime, lowerBand }) {
    console.log('setBuyPrice', pair, lowerBand);
    this.dataKeeper.updateTicker(pair, { buyPrice, buyTime, lowerBand });
    this.dbManager.updateAssetsProperty(pair, { buyPrice, buyTime, lowerBand });
  }

  setLowerBand({ pair, lowerBand }) {
    console.log('setlowerband', pair, lowerBand);
    this.dataKeeper.updateTicker(pair, { lowerBand });
    this.dbManager.updateAssetsProperty(pair, { lowerBand });
  }

  updateFrameCount({ pair, increment }) {
    const frameCount = increment ? (this.dataKeeper.tickers[pair].frameCount || 0) + increment : 0;
    this.dataKeeper.updateTicker(pair, { frameCount });
  }

  setWithTimeAssets({ pair, name, value, time }) {
    const now = time || Date.now();
    this.dataKeeper.updateTicker(pair, { [name]: value, [`${name}Time`]: now });
    this.dbManager.updateAssetsProperty(pair, { [name]: value, [`${name}Time`]: now });
  }

  orderBuy({ pair, buyPrice, buyTime, lowerBand }) {
    this.setBuyPrice({ pair, buyPrice, buyTime, lowerBand });
    this.advices.set(pair, { buy: true, price: buyPrice });
  }

  orderSell({ pair }) {
    this.setBuyPrice({ pair, buyPrice: 0, buyTime: 0, lowerBand: 0 });
    this.advices.set(pair, { buy: false, price: 0 });
  }

  noOrder({ pair }) {
    this.advices.delete(pair);
  }
}

module.exports = Postman;
