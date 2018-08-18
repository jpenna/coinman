const logger = require('debug')('coinman:listener');
const WebSocket = require('ws');

class Listener {
  constructor() {
    const port = process.env.BACKTEST ? process.env.PUMP_WS_PORT : process.env.COLLECTOR_WS_PORT;
    this.ws = new WebSocket(`ws://localhost:${port}`);
    this.setup();
  }

  setup() {
    this.ws
      .on('open', () => {
        logger('Collector connected');
        this.wsRetries = 0;
      })

      .on('close', () => {
        logger(`WS disconnected! Retrying connection in ${this.wsRetries} seconds.`);
        setTimeout(() => {
          if (this.wsRetries < 5) this.wsRetries++;
          this.fromCollector();
        }, this.wsRetries * 1000);
      })

      .on('message', (data) => {
        // { p: pair, t: 1, e: 0, d: kline }
        const { t: type } = data;

        switch (type) {
          case 0: // initial data

            break;
          case 1: // periodic

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
