const debugLog = require('debug')('coinman:LetterMan');

class LetterMan {
  constructor({ dataKeeper, dbManager, skipedSymbol }) {
    this.dataKeeper = dataKeeper;
    this.dbManager = dbManager;
    this.skipedSymbol = skipedSymbol;
    this.startTime = Date.now();
    this.runningSet = new Set();
    process.on('cleanup', LetterMan.cleanupModule.bind(this));

    setTimeout(this.resetRunningSet.bind(this), 180000);
  }

  resetRunningSet() {
    const runningFor = `(${((Date.now() - this.startTime) / 60000).toFixed(0)} minutes)`;
    const pairs = Object.keys(this.dataKeeper);
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

  setBuyPrice({ pair, buyPrice, buyTime, lowerBand }) {
    this.dataKeeper.updateProperty(pair, { buyPrice, buyTime, lowerBand });
    this.dbManager.updateAssetsProperty(pair, { buyPrice, buyTime, lowerBand });
  }

  setLowerBand({ pair, lowerBand }) {
    this.dataKeeper.updateProperty(pair, { lowerBand });
    this.dbManager.updateAssetsProperty(pair, { lowerBand });
  }

  updateFrameCount({ pair, increment }) {
    const frameCount = increment ? (this.dataKeeper[pair].frameCount || 0) + increment : 0;
    this.dataKeeper.updateProperty(pair, { frameCount });
  }

  setWithTimeAssets({ pair, name, value, time }) {
    const now = time || Date.now();
    this.dataKeeper.updateProperty(pair, { [name]: value, [`${name}Time`]: now });
    this.dbManager.updateAssetsProperty(pair, { [name]: value, [`${name}Time`]: now });
  }
}

module.exports = LetterMan;
