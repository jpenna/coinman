const binanceLog = require('debug')('coinman:binance');

const {
  telegram,
  writer,
  Broker,
  DataKeeper,
  fetcher,
  LetterMan,
} = require('./core');
const MainStrategy = require('./strategies/Main');
const binanceApi = require('./exchanges/binance');
const system = require('./analytics/system');

const { setup: setupGracefulExit } = require('./utils/gracefulExit');

const { symbols: processSymbols } = setupGracefulExit();
system.monitorSystem();

const { sendMessage } = telegram.init();
const dataKeeper = new DataKeeper();

const pairs = Object.keys(writer.assetsDB);

const letterMan = new LetterMan({ dataKeeper, writer, skipedSymbol: processSymbols.letterManSkiped });
const { binanceWS, binanceRest } = binanceApi({ beautify: false, sendMessage, pairs, letterMan });
const bnbRest = binanceRest();

const init = fetcher({ binanceRest: bnbRest, pairs });

const broker = new Broker({ binanceRest: bnbRest, sendMessage });

const mainStrategy = new MainStrategy({ dataKeeper, broker, letterMan });

init.fetchInitialData()
  .then((data) => { // candles
    data.forEach((d, index) => {
      dataKeeper.setupProperty({
        pair: pairs[index],
        data: {
          ...writer.assetsDB[pairs[index]],
          ...MainStrategy.processCandles(d),
        },
      });
    });

    const { connectedPairs } = binanceWS(bnbRest);

    (function startCheck() {
      let start;
      Object.keys(connectedPairs).every((pair) => {
        start = connectedPairs[pair];
        return connectedPairs[pair];
      });
      if (!start) return setTimeout(startCheck, 500);
      binanceLog('All websockets connected');
      mainStrategy.init();
    }());
  });
