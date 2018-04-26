/* eslint-disable camelcase */

const utils = require('../tools/utils');
const debug = require('debug')('coinman:strategyMain');

const log = require('simple-node-logger').createSimpleLogger('logs/orders.log');

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
📌 ${pair}
*Buy Price: ${buyPrice.toFixed(8)}*
Lower Band: ${lowerBand} (${prettySatoshiPercent(lowerBand, buyPrice)}%)
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

  sell({ asset, price, withThreshold_4, takeProfit, takeProfitLevel, bestSell, buyPrice, bestBuy, time, buyTime, bestSellTime, bestBuyTime, candleAvg, wma8, wma4 }) {
    const text1 = `(S) ${asset}: ${price.toFixed(8)} BTC
Profit: ${(((price - buyPrice) / buyPrice) - this.fee).toFixed(3)}%${withThreshold_4 ? ' (using threshold 4)' : ''}`;
    const takeProfitText = takeProfit ? `Take Profit (${takeProfitLevel}%)` : '';
    const bestSellPercent = utils.prettySatoshiPercent(bestSell, buyPrice);
    const bestBuyPercent = utils.prettySatoshiPercent(bestBuy, buyPrice);
    const elapsed = ((time - buyTime) / 60000).toFixed(1);

    this.sendMessage(`📉 *${(new Date()).toLocaleString()}*
${text1}
💰 ${takeProfitText}
Best Sell: ${bestSell} (${bestSellPercent}%)
Best Buy: ${bestBuy} (${bestBuyPercent}%)
Time elapsed after buy: ${elapsed} minutes`);

    debug(`${text1}
${takeProfitText}
Best Sell: ${bestSell} (${bestSellPercent}%)
Best Buy: ${bestBuy} (${bestBuyPercent}%)
Time elapsed after buy: ${elapsed} minutes`);

    log.debug(`${text1}
${takeProfitText}
Best Sell: ${bestSell} - ${bestSellTime} - (${bestSellPercent}%)
Best Buy: ${bestBuy} - ${bestBuyTime} - (${bestBuyPercent}%)
Time elapsed after buy: ${elapsed} minutes
candleAvg: ${candleAvg}, wma8: ${wma8}, wma4: ${wma4}`);
  }

}

module.exports = MainLogger;
