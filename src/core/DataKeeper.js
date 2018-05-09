const MainStrategy = require('../strategies/Main');

class DataKeeper {
  constructor() {
    this.account = {
      config: {
        minBTC: 0.01,
        maxBTC: 0.1,
      },
      balance: {}, // { BTC: ..., ETH: ... } volume
    };
    this.advices = new Map(); // pair: advice { priority, price }
    this.operations = Object.create(null);
    this.orders = Object.create(null);
    this.tickers = Object.create(null);
  }

  setupPair({ pair, data }) {
    this.tickers[pair] = data;
    this.operations[pair] = {}; // { countLimit, ongoingOrder }
    this.orders[pair] = []; // [{ orderId, volume, price, type }]
  }

  setupBalance(balance) {
    this.account.balance = balance;
  }

  updateMainStrategyValues({ time, pair, o, c, h, l, quoteVolume, isOver, closeTime }) {
    const { candles } = this.tickers[pair];
    const lastCandle = candles[candles.length - 1];

    let newCandles;

    if (isOver) {
      newCandles = [
        ...candles.slice(1, candles.length - 1),
        [time, o, h, l, c, quoteVolume, closeTime],
        [null, null, 0, Infinity, 0, 0, 0],
      ];
    } else {
      if (!lastCandle[1]) {
        lastCandle[1] = o;
        lastCandle[6] = closeTime;
      }
      if (h > lastCandle[2]) lastCandle[2] = h;
      if (l < lastCandle[3]) lastCandle[3] = l;
      lastCandle[0] = time;
      lastCandle[4] = c;
      lastCandle[5] = quoteVolume;
    }

    // TODO 2 improve this calculatation to use the updated values only, not redo everything
    const update = MainStrategy.processCandles(newCandles || candles);

    this.updateTicker(pair, update);
  }

  updateTicker(pair, data) {
    Object.assign(this.tickers[pair], data);
  }

  addNewOrder({ orderId, pair, volume, price, type }) {
    this.orders[pair].push({ orderId, pair, volume, price, type });
  }

  cancelOrder({ orderId, pair }) {
    const index = this.orders[pair].findIndex(v => v.orderId === orderId);
    this.orders.splice(index, 1);
  }
}

module.exports = DataKeeper;
