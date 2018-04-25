class LetterMan {
  constructor({ dataKeeper, writer, skipedSymbol }) {
    this.dataKeeper = dataKeeper;
    this.writer = writer;
    this.skipedSymbol = skipedSymbol;
    process.on('cleanup', LetterMan.cleanupModule.bind(this));
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
    this.dataKeeper.updateMainStrategyValues(data);
  }

  setBuyPrice({ pair, buyPrice, buyTime }) {
    // this.dataKeeper.updateProperty(pair, { buyPrice, buyTime });
    this.writer.updateBuyPrice({ pair, buyPrice, buyTime });
  }

  updateFrameCount({ pair, increment }) {
    const frameCount = increment ? (this.dataKeeper[pair].frameCount || 0) + increment : 0;
    this.dataKeeper.updateProperty(pair, { frameCount });
  }
}

module.exports = LetterMan;
