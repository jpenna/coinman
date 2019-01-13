const debug = require('debug')('coinman:fetcher');
const errorsLog = require('simple-node-logger').createSimpleFileLogger('logs/errors.log');

const config = require('../config');

const fs = require('fs');

module.exports = ({ pairs, binanceRest, sendMessage }) => ({
  fetchInitialData() {
    const klines = pairs.map(async (pair) => {
      const res = await binanceRest.klines({
        symbol: pair,
        limit: config.initialFetchKlineLimit,
        interval: `${config.initialFetchKlineInterval}m`,
      });
      // Reorder the way collector collects
      return res.map(([
        openTime,
        open,
        high,
        low,
        close,
        volumeQuote,
        closeTime,
        baseVolume,
        numberOfTrades,
        takerBuyVolumeQuote,
        takerBuyVolumeBase,
      ]) => ([
        openTime,
        closeTime,
        open,
        close,
        high,
        low,
        volumeQuote,
        baseVolume,
        takerBuyVolumeQuote,
        takerBuyVolumeBase,
        numberOfTrades,
      ]));
    });

    const balance = binanceRest.account()
      .then((data) => {
        const { balances, makerCommission, takerCommission, buyerCommission, sellerCommission } = data;

        if (makerCommission !== 10 || takerCommission !== 10 || buyerCommission !== 0 || sellerCommission !== 0) {
          const msg = `COMMISSION IS NOT AS EXPECTED! MakerCommission: ${makerCommission}, TakerCommission: ${takerCommission}, BuyerCommission: ${buyerCommission}, SellerCommission: ${sellerCommission}`;
          debug(msg);
          errorsLog.warn(msg);
          sendMessage(msg);
        }

        const balanceNorm = balances.reduce((acc, b) => {
          acc[b.asset] = {
            asset: b.asset,
            free: +b.free,
            locked: +b.locked,
          };
          return acc;
        }, {});

        // Test
        // fs.writeFileSync('src/db/balance.json', JSON.stringify(balanceNorm, null, 2));

        return balanceNorm;
      });

    return Promise.all([balance, ...klines]);
  },
});
