const debugLog = require('debug')('coinman:LetterMan');

class LetterMan {
  constructor({ dataKeeper, dbManager, skipedSymbol }) {
    this.dataKeeper = dataKeeper;
    this.dbManager = dbManager;
    this.skipedSymbol = skipedSymbol;
    this.runningSet = new Set();
    process.on('cleanup', LetterMan.cleanupModule.bind(this));

    setTimeout(this.resetRunningSet.bind(this), 180000);
  }

  resetRunningSet() {
    if (this.runningSet.size !== Object.keys(this.dataKeeper).length) {
      const missing = Object.keys(this.dataKeeper).filter(k => !this.runningSet.has(k));
      debugLog(`Not all assets are running ${missing}`);
    } else {
      debugLog('All assets are running. Next check in 3 minutes.');
    }

    this.runningSet.clear();
    setTimeout(this.resetRunningSet.bind(this), 180000);
  }

  static cleanupModule() {
    process[this.skipedSymbol] = {};
    Object.getOwnPropertyNames(LetterMan.prototype).forEach((key) => {
      if (key !== 'constructor' && typeof LetterMan.prototype[key] === 'function') {
        LetterMan.prototype[key] = () => {
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

  setBuyPrice({ pair, buyPrice, buyTime }) {
    this.dataKeeper.updateProperty(pair, { buyPrice, buyTime });
    this.dbManager.updateBuyPrice({ pair, buyPrice, buyTime });
  }

  updateFrameCount({ pair, increment }) {
    const frameCount = increment ? (this.dataKeeper[pair].frameCount || 0) + increment : 0;
    this.dataKeeper.updateProperty(pair, { frameCount });
  }
}

module.exports = LetterMan;
