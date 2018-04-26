const MainStrategy = require('../strategies/Main');

class DataKeeper {
  setupProperty({ pair, data }) {
    this[pair] = data;
  }

  updateMainStrategyValues({ time, pair, o, c, h, l, quoteVolume, isOver, closeTime }) {
    const { candles } = this[pair];
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

    // TODO improve this calculatation to use the updated values only, not redo everything
    const update = MainStrategy.processCandles(newCandles || candles);

    this.updateProperty(pair, update);
  }

  updateProperty(property, data) {
    Object.assign(this[property], data);
  }
}

module.exports = DataKeeper;
