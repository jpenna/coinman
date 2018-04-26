/* eslint-disable camelcase */

const wma = require('../indicators/wma');
const debugError = require('debug')('coinman:strategyMain:error');
const MainLogger = require('./Main_logger');

class MainStrategy {
  constructor({ dataKeeper, dispatcher, letterMan, sendMessage }) {
    this.dataKeeper = dataKeeper;
    this.dispatcher = dispatcher;
    this.letterMan = letterMan;
    this.schedule = {};
    this.sendMessage = sendMessage;
    this.mainLogger = new MainLogger({ sendMessage });

    this.triggerLoBand = 0.015;
    this.interval = 5000;
    this.fee = 0.0005;
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

    Object.keys(this.dataKeeper).forEach((pair) => {
      const { buyTime, candles } = this.dataKeeper[pair];
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
    if (quotient >= 1) this.letterMan.updateFrameCount({ pair, increment: quotient });

    const rest = diffCloseCandle % 1800000;
    const timeout = rest > 0 ? rest : 0;

    const bindedUpdateFrame = (function updateFrame() {
      const { candles, buyPrice, lowerBand } = this.dataKeeper[pair];
      const [, open, high, low, close, volume] = candles[candles.length - 1];
      this.mainLogger.telegramTick({ pair, open, high, low, close, volume, buyPrice, lowerBand });
      this.letterMan.updateFrameCount({ pair, increment: 1 });
    }).bind(this);

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

    this.letterMan.updateFrameCount({ pair, increment: 0 });
  }

  includeBests({ pair, reset }) {
    const { candles, bestSell, bestBuy } = this.dataKeeper[pair];
    const [time, , high, low] = candles[candles.length - 1];
    if (reset) {
      this.letterMan.setWithTimeAssets({ pair, name: 'bestBuy', value: +low, time });
      this.letterMan.setWithTimeAssets({ pair, name: 'bestSell', value: +high, time });
      return;
    }
    if (bestSell < high) {
      this.letterMan.setWithTimeAssets({ pair, name: 'bestSell', value: +high, time });
    }
    if (low < bestBuy) {
      this.letterMan.setWithTimeAssets({ pair, name: 'bestBuy', value: +low, time });
    }
  }

  sold(data) {
    const { pair } = data;
    this.letterMan.setBuyPrice({ pair, buyPrice: 0, buyTime: 0, lowerBand: 0 });
    this.unscheduleFrameUpdate(pair);
    this.mainLogger.sell(data);
  }

  run() {
    Object.keys(this.dataKeeper).forEach((pair) => {
      const { asset, buyPrice, buyTime, bestSell, bestSellTime, bestBuy, bestBuyTime, frameCount, wma8, wma4, candleAvg, candles, lowerBand: lastLowerBand = (buyPrice * (1 + this.triggerLoBand)) } = this.dataKeeper[pair];
      const lastCandle = candles[candles.length - 1];

      const threshold_8 = (wma8 * 0.005) <= Math.abs(wma8 - candleAvg);
      const price = +lastCandle[4];
      const time = lastCandle[0];
      const buyCondition = candleAvg > wma8 && candleAvg > wma4 && threshold_8;

      // Buy strategy
      if (!buyPrice && buyCondition) {
        this.mainLogger.buy({ asset, price });
        this.letterMan.setBuyPrice({ pair, buyPrice: price, buyTime: time });
        this.scheduleFrameUpdate({ pair, buyTime, lastCandle });
        this.includeBests({ pair, reset: true });
        return;
      }

      // TODO add sell strategy for profit and leave this one for stop loss
      // Sell strategy
      if (buyPrice) {
        this.includeBests({ pair });

        // Take profit
        // TODO test with lowerBand of 1% and 0.5% (when candles are separated)
        if (!buyCondition) {
          console.log(asset, 'candleAvg', candleAvg);
          console.log(asset, 'buyPrice', buyPrice);
          const profit = candleAvg / buyPrice;
          const lowerBand = price / bestSell;
          console.log(asset, 'lowerBand', lowerBand);
          if (profit > 0.01
            && profit < this.triggerLoBand
            && lowerBand <= bestSell * 0.99 // High (bestSell) cannot be 1% greater than Current
            && (time - bestSellTime) < 120000
          ) {
            this.sold({ pair, asset, price, takeProfit: true, takeProfitLevel: '< 0.02', bestSell, buyPrice, bestBuy, time, buyTime, bestSellTime, bestBuyTime, candleAvg, wma8, wma4 });
          } else if (profit >= this.triggerLoBand) {
            let currentLowerBand = lastLowerBand;
            if (lowerBand > lastLowerBand) {
              this.letterMan.setLowerBand({ pair, lowerBand });
              currentLowerBand = lowerBand;
            }
            if (price <= currentLowerBand) {
              this.sold({ pair, asset, price, takeProfit: true, takeProfitLevel: currentLowerBand.toFixed(2), bestSell, buyPrice, bestBuy, time, buyTime, bestSellTime, bestBuyTime, candleAvg, wma8, wma4 });
            }
          }
          return;
        }

        // Stop Loss
        const withThreshold_4 = candleAvg < wma4 && ((wma4 * 0.005) < Math.abs(wma4 - candleAvg));
        const withThreshold_8 = candleAvg < wma8 && candleAvg < wma4 && threshold_8;
        const sellCondition =
          frameCount && ((price / buyPrice) > (frameCount / 100))
            ? withThreshold_4 : withThreshold_8;
        if (sellCondition) {
          this.sold({ pair, asset, price, withThreshold_4, bestSell, buyPrice, bestBuy, time, buyTime, bestSellTime, bestBuyTime, candleAvg, wma8, wma4 });
        }
      }
    });
    this.runTimeout = setTimeout(this.run.bind(this), this.interval);
  }
}

module.exports = MainStrategy;
