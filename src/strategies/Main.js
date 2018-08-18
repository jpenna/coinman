/* eslint-disable camelcase */

const wma = require('../indicators/wma');
const debugError = require('debug')('coinman:strategyMain:error');
const MainLogger = require('./Main_logger');

class MainStrategy {
  constructor({ dataKeeper, dispatcher, postman, sendMessage }) {
    this.dispatcher = dispatcher;
    this.postman = postman;
    this.schedule = {};
    this.sendMessage = sendMessage;
    this.mainLogger = new MainLogger({ sendMessage });

    this.tickers = dataKeeper.tickers;

    this.triggerLoBand = 0.015;
    this.interval = 5000;
    this.fee = 0.001; // Buy: 0.05% | Sell: 0.05%
  }

  static processCandles(data) {
    const averages = data.map(d => (+d[1] + +d[2] + +d[3] + +d[4]) / 4);
    const wma8 = wma(averages, 8);
    const wma4 = wma(averages, 4);
    const candleAvg = averages[averages.length - 1];
    return { wma8, wma4, candleAvg, candles: data };
  }

  init() {
    clearTimeout(this.runTimeout);

    Object.keys(this.tickers).forEach((pair) => {
      const { buyTime, candles } = this.tickers[pair];
      if (!buyTime) return;
      const lastCandle = candles[candles.length - 1];
      this.scheduleFrameUpdate({ pair, buyTime, lastCandle });
    });

    this.mainLogger.botStarting({ interval: this.interval });
    this.run();
  }

  // frameCount counts the number of candles after BUY take place,
  // used to leave a position faster if there is a great move of price in a short period
  scheduleFrameUpdate({ pair, buyTime, lastCandle }) {
    if (this.schedule[pair]) return;
    const diffCloseCandle = lastCandle[6] - buyTime;

    const quotient = Math.floor(diffCloseCandle / 1800000); // 30min = 30 * 60 * 1000 = 1,800,000
    if (quotient >= 1) this.postman.updateFrameCount({ pair, increment: quotient });

    const rest = diffCloseCandle % 1800000;
    const timeout = rest > 0 ? rest : 0;

    const bindedUpdateFrame = function updateFrame() {
      const { candles, buyPrice, lowerBand } = this.tickers[pair];
      const [, open, high, low, close, volume] = candles[candles.length - 1];
      this.mainLogger.telegramTick({ pair, open, high, low, close, volume, buyPrice, lowerBand });
      this.postman.updateFrameCount({ pair, increment: 1 });
    }.bind(this);

    this.schedule[pair] = setTimeout(() => {
      bindedUpdateFrame();
      this.schedule[pair] = setTimeout(bindedUpdateFrame, 1800000);
    }, timeout);
  }

  unscheduleFrameUpdate(pair) {
    clearTimeout(this.schedule[pair]);
    if ((this.schedule[pair] || {}).running) this.schedule[pair].stop();

    if (!this.schedule[pair]) {
      debugError(`${pair} was not SCHEDULED. All SELL should have a schedule for frames.`);
    }

    this.postman.updateFrameCount({ pair, increment: 0 });
  }

  includeBests({ pair, reset }) {
    const { candles, bestSell, bestBuy } = this.tickers[pair];
    const [time, , high, low] = candles[candles.length - 1];
    if (reset) {
      this.postman.setWithTimeAssets({ pair, name: 'bestBuy', value: +low, time });
      this.postman.setWithTimeAssets({ pair, name: 'bestSell', value: +high, time });
      return;
    }
    if (bestSell < high) {
      this.postman.setWithTimeAssets({ pair, name: 'bestSell', value: +high, time });
    }
    if (low < bestBuy) {
      this.postman.setWithTimeAssets({ pair, name: 'bestBuy', value: +low, time });
    }
  }

  sell(data) {
    const { pair } = data;
    this.postman.orderSell({ pair });
    this.unscheduleFrameUpdate(pair);
    this.mainLogger.sell(data);
  }

  run() {
    Object.keys(this.tickers).forEach((pair) => {
      const { asset, buyPrice, buyTime, bestSell, bestSellTime, bestBuy, bestBuyTime, frameCount, wma8, wma4, candleAvg, candles, lowerBand } = this.tickers[pair];
      const lastCandle = candles[candles.length - 1];

      const threshold_8 = (wma8 * 0.005) <= Math.abs(wma8 - candleAvg);
      const price = +lastCandle[4];
      const time = lastCandle[0];
      const buyCondition = candleAvg > wma8 && candleAvg > wma4 && threshold_8;
      let thisLowerBand = lowerBand || buyPrice * (1 + this.triggerLoBand);

      // Buy strategy
      if (!buyPrice && buyCondition) {
        const buyLowerBand = price * (1 + this.triggerLoBand);
        this.mainLogger.buy({ asset, price, candleAvg, wma8, wma4, threshold_8 });
        this.postman.orderBuy({ pair, buyPrice: price, buyTime: time, lowerBand: buyLowerBand });

        this.scheduleFrameUpdate({ pair, buyTime, lastCandle });
        this.includeBests({ pair, reset: true });
        return;
      }

      // Sell strategy
      if (buyPrice) {
        this.includeBests({ pair });

        // Take profit
        // TODO 5 test with lowerBand of 1% and 0.5% (when candles are separated)
        if (!buyCondition) {
          // console.log(asset, 'candleAvg', candleAvg);
          // console.log(asset, 'buyPrice', buyPrice);
          const profit = (price - buyPrice) / buyPrice;
          const diffHigh = (price - bestSell) / bestSell;
          // console.log(asset, 'diffHigh', diffHigh);
          // console.log(asset, 'profit', profit);
          if (profit > 0.01
            && profit < this.triggerLoBand
            && diffHigh > 0.01 // High (bestSell) cannot be 1% greater than Current
            && (time - bestSellTime) < 120000
          ) {
            return this.sell({ pair, asset, price, takeProfit: true, lowerBand: '< 0.02', bestSell, buyPrice, bestBuy, time, buyTime, bestSellTime, bestBuyTime, candleAvg, wma8, wma4, fee: this.fee });
          } else if (profit >= this.triggerLoBand) {
            const curentLowerBand = price * 0.99;
            if (curentLowerBand > thisLowerBand) {
              this.postman.setLowerBand({ pair, lowerBand: thisLowerBand });
              thisLowerBand = curentLowerBand;
            }
            if (price <= thisLowerBand) {
              return this.sell({ pair, asset, price, takeProfit: true, lowerBand: thisLowerBand.toFixed(2), bestSell, buyPrice, bestBuy, time, buyTime, bestSellTime, bestBuyTime, candleAvg, wma8, wma4, fee: this.fee });
            }
          }
        }

        // Stop Loss
        const withThreshold_4 = candleAvg < wma4 && ((wma4 * 0.005) < Math.abs(wma4 - candleAvg));
        const withThreshold_8 = candleAvg < wma8 && candleAvg < wma4 && threshold_8;
        const sellCondition =
          frameCount && ((price / buyPrice) > (frameCount / 100))
            ? withThreshold_4 : withThreshold_8;
        if (sellCondition) {
          return this.sell({ pair, asset, price, withThreshold_4, bestSell, lowerBand: thisLowerBand.toFixed(2), buyPrice, bestBuy, time, buyTime, bestSellTime, bestBuyTime, candleAvg, wma8, wma4, fee: this.fee });
        }
      }

      this.postman.noOrder({ pair });
    });
    this.runTimeout = setTimeout(this.run.bind(this), this.interval);
  }
}

module.exports = MainStrategy;
