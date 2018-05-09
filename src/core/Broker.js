const errorDebug = require('debug')('coinman:broker:error');
const debug = require('debug')('coinman:broker');
const fileLog = require('simple-node-logger').createSimpleFileLogger('logs/broker.log');

class Broker {
  constructor({ binanceRest, sendMessage, dataKeeper }) {
    this.binanceRest = binanceRest;
    this.sendMessage = sendMessage;
    this.dataKeeper = dataKeeper;
    this.orders = dataKeeper.orders; // {}
    this.operations = dataKeeper.operations; // {}
    this.balance = dataKeeper.account.balance; // {}
    this.config = dataKeeper.account.config; // {}
    this.buyPairs = dataKeeper.advices.buyPairs; // Map
    this.sellPairs = dataKeeper.advices.sellPairs; // Map
    this.start();
  }

  start() {
    clearTimeout(this.startTimeout);
    this.startTimeout = setTimeout(this.start.bind(this), 5000);
    this.run();
  }

  run() {
    if (this.sellPairs.size) this.handleSell();
    if (this.buyPairs.size) this.handleBuys();
  }

  handleSell() {
    this.sellPairs.forEach(async (advice, pair) => {
      const { [pair.slice(0, 3)]: pairBalance } = this.balance;
      if (!pairBalance || !pairBalance.free) {
        return fileLog(`SELL No pair balance or free ${pair.slice(0, 3)}`);
      }

      const { price: priceAdvice } = advice;
      const { countLimit } = this.operations[pair];
      const { [pair]: [pairOrder] } = this.orders;

      if (pairOrder.type === 'limit' && pairOrder.volume < 0 && countLimit < 3) {
        this.operations[pair].countLimit++;
      } else {
        const cancelSuccess = await this.cancelOrder(pairOrder.orderId);
        // TODO what if cancel ID dont exist?
        if (!cancelSuccess) return;
        this.sendMarket({ pair, volume: pairBalance.free });
        this.operations[pair].countLimit = 0;
        return;
      }

      this.sendLimit({ pair, price: priceAdvice, volume: pairBalance.free });
    });
  }

  handleBuy() {
    const buySet = this.selectBuys();

    buySet.forEach(async (advice, pair) => {
      const { price: priceAdvice } = advice;
      const { countLimit } = this.operations[pair];
      const { [pair.slice(0, 3)]: pairBalance } = this.balance;
      const { [pair]: [pairOrder] } = this.orders;

      // TODO check balance and update with possible new volume
      if (pairBalance.free || pairBalance.locked) {
        return fileLog(`BUY Has balance free or lock ${pair.slice(0, 3)}`);
      }

      if (pairOrder.type === 'limit' && pairOrder.volume > 0 && countLimit < 3) {
        this.operations[pair].countLimit++;
      } else {
        const cancelSuccess = await this.cancelOrder(pairOrder.orderId);
        // TODO what if cancel ID dont exist?
        if (!cancelSuccess) return;
        this.sendMarket({ pair, volume: buySet.volume });
        this.operations[pair].countLimit = 0;
        return;
      }

      this.sendLimit({ pair, price: priceAdvice, volume: buySet.volume });
    });
  }

  selectBuys() {
    const buySize = this.buyPairs.size;

    // TODO if already ordered, dont do anything (check balance of asset)
    const { minBTC, maxBTC } = this.config;
    const totalAvailable = this.balance.BTC.free;
    const maxQty = totalAvailable / minBTC;

    const selected = new Map();

    if (maxQty >= buySize) {
      let volume = totalAvailable / buySize;
      if (volume > maxBTC) volume = maxBTC;
      for (const [k, v] of this.buyPairs) {
        const wv = { ...v, volume };
        selected.set(k, wv);
      }
    } else {
      const array = Array.from(this.buyPairs);
      const prioritySorted = array.sort(([, advice]) => -advice.priority);

      prioritySorted.length = maxQty;

      prioritySorted.forEach(([k, v]) => selected.set(k, { ...v, volume: minBTC }));
    }

    return selected;
  }

  async sendMarket({ pair, volume }) {
    if (this.initOngoinOrder(pair)) return;

    try {
      const result = await this.binanceRest.testOrder({
        symbol: pair,
        type: 'MARKET',
        side: volume < 0 ? 'sell' : 'buy',
        quantity: volume,
      });
      if (result.orderId) {
        this.operations[pair].ongoingOrder = false;
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

  async sendLimit({ pair, volume, price }) {
    if (this.initOngoinOrder(pair)) return;

    try {
      const result = await this.binanceRest.testOrder({
        symbol: pair,
        type: 'LIMIT_MAKER',
        side: volume < 0 ? 'sell' : 'buy',
        quantity: volume,
        newOrderRespType: 'ACK',
        price,
      });
      if (result.orderId) {
        this.operations[pair].ongoingOrder = false;
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

  async cancelOrder({ pair, orderId }) {
    if (this.initOngoinOrder(pair)) return;

    try {
      const result = await this.binanceRest.testOrder({
        symbol: pair,
        orderId,
      });
      if (result.orderId) {
        this.operations[pair].ongoingOrder = false;
        this.dataKeeper.cancelOrder({
          orderId: result.orderId,
          pair,
        });
        debug(`Canceled ${pair}`);
        this.sendMessage(`Canceled ${pair}`);
        return true;
      }
    } catch (err) {
      errorDebug(err);
    }
  }

  initOngoinOrder(pair) {
    if (this.operations[pair].ongoingOrder) return true;
    const operations = this.operations[pair];
    operations.ongoingOrder = true;
  }
}

module.exports = Broker;
