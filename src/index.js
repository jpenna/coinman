const errorLog = require('debug')('coinman:core');
const debugSystem = require('debug')('coinman:system');
// const fs = require('fs');

const {
  Spokesman,
  Broker,
  DataKeeper,
  fetcher,
  Postman,
  Listener,
} = require('./core');

// const system = require('./analytics/system');
// system.monitorSystem();

const MainStrategy = require('./strategies/Main');
const { binanceRest } = require('./exchanges/binance');
// const { extraInfoSymbol } = require('./tools/gracefulExit');
require('./tools/gracefulExit');

debugSystem(`Initializing Bot at PID ${process.pid}`);

// const pairs = ['BNBBTC', 'XLMBTC', 'XVGBTC', 'TRXBTC', 'ETHBTC', 'QTUMBTC', 'ADABTC', 'LUNBTC', 'ARKBTC', 'LSKBTC', 'ZRXBTC', 'XRPBTC'];
// const pairs = ['ETHBTC', 'LUNBTC', 'XVGBTC', 'ARKBTC'];
const pairs = ['ETHBTC'];

const spokesman = new Spokesman();
const { sendMessage } = spokesman;

const dataKeeper = new DataKeeper();


const postman = new Postman({ dataKeeper });
const listener = new Listener();

const { fetchInitialData } = fetcher({ binanceRest, sendMessage });

const broker = new Broker({ binanceRest, sendMessage, dataKeeper });

const mainStrategy = new MainStrategy({ dataKeeper, broker, postman, sendMessage });

let interval = 1000;

(async function startBot() {
  let data;

  try {
    data = await fetchInitialData();
    // data = [];
    // data.push(JSON.parse(fs.readFileSync('src/balance.json')));
    // data.push(JSON.parse(fs.readFileSync('src/BNB_rest.json')));
  } catch (e) {
    errorLog('Error fetching initial data. Retrying.', e);
    setTimeout(() => {
      if (interval < 10000) interval += 1000;
      startBot();
    }, interval);
    return;
  }

  const [balance] = data;

  dataKeeper.setupBalance(balance);

  // klines.forEach((d, index) => {
  //   dataKeeper.setupPair({
  //     pair: pairs[index],
  //     data: {
  //       ...dbManager.assetsDB[pairs[index]],
  //       ...MainStrategy.processCandles(d),
  //     },
  //   });
  // });

  (function isComplete() {
    const start = pairs.every(pair => dataKeeper.tickers.includes(pair));
    if (!start) return setTimeout(isComplete, 500);
    mainStrategy.init();
  }());
}());
