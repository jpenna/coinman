/* eslint-disable camelcase */

const utils = require('../tools/utils');
const debug = require('debug')('coinman:strategyMain');

const log = require('simple-node-logger').createSimpleFileLogger('logs/orders.log');

log.setLevel('all');

class MainLogger {
  constructor({ sendMessage }) {
    this.sendMessage = sendMessage;
  }

  botStarting({ interval }) {
    debug(`Initializing Main Strategy. Running every ${interval}ms`);
    this.sendMessage(`*✅ Starting bot* - ${(new Date()).toLocaleString()}`);
  }

  telegramTick({ pair, open, high, low, close, volume, buyPrice, lowerBand }) {
    const { prettySatoshiPercent } = utils;

    this.sendMessage(`
📌 ${(new Date()).toLocaleString()}
${pair}
*Buy Price: ${buyPrice.toFixed(8)}*
Lower Band: ${lowerBand.toFixed(8)} (${prettySatoshiPercent(lowerBand, buyPrice)}%)
Open: ${open} (${prettySatoshiPercent(open, buyPrice)}%)
High: ${high} (${prettySatoshiPercent(high, buyPrice)}%)
Low: ${low} (${prettySatoshiPercent(low, buyPrice)}%)
Close: ${close} (${prettySatoshiPercent(close, buyPrice)}%)
Volume: ${(volume * 1000).toFixed(0)} k
    `);
  }

  buy({ asset, price, candleAvg, wma8, wma4, threshold_8 }) {
    this.sendMessage(`📈 *${(new Date()).toLocaleString()}*\n(B) ${asset} ${price.toFixed(8)} BTC`);

    log.info(`(B) ${asset} ${price.toFixed(8)} BTC
candleAvg: ${candleAvg}, wma8: ${wma8}, wma4: ${wma4}
Threshold (${threshold_8}) | 0.5% = ${wma8 * 0.005} | diff = ${Math.abs(wma8 - candleAvg)}`);

    debug(`(B) ${asset} ${price.toFixed(8)} BTC`);
  }

  sell({ asset, price, withThreshold_4, takeProfit, lowerBand, bestSell, buyPrice, bestBuy, time, buyTime, bestSellTime, bestBuyTime, candleAvg, wma8, wma4, fee }) {
    const text1 = `(S) ${asset}: ${price.toFixed(8)} BTC
Profit: ${(((price - buyPrice) / buyPrice) - fee).toFixed(3)}%${withThreshold_4 ? ' (using threshold 4)' : ''}
BuyPrice: ${buyPrice.toFixed(8)}`;
    const takeProfitText = takeProfit ? `Take Profit (LoBand: ${lowerBand}%)` : '';
    const bestSellPercent = utils.prettySatoshiPercent(bestSell, buyPrice);
    const bestBuyPercent = utils.prettySatoshiPercent(bestBuy, buyPrice);
    const elapsed = ((time - buyTime) / 60000).toFixed(1);
    const text2 = `Best Sell: ${bestSell.toFixed(8)} (${bestSellPercent}%)
Best Buy: ${bestBuy.toFixed(8)} (${bestBuyPercent}%)
Time elapsed after buy: ${elapsed} minutes`;

    this.sendMessage(`📉 *${(new Date()).toLocaleString()}*
${text1}
💰 ${takeProfitText}
${text2}`);

    debug(`${text1}
${takeProfitText}
${text2}`);

    log.debug(`${text1}
${takeProfitText}
Best Sell: ${bestSell.toFixed(8)} - ${bestSellTime} - (${bestSellPercent}%)
Best Buy: ${bestBuy.toFixed(8)} - ${bestBuyTime} - (${bestBuyPercent}%)
Time elapsed after buy: ${elapsed} minutes
candleAvg: ${candleAvg.toFixed(8)}, wma8: ${wma8}, wma4: ${wma4}`);
  }
}

module.exports = MainLogger;
