/* eslint-disable camelcase */

const { CronJob } = require('cron');

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

    this.interval = 5000;
    this.fee = 0.0005;
  }

  static processCandles(data) {
    const averages = data.map(d => (+d[1] + +d[2] + +d[3] + +d[4]) / 4);
    const wma8 = wma(averages, 8);
    const wma4 = wma(averages, 4);
    const current = averages[averages.length - 1];
    return { wma8, wma4, current, candles: data };
  }

  init() {
    clearTimeout(this.runTimeout);

    Object.keys(this.dataKeeper).forEach((pair) => {
      const { buyTime, candles } = this.dataKeeper[pair];
      if (!buyTime) return;
      const lastCandle = candles[candles.length - 1];
      this.scheduleFrameUpdate({ pair, buyTime, lastCandle });
    });

    this.mainLogger.botStarting();
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


    this.schedule[pair] = setTimeout(() => {
      this.schedule[pair] = new CronJob({
        cronTime: '0 */5 * * * *',
        onTick() {
          const { candles, buyPrice } = this.dataKeeper[pair];
          const [, open, high, low, close, volume] = candles[candles.length - 1];
          this.mainLogger.telegramTick({ pair, open, high, low, close, volume, buyPrice });
          this.letterMan.updateFrameCount({ pair, increment: 1 });
        },
        start: true,
        context: this,
        runOnInit: true,
      });
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

  run() {
    Object.keys(this.dataKeeper).forEach((pair) => {
      const { asset, buyPrice, buyTime, bestSell, bestSellTime, bestBuy, bestBuyTime, frameCount, wma8, wma4, current, candles } = this.dataKeeper[pair];
      const lastCandle = candles[candles.length - 1];

      const threshold_8 = (wma8 * 0.005) <= Math.abs(wma8 - current);
      const price = +lastCandle[4];
      const time = lastCandle[0];
      const buyCondition = current > wma8 && current > wma4 && threshold_8;

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

        // if (buyCondition) {
        //   const profit = current / buyPrice;
        //   if (profit > 0.01
        //     && profit < 0.02
        //     && current / bestSell <= 0.99 // High can't be 1% greater than Current
        //     && (time - bestSellTime) < 120000
        //   ) {

        //   }
        // }

        // Stop Loss
        const withThreshold_4 = current < wma4 && ((wma4 * 0.005) < Math.abs(wma4 - current));
        const withThreshold_8 = current < wma8 && current < wma4 && threshold_8;
        const sellCondition =
          frameCount && ((price / buyPrice) > (frameCount / 100))
            ? withThreshold_4 : withThreshold_8;
        if (sellCondition) {
          this.mainLogger.sell({ asset, price, withThreshold_4, bestSell, buyPrice, bestBuy, time, buyTime, bestSellTime, bestBuyTime, current, wma8, wma4 });
          this.letterMan.setBuyPrice({ pair, buyPrice: 0, buyTime: 0 });
          this.unscheduleFrameUpdate(pair);
        }
      }
    });
    this.runTimeout = setTimeout(this.run.bind(this), this.interval);
  }
}

module.exports = MainStrategy;
