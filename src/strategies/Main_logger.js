/* eslint-disable camelcase */

const utils = require('../tools/utils');
const debug = require('debug')('coinman:strategyMain');

const log = require('simple-node-logger').createSimpleLogger('logs/orders.log');

log.setLevel('all');

class MainLogger {
  constructor({ sendMessage }) {
    this.sendMessage = sendMessage;
  }

  botStarting() {
    debug(`Initializing Main Strategy. Running every ${this.interval}ms`);
    this.sendMessage(`*✅ Starting bot* - ${(new Date()).toLocaleString()}`);
  }

  telegramTick({ pair, open, high, low, close, volume, buyPrice }) {
    const { prettySatoshiPercent } = utils;

    this.sendMessage(`
📌 ${pair}
*Buy Price: ${buyPrice.toFixed(8)}*
Open: ${open} (${prettySatoshiPercent(open, buyPrice)}%)
High: ${high} (${prettySatoshiPercent(high, buyPrice)}%)
Low: ${low} (${prettySatoshiPercent(low, buyPrice)}%)
Close: ${close} (${prettySatoshiPercent(close, buyPrice)}%)
Volume: ${(volume * 1000).toFixed(0)} k
    `);
  }

  buy({ asset, price, current, wma8, wma4, threshold_8 }) {
    this.sendMessage(`📈 *${(new Date()).toLocaleString()}*\n(B) ${asset} ${price.toFixed(8)} BTC`);

    log.info(`(B) ${asset} ${price.toFixed(8)} BTC
current: ${current}, wma8: ${wma8}, wma4: ${wma4}
Threshold (${threshold_8}) | 0.5% = ${wma8 * 0.005} | diff = ${Math.abs(wma8 - current)}`);

    debug(`(B) ${asset} ${price.toFixed(8)} BTC`);
  }

  sell({ asset, price, withThreshold_4, bestSell, buyPrice, bestBuy, time, buyTime, bestSellTime, bestBuyTime, current, wma8, wma4 }) {
    const text1 = `(S) ${asset}: ${price.toFixed(8)} BTC
Profit: ${(((price - buyPrice) / buyPrice) - this.fee).toFixed(3)}%${withThreshold_4 ? ' (using threshold 4)' : ''}`;
    const bestSellPercent = utils.prettySatoshiPercent(bestSell, buyPrice);
    const bestBuyPercent = utils.prettySatoshiPercent(bestBuy, buyPrice);
    const elapsed = ((time - buyTime) / 60000).toFixed(1);

    this.sendMessage(`📉 *${(new Date()).toLocaleString()}*
Best Sell: ${bestSell} (${bestSellPercent}%)
Best Buy: ${bestBuy} (${bestBuyPercent}%)
Time elapsed after buy: ${elapsed} minutes`);

    debug(`${text1}
Best Sell: ${bestSell} (${bestSellPercent}%)
Best Buy: ${bestBuy} (${bestBuyPercent}%)
Time elapsed after buy: ${elapsed} minutes`);

    log.debug(`${text1}
Best Sell: ${bestSell} - ${bestSellTime} - (${bestSellPercent}%)
Best Buy: ${bestBuy} - ${bestBuyTime} - (${bestBuyPercent}%)
Time elapsed after buy: ${elapsed} minutes
Current: ${current}, wma8: ${wma8}, wma4: ${wma4}`);
  }
}

module.exports = MainLogger;
