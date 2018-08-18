const binanceApi = require('binance');

module.exports = {
  binanceRest: new binanceApi.BinanceRest({
    key: process.env.BNB_KEY,
    secret: process.env.BNB_SECRET,
    timeout: 15000, // Optional, defaults to 15000, is the request time out in milliseconds
    recvWindow: 10000, // Optional, defaults to 5000, increase if you're getting timestamp errors
    beautify: false,
    handleDrift: false, // true: the library will attempt to handle any drift of your clock on it's own
  }),
};
