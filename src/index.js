const debug = require('debug')('coinman:index');
const error = require('debug')('coinman:error');

const persist = require('./db/persist');
const { binance, telegram } = require('./core');

const { binanceWS, binanceRest } = binance.init({ beautify: true });
const telgramBot = telegram.init();
// binanceRest();
// binanceWS();


// binanceWS.onUserData(binanceRest, (data) => {
//   console.log(data);
// }, 30000) // Optional, how often the keep alive should be sent in milliseconds
//   .then((ws) => {
//     // websocket instance available here
//   })
//   .catch(e => error(e));

// binanceWS.onKline('BNBBTC', '1m', (data) => {
//   console.log(data);
// });
