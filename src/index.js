const errorLog = require('debug')('coinman:core');
const debugSystem = require('debug')('coinman:system');
const fs = require('fs');

const {
  Spokesman,
  dbManager,
  Broker,
  DataKeeper,
  fetcher,
  Postman,
  Listener,
} = require('./core');

// const system = require('./analytics/system');
// system.monitorSystem();

const MainStrategy = require('./strategies/Main');
const Binance = require('./exchanges/Binance');
const { setup: setupGracefulExit } = require('./tools/gracefulExit');

debugSystem(`Initializing Bot at PID ${process.pid}`);


const spokesman = new Spokesman();
const { sendMessage } = spokesman;

const dataKeeper = new DataKeeper();
const { symbols: processSymbols } = setupGracefulExit({ sendMessage });

const pairs = Object.keys(dbManager.assetsDB);

const postman = new Postman({ dataKeeper, dbManager, skipedSymbol: processSymbols.postmanSkiped });
const listener = new Listener();

const binance = new Binance();
const bnbRest = binance.binanceRest();

const init = fetcher({ binanceRest: bnbRest, pairs, sendMessage, postman });

const broker = new Broker({ binanceRest: bnbRest, sendMessage, dataKeeper });

const mainStrategy = new MainStrategy({ dataKeeper, broker, postman, sendMessage });

let retries = 0;

async function startBot() {
  if (retries >= 3) {
    errorLog(`Exiting. Maximum retries reachead (${retries})`);
    return process.exit();
  }
  let data;

  try {
    data = await init.fetchInitialData();
    data = [];
    data.push(JSON.parse(fs.readFileSync('src/balance.json')));
    data.push(JSON.parse(fs.readFileSync('src/BNB_rest.json')));
  } catch (e) {
    errorLog('Error fetching initial data. Retrying.', e);
    retries++;
    return startBot();
  }

  const [balance, ...klines] = data;

  dataKeeper.setupBalance(balance);

  klines.forEach((d, index) => {
    dataKeeper.setupPair({
      pair: pairs[index],
      data: {
        ...dbManager.assetsDB[pairs[index]],
        ...MainStrategy.processCandles(d),
      },
    });
  });

  // TODO getting all data from collector
  let connectedPairs = [true];
  if (true) {
    binance.fromCollector();
  } else {
    connectedPairs = binance.binanceWS(bnbRest).connectedPairs; // eslint-disable-line
  }

  (function startCheck() {
    let start;
    Object.keys(connectedPairs).every((pair) => {
      start = connectedPairs[pair];
      return connectedPairs[pair];
    });
    if (!start) return setTimeout(startCheck, 500);
    mainStrategy.init();
  }());
}

startBot();
