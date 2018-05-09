const debug = require('debug')('coinman:fetcher');
const errorsLog = require('simple-node-logger').createSimpleFileLogger('logs/errors.log');

const fs = require('fs');

module.exports = ({ binanceRest, pairs, sendMessage }) => ({
  async fetchInitialData() {
    const klines = pairs.map(pair => binanceRest.klines({
      symbol: pair,
      limit: 8,
      interval: '30m',
    }));

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

        fs.writeFileSync('src/balance.json', JSON.stringify(balanceNorm, null, 2));

        return balanceNorm;
      });

    return Promise.all([balance, ...klines]);
  },
});
