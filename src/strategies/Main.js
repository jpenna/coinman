/* eslint-disable camelcase */

const { CronJob } = require('cron');

const wma = require('../indicators/wma');
const debug = require('debug')('coinman:strategyMain');

const log = require('simple-node-logger').createSimpleLogger('logs/orders.log');

class MainStrategy {
  constructor({ dataKeeper, dispatcher, letterMan }) {
    this.dataKeeper = dataKeeper;
    this.dispatcher = dispatcher;
    this.letterMan = letterMan;
    this.schedule = {};
    this.interval = 5000;
  }

  static processCandles(data) {
    const averages = data.map(d => (+d[1] + +d[2] + +d[3] + +d[4]) / 4);
    const wma8 = wma(averages, 8);
    const wma4 = wma(averages, 4);
    const current = averages[averages.length - 1];
    return { wma8, wma4, current, candles: data };
  }

  init() {
    debug(`Initializing Main Strategy. Running every ${this.interval}`);
    clearInterval(this.runInterval);
    this.run();
  }

  // frameCount counts the number of candles after BUY take place,
  // used to leave a position faster if there is a great move of price in a short period
  scheduleFrameUpdate(pair, buyTime, nextClose) {
    const diffCloseCandle = nextClose - buyTime;

    const quotient = Math.floor(diffCloseCandle / 1800000); // 30min = 30 * 60 * 1000 = 1,800,000
    if (quotient >= 1) this.letterMan.updateFrameCount({ pair, increment: quotient });

    const rest = diffCloseCandle % 1800000;
    const timeout = rest > 0 ? rest : 0;

    this.schedule[pair] = setTimeout(() => {
      this.schedule[pair] = new CronJob({
        cronTime: '* */30 * * * *',
        onTick() {
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
    if (this.schedule[pair].running) this.schedule[pair].stop();
    // TODO throw error here to test DB backup
    this.letterMan.updateFrameCount({ pair, increment: 0 });
  }

  run() {
    Object.keys(this.dataKeeper).forEach((pair) => { // eslint-disable-line
      if (!this.dataKeeper[pair].on) return console.log('not on', this.dataKeeper.data[pair]);
      const { asset, buyPrice, buyTime, frameCount, wma8, wma4, current, candles } = this.dataKeeper[pair];
      const lastCandle = candles[candles.length - 1];

      const threshold_8 = (wma8 * 0.005) < Math.abs(wma8 - current);
      const price = +lastCandle[4];
      const time = lastCandle[0];

      if (!buyPrice && current > wma8 && current > wma4 && threshold_8) {
        log.info(`(B) ${asset} -- ${price}\ncurrent: ${current}, wma8: ${wma8}, wma4: ${wma4}`);
        this.letterMan.setBuyPrice({ pair, buyPrice: price, buyTime: time });
        this.scheduleFrameUpdate(pair, buyTime, lastCandle[6]);
        return;
      }

      if (buyPrice) {
        const sellCondition =
          frameCount && ((price / buyPrice) > (frameCount / 100))
            ? current < wma4 && ((wma4 * 0.005) < Math.abs(wma4 - current)) // threshold_4
            : current < wma8 && current < wma4 && threshold_8;
        if (sellCondition) {
          log.debug(`(S) ${asset} -- ${price}\nProfit: ${price - buyPrice} (${(price - buyPrice) / buyPrice})\nTime elapsed after buy: ${((time - buyTime) / 60000).toFixed(1)} minutes\nCurrent: ${current}, wma8: ${wma8}, wma4: ${wma4}`);
          this.letterMan.setBuyPrice({ pair, buyPrice: 0, buyTime: 0 });
          this.unscheduleFrameUpdate(pair);
        }
      }
    });
    this.runTimeout = setTimeout(this.run.bind(this), this.interval);
  }
}

module.exports = MainStrategy;
