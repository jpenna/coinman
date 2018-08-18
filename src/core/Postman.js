const debugLog = require('debug')('coinman:Postman');
const { gracefulExit } = require('gracefully-exit');

class Postman {
  constructor({ dataKeeper }) {
    this.dataKeeper = dataKeeper;
    // this.extraInfoSymbol = extraInfoSymbol;

    this.dataKeeperAdvices = this.dataKeeper.advices;

    gracefulExit(Postman._cleanupModule.bind(this));
  }

  // static _cleanupModule() {
  //   process[this.extraInfoSymbol].postman = {};
  //   const extraInfo = process[this.extraInfoSymbol].postman;
  //   Object.getOwnPropertyNames(Postman.prototype).forEach((key) => {
  //     if (key !== 'constructor' && typeof Postman.prototype[key] === 'function') {
  //       Postman.prototype[key] = () => {
  //         // Count missed requests after system is flagged to shut down
  //         process[this.skipedSymbol][key] = (process[this.skipedSymbol].key || 0) + 1;
  //       };
  //     }
  //   });
  // }




  receivedBinanceKline(data) {
    this.dataKeeper.updateMainStrategyValues(data);
  }

  _setBuyPrice({ pair, buyPrice, buyTime, lowerBand }) {
    this.dataKeeper.updateTicker(pair, { buyPrice, buyTime, lowerBand });
  }

  setLowerBand({ pair, lowerBand }) {
    this.dataKeeper.updateTicker(pair, { lowerBand });
  }

  updateFrameCount({ pair, increment }) {
    const frameCount = increment ? (this.dataKeeper.tickers[pair].frameCount || 0) + increment : 0;
    this.dataKeeper.updateTicker(pair, { frameCount });
  }

  // Just add a custom prop with Time
  setWithTimeAssets({ pair, name, value, time }) {
    const now = time || Date.now();
    this.dataKeeper.updateTicker(pair, { [name]: value, [`${name}Time`]: now });
  }

  orderBuy({ pair, buyPrice, buyTime, lowerBand }) {
    this._setBuyPrice({ pair, buyPrice, buyTime, lowerBand });
    this.dataKeeperAdvices.set(pair, { buy: true, price: buyPrice });
  }

  orderSell({ pair }) {
    this._setBuyPrice({ pair, buyPrice: 0, buyTime: 0, lowerBand: 0 });
    this.dataKeeperAdvices.set(pair, { buy: false, price: 0 });
  }

  noOrder({ pair }) {
    this.dataKeeperAdvices.delete(pair);
  }
}

module.exports = Postman;
