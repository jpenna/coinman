const logger = require('debug')('coinman:listener');
const WebSocket = require('ws');

class Listener {
  constructor({ pairs, postman }) {
    this.ws = new WebSocket(`ws://localhost:${process.env.COLLECTOR_WS_PORT}`, {
      auth: process.env.PASSWORD_WS,
      // TODO the client should subscribe to the pairs it want to listen
    });
    this.pairs = pairs;
    this.setup();
  }

  setup() {
    this.ws
      .on('open', () => {
        logger('Collector connected');
        this.wsRetries = 0;

        const send = this.ws.send.bind(this.ws);
        this.ws.send = (msg) => {
          send(JSON.stringify(msg));
        };
      })

      // .on('close', () => {
      //   logger(`WS disconnected! Retrying connection in ${this.wsRetries} seconds.`);
      //   setTimeout(() => {
      //     if (this.wsRetries < 5) this.wsRetries++;
      //     this.ws = new WebSocket(`ws://localhost:${process.env.COLLECTOR_WS_PORT}`);
      //   }, this.wsRetries * 1000);
      // })

      .on('message', (data) => {
        // { p: pair, t: 1, e: 0, d: kline }
        const { t: type, p: pair } = data;

        switch (type) {
          case 0: // initial data
            if (!this.pairs.includes(pair)) return;

            break;
          case 1: // periodic

            break;
        }
      })

      .on('error', err => logger('Error connecting WS: ', err));
  }
}

module.exports = Listener;
