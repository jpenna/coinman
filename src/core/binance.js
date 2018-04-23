const binanceApi = require('binance');

function init({ beautify = false } = {}) {
  const binanceWS = () => new binanceApi.BinanceWS(beautify); // beautify
  const binanceRest = () => new binanceApi.BinanceRest({
    key: process.env.BNB_KEY,
    secret: process.env.BNB_SECRET,
    timeout: 15000, // Optional, defaults to 15000, is the request time out in milliseconds
    recvWindow: 5000, // Optional, defaults to 5000, increase if you're getting timestamp errors
    disableBeautification: !beautify,
    handleDrift: false,
    /* Optional, default is false.  If turned on, the library will attempt to handle any drift of
     * your clock on it's own.  If a request fails due to drift, it'll attempt a fix by requesting
     * binance's server time, calculating the difference with your own clock, and then reattempting
     * the request.
     */
  });

  return { binanceWS, binanceRest };
}

module.exports = { init };
