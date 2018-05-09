const errorDebug = require('debug')('coinman:broker:error');
const debug = require('debug')('coinman:broker');

class Broker {
  constructor({ binanceRest, sendMessage, dataKeeper }) {
    this.binanceRest = binanceRest;
    this.sendMessage = sendMessage;
    this.dataKeeper = dataKeeper;
    this.balance = dataKeeper.account.balance;
    this.buyPairs = dataKeeper.advices.buyPairs; // Map
    this.sellPairs = dataKeeper.advices.sellPairs; // Map
    this.start();
  }

  start() {
    clearTimeout(this.startTimeout);
    this.startTimeout = setTimeout(this.start, 5000);
    this.run();
  }

  run() {
    if (this.sellPairs.size) this.handleSell();
    if (this.buyPairs.size) this.handleBuys();
  }

  handleSell() {
    this.sellPairs.forEach((advice, pair) => {
      const { [pair]: pairBalance } = this.balance;
      if (!pairBalance) return;

      const { priceAdvice, countLimit } = advice;
      const { [pair]: pairOrder } = this.orders;

      if (pairOrder.type === 'limit' && pairOrder.volume < 0 && countLimit < 3) {
        advice.countLimit++;
      } else {
        this.cancelOrder(pairOrder.orderId);
        this.sendMarket({ pair, volume: pairBalance.volume });
        advice.countLimit = 0;
        return;
      }

      this.sendLimit({ pair, price: priceAdvice, volume: pairBalance.volume, advice });
    });
  }

  handleBuy() {
    const buySet = this.selectBuys();

    buySet.forEach((advice, pair) => {
      const { priceAdvice, countLimit } = advice;
      const { [pair]: pairBalance } = this.balance;
      const { [pair]: pairOrder } = this.orders;

      // TODO check balance and update with possible new volume
      if (pairBalance.volume) return;

      if (pairOrder.type === 'limit' && pairOder.volume > 0 && countLimit < 3) {
        advice.countLimit++;
      } else {
        this.cancelOrder(pairOrder.orderId);
        this.sendMarket({ pair, volume: pairBalance.volume });
        advice.countLimit = 0;
        return;
      }

      this.sendLimit({ pair, price: priceAdvice, volume: pairBalance.volume, advice });
    });
  }

  selectBuys() {
    const buySize = this.buyPairs.size;

    // max/min: BTC value
    // TODO if already ordered, dont do anything (check balance of asset)
    const { min, max, totalAvailable } = this.balance;
    const maxQty = totalAvailable / min;

    const selected = new Map();

    if (maxQty >= buySize) {
      let volume = totalAvailable / buySize;
      if (volume > max) volume = max;
      for (const [k, v] of this.buyPairs) {
        const wv = { ...v, volume };
        selected.set(k, wv);
      }
    } else {
      const array = Array.from(this.buyPairs);
      const prioritySorted = array.sort(([, advice]) => -advice.priority);

      prioritySorted.length = maxQty;

      prioritySorted.forEach(([k, v]) => selected.set(k, { ...v, volume: min }));
    }

    return selected;
  }

  async sendMarket({ pair, volume, advice }) {
    if (advice.ongoingOrder) return;
    advice.ongoingOrder = true;
    try {
      const result = await this.binanceRest.testOrder({
        symbol: `${pair}BTC`,
        type: 'MARKET',
        side: volume < 0 ? 'sell' : 'buy',
        quantity: volume,
      });
      if (result.orderId) {
        advice.ongoingOrder = false;
        this.dataKeeper.addNewOrder({
          orderId: result.orderId,
          pair,
          volume,
          price: result.price,
          type: 'market',
        });
        debug(`Market ${volume < 0 ? 'Sell' : 'Buy'} ${volume} ${pair} at ${result.price} BTC`);
        this.sendMessage(`
          *Market*
          ${volume < 0 ? 'Sell' : 'Buy'} ${volume} ${pair} at ${result.price} BTC
        `);
      }
    } catch (err) {
      errorDebug(err);
    }
  }

  async sendLimit({ pair, volume, price, advice }) {
    if (advice.ongoingOrder) return;
    advice.ongoingOrder = true;
    try {
      const result = await this.binanceRest.testOrder({
        symbol: `${pair}BTC`,
        type: 'LIMIT_MAKER',
        side: volume < 0 ? 'sell' : 'buy',
        quantity: volume,
        newOrderRespType: 'ACK',
        price,
      });
      if (result.orderId) {
        advice.ongoingOrder = false;
        this.dataKeeper.addNewOrder({
          orderId: result.orderId,
          pair,
          volume,
          price,
          type: 'limit',
        });
        debug(`Limit ${volume < 0 ? 'Sell' : 'Buy'} ${volume} ${pair} at ${price} BTC`);
        this.sendMessage(`
          *Limit*
          ${volume < 0 ? 'Sell' : 'Buy'} ${volume} ${pair} at ${price} BTC
        `);
      }
    } catch (err) {
      errorDebug(err);
    }
  }
}

module.exports = Broker;
