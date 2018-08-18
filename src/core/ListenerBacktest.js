const logger = require('debug')('coinman:listener');
const WebSocket = require('ws');

const pairCandles = new Map();

// have to create the candle with data from collector and after creating the candle the same way as Binance REST send, use it to setup the pair
// Stop the stream until all pairs are done, because the strategy only run originally when all REST are fetched. // After ALL pairs are setup, run strategy and turn ON WS again

function buildCandle({ p: pair, d: data }) {
  const candles = pairCandles.get(pair);
  const last = candles.length;
  const [
    startTime,
    closeTime,
    open,
    close,
    high,
    low,
    volumeQuote,
    volumeBase,
    takerBuyVolumeQuote,
    takerBuyVolumeBase,
    numberOfTrades
  ] = data.split(' ');


}

class Listener {
  constructor({ pairs, postman }) {
    this.ws = new WebSocket(`ws://localhost:${process.env.PUMP_WS_PORT}`, {
      headers: { auth: process.env.PASSWORD_WS },
    });
    this.setup();

    pairs.forEach(pair => pairCandles.set(pair, []));

  }

  setup() {
    this.ws
    .on('open', () => {
        logger('Collector connected');
        // this.wsRetries = 0;
        this.ws.send({
          type: 'backtest',
          data: {
            // startDate: '2018-08-01T01:30:41.654Z',
            // endDate: '2018-08-15T01:30:41.654Z',
            exchanges: ['BNB'],
            pairs,
          },
        });

        const send = this.ws.send.bind(this.ws);
        this.ws.send = (msg) => {
          send(JSON.stringify(msg));
        };
      })

      // .on('close', () => {
      //   logger(`WS disconnected! Retrying connection in ${this.wsRetries} seconds.`);
      //   setTimeout(() => {
      //     if (this.wsRetries < 5) this.wsRetries++;
      //     this.fromCollector();
      //   }, this.wsRetries * 1000);
      // })

      .on('message', (data) => {
        // { p: pair, t: 1, e: 0, d: kline }
        const { t: type, p: pair } = data;

        switch (type) {
          case 1: // periodic
            if (pairCandles.get(pair).length < 9) return buildCandle(data);
            this.postman.receivedBacktest(data);
            break;
          case 100: // pump - starting next folder

            break;
          case 101: // pump - end

            break;
          case 102: // pump - no folder in root

            break;
        }
      })

      .on('error', err => logger('Error connecting WS: ', err));
  }
}

module.exports = Listener;
