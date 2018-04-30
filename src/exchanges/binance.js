const binanceApi = require('binance');
const WebSocket = require('ws');
const coreLog = require('debug')('coinman:core');
const errorLog = require('debug')('coinman:coreError');
const bnbLog = require('debug')('coinman:binance');

bnbLog.log = console.error.bind(console); // eslint-disable-line no-console

module.exports = ({ beautify = false, sendMessage, pairs, letterMan }) => ({
  handleCandle(data) {
    const { E: time, k: { s: pair, o, c, h, l, q: quoteVolume, x: isOver, T: closeTime } } = data;
    letterMan.receivedBinanceCandle({ time, pair, o, c, h, l, quoteVolume, isOver, closeTime });
  },

  wsRetries: 0,

  fromCollector() {
    const ws = new WebSocket(`ws://localhost:${process.env.COLLECTOR_WS_PORT}`);

    ws.on('error', err => errorLog('Error connecting WS: ', err));

    ws.on('open', () => {
      coreLog('Collector connected');
      this.wsRetries = 0;
    });

    ws.on('close', () => {
      coreLog(`WS disconnected! Retrying connection in ${this.wsRetries} seconds.`);
      setTimeout(() => {
        if (this.wsRetries < 5) this.wsRetries++;
        this.fromCollector();
      }, this.wsRetries * 1000);
    });

    ws.on('message', function onMessage(data) {
      this.handleCandle(JSON.parse(data));
    }.bind(this));
  },

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

    // TODO 1 fix the call on Binance lib
    // bnbWS.onUserData(binanceRest, (data) => {
    //   console.log(data);
    //   // sendMessage(JSON.stringify(data, null, 2));
    // }, 30000) // Optional, how often the keep alive should be sent in milliseconds
    //   .then((ws) => {
    //     ws.on('outboundAccountInfo', console.log);
    //     ws.on('executionReport', console.log);
    //     // websocket instance available here
    //   }).catch(e => errorLog(e));

    const cancelBot = setTimeout(() => {
      bnbLog('Timeout. All websockets did not connect on time (2 min)');
      process.quit();
    }, 120000);

    const startConn = Date.now();
    let allConnected = false;

    bnbWS.onCombinedStream(
      candleStreams,
      function onCandle({ data }) {
        // TODO 2 use time to check if the candle is over in case of websocket failure
        const { k: { s: pair } } = data;

        if (!connectedPairs[pair]) {
          connectedCount++;
          bnbLog(`Connected ${pair} websocket (${connectedCount}/${candleStreamsLength})`);
          connectedPairs[pair] = true;
          if (connectedCount === candleStreamsLength) {
            bnbLog(`All websockets connected (${((Date.now() - startConn) / 1000).toFixed(2)}sec)`);
            allConnected = true;
            clearTimeout(cancelBot);
          }
        }

        if (!allConnected) return;

        this.handleCandle(data);
      }.bind(this),
    );

    // TODO 4 try to get all names
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
