const binanceApi = require('binance');
const coreLog = require('debug')('coinman:core');
const errorLog = require('debug')('coinman:coreError');
const bnbLog = require('debug')('coinman:binance');

bnbLog.log = console.error.bind(console); // eslint-disable-line no-console

module.exports = ({ beautify = false, sendMessage, pairs, letterMan }) => ({
  binanceWS(binanceRest) {
    coreLog('Initializing Binance WS');
    const bnbWS = new binanceApi.BinanceWS(beautify);
    const { streams } = bnbWS;

    const { candleStreams, connectedPairs } = pairs.reduce((acc, pair) => {
      acc.candleStreams.push(streams.kline(pair, '30m'));
      acc.connectedPairs[pair] = false;
      return acc;
    }, { candleStreams: [], connectedPairs: {} });

    bnbWS.onUserData(binanceRest, (data) => {
      console.log(data);
      sendMessage(JSON.stringify(data, null, 2));
    }, 30000) // Optional, how often the keep alive should be sent in milliseconds
      .then((ws) => {
        ws.on('outboundAccountInfo', console.log);
        ws.on('executionReport', console.log);
        // websocket instance available here
      }).catch(e => errorLog(e));

    bnbWS.onCombinedStream(
      candleStreams,
      ({ data }) => {
        // TODO use time to check if the candle is over in case of websocket failure
        const { E: time, k: { s: pair, o, c, h, l, x: isOver, T: closeTime } } = data;

        if (!connectedPairs[pair]) {
          bnbLog(`Connected ${pair} websocket`);
          connectedPairs[pair] = true;
        }

        letterMan.receivedBinanceCandle({ time, pair, o, c, h, l, isOver, closeTime });

        // TODO remove comments of API and put it in README.md
        //  {
        //   "e": "kline",     // Event type
        //   "E": 123456789,   // Event time
        //   "s": "BNBBTC",    // Symbol
        //   "k": {
        //     "t": 123400000, // Kline start time
        //     "T": 123460000, // Kline close time
        //     "s": "BNBBTC",  // Symbol
        //     "i": "1m",      // Interval
        //     "f": 100,       // First trade ID
        //     "L": 200,       // Last trade ID
        //     "o": "0.0010",  // Open price
        //     "c": "0.0020",  // Close price
        //     "h": "0.0025",  // High price
        //     "l": "0.0015",  // Low price
        //     "v": "1000",    // Base asset volume
        //     "n": 100,       // Number of trades
        //     "x": false,     // Is this kline closed?
        //     "q": "1.0000",  // Quote asset volume
        //     "V": "500",     // Taker buy base asset volume
        //     "Q": "0.500",   // Taker buy quote asset volume
        //     "B": "123456"   // Ignore
        //   }
        // }
      },
    );

    // TODO try to get all names
    //     function patchEmitter(emitter, websocket) {
    //       var oldEmit = emitter.emit;

    //       emitter.emit = function () {
    //         var emitArgs = arguments;
    //       // serialize arguments in some way.
    //       ...
    //       // send them through the websocket received as a parameter
    //       ...
    //   oldEmit.apply(emitter, arguments);
    // }
    // }

    return { connectedPairs };
  },

  binanceRest() {
    coreLog('Initializing Binance Rest');
    return new binanceApi.BinanceRest({
      key: process.env.BNB_KEY,
      secret: process.env.BNB_SECRET,
      timeout: 15000, // Optional, defaults to 15000, is the request time out in milliseconds
      recvWindow: 10000, // Optional, defaults to 5000, increase if you're getting timestamp errors
      disableBeautification: !beautify,
      handleDrift: false, // true: the library will attempt to handle any drift of your clock on it's own
    });
  },
});
