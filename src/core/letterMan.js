module.exports = ({ dataKeeper, writer }) => ({
  receivedBinanceCandle(data) {
    dataKeeper.updateMainStrategyValues(data);
  },
  setBuyPrice(pair, buyPrice, buyTime) {
    dataKeeper.updateProperty(pair, { buyPrice, buyTime });
    writer.updateBuyPrice({ pair, buyPrice, buyTime });
  },
  updateFrameCount(pair, increment) {
    const frameCount = increment ? (dataKeeper[pair].frameCount || 0) + increment : 0;
    dataKeeper.updateProperty(pair, { frameCount });
  },
});
