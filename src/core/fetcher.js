const debug = require('debug')('coinman:fetcher');
const errorsLog = require('simple-node-logger').createSimpleLogger('logs/errors.log');

const fs = require('fs');

module.exports = ({ binanceRest, pairs, sendMessage }) => ({
  async fetchInitialData() {
    // Oldest first, newest last
    // [
    //   [
    //     1499040000000,      // Open time
    //     "0.01634790",       // Open
    //     "0.80000000",       // High
    //     "0.01575800",       // Low
    //     "0.01577100",       // Close
    //     "148976.11427815",  // Volume
    //     1499644799999,      // Close time
    //     "2434.19055334",    // Quote asset volume
    //     308,                // Number of trades
    //     "1756.87402397",    // Taker buy base asset volume
    //     "28.46694368",      // Taker buy quote asset volume
    //     "17928899.62484339" // Ignore
    //   ]
    // ]

    const klines = pairs.map(pair => binanceRest.klines({
      symbol: pair,
      limit: 8,
      interval: '30m',
    }));

    // let account = fs.readFileSync('balance');

    // if (!account) {
    //   account = binanceRest.account()
    //     .then((data) => {
    //       const { balance, makerCommission, takerCommission, buyerCommission, sellerCommission } = data;

    //       if (makerCommission !== 15 || takerCommission !== 15 || buyerCommission !== 0 || sellerCommission !== 0) {
    //         const msg = `COMMISSION IS NOT AS EXPECTED! MakerCommission: ${makerCommission}, TakerCommission: ${takerCommission}, BuyerCommission: ${buyerCommission}, SellerCommission: ${sellerCommission}`;
    //         debug(msg);
    //         errorsLog(msg);
    //         sendMessage(msg);
    //       }

    //       const balanceNorm = balance.forEach(b => ({
    //         asset: b.asset,
    //         free: +b.free,
    //         locked: +b.locked,
    //       }));

    //       console.log(fs.writeFile('balance', JSON.stringify(balanceNorm)));


    //       return balanceNorm;
    //     });
    // }

    return Promise.all([...klines]);
  },
});
