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
    let connectedCount = 0;

    const { candleStreams, connectedPairs } = pairs.reduce((acc, pair) => {
      acc.candleStreams.push(streams.kline(pair, '30m'));
      acc.connectedPairs[pair] = false;
      return acc;
    }, { candleStreams: [], connectedPairs: {} });

    const candleStreamsLength = candleStreams.length;

    bnbWS.onUserData(binanceRest, (data) => {
      console.log(data);
      sendMessage(JSON.stringify(data, null, 2));
    }, 30000) // Optional, how often the keep alive should be sent in milliseconds
      .then((ws) => {
        ws.on('outboundAccountInfo', console.log);
        ws.on('executionReport', console.log);
        // websocket instance available here
      }).catch(e => errorLog(e));

    const cancelBot = setTimeout(() => {
      bnbLog('Timeout. All websockets did not connect on time (2 min)');
      process.emit('SIGINT');
    }, 120000);

    console.time('All websockets connected');
    bnbWS.onCombinedStream(
      candleStreams,
      ({ data }) => {
        // TODO use time to check if the candle is over in case of websocket failure
        const { E: time, k: { s: pair, o, c, h, l, x: isOver, T: closeTime } } = data;

        if (!connectedPairs[pair]) {
          connectedCount++;
          bnbLog(`Connected ${pair} websocket (${connectedCount}/${candleStreamsLength})`);
          connectedPairs[pair] = true;
          if (connectedCount === candleStreamsLength) {
            bnbLog(console.timeEnd('All websockets connected'));
            clearTimeout(cancelBot);
          }
        }

        letterMan.receivedBinanceCandle({ time, pair, o, c, h, l, isOver, closeTime });
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
