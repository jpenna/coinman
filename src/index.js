const errorLog = require('debug')('coinman:core');
const debugSystem = require('debug')('coinman:system');
const fs = require('fs');

const {
  telegram,
  dbManager,
  Broker,
  DataKeeper,
  fetcher,
  LetterMan,
} = require('./core');
const MainStrategy = require('./strategies/Main');
const binanceApi = require('./exchanges/binance');
const system = require('./analytics/system');
const { setup: setupGracefulExit } = require('./tools/gracefulExit');

debugSystem(`Initializing Bot at PID ${process.pid}`);

system.monitorSystem();

// TODO 2 fix error telegram, if cant connect it breaks the bot (check README)
// const { sendMessage } = telegram.init();
const sendMessage = () => {};
const dataKeeper = new DataKeeper();
const { symbols: processSymbols } = setupGracefulExit({ sendMessage });

const pairs = Object.keys(dbManager.assetsDB);

const letterMan = new LetterMan({ dataKeeper, dbManager, skipedSymbol: processSymbols.letterManSkiped });
const binance = binanceApi({ beautify: false, sendMessage, pairs, letterMan });
const bnbRest = binance.binanceRest();

const init = fetcher({ binanceRest: bnbRest, pairs, sendMessage, letterMan });

const broker = new Broker({ binanceRest: bnbRest, sendMessage });

const mainStrategy = new MainStrategy({ dataKeeper, broker, letterMan, sendMessage });

let retries = 0;

async function startBot() {
  if (retries >= 3) {
    errorLog(`Exiting. Maximum retries reachead (${retries})`);
    return process.exit();
  }
  let data;

  try {
    data = JSON.parse(fs.readFileSync('src/BNB_rest.json'));
    // data = await init.fetchInitialData();
    // fs.writeFile('src/rest', JSON.stringify(data));
  } catch (e) {
    errorLog('Error fetching initial data. Retrying.', e);
    retries++;
    return startBot();
  }

  data.forEach((d, index) => {
    dataKeeper.setupProperty({
      pair: pairs[index],
      data: {
        ...dbManager.assetsDB[pairs[index]],
        ...MainStrategy.processCandles(d),
      },
    });
  });

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
