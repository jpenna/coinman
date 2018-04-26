const error = require('debug')('coinman:broker:error');

class Broker {
  constructor({ binanceRest, sendMessage }) {
    this.binanceRest = binanceRest;
    this.sendMessage = sendMessage;
  }

  async market({ asset, volume }) {
    try {
      const result = await this.binanceRest.testOrder({
        symbol: `${asset}BTC`,
        side: volume < 0 ? 'sell' : 'buy',
        quantity: volume,
        type: 'market',
      });
      if (result.clientOrderId) {
        this.sendMessage(`
          *Market*
          ${volume < 0 ? 'Sell' : 'Buy'} ${volume} ${asset} at ${result.price} BTC
        `);
      }
    } catch (err) {
      error(err);
    }
  }

  limit() {

  }

  stopLoss() {

  }

  takeProfit() {

  }
}

module.exports = Broker;

// symbol	STRING	YES
// side	ENUM	YES
// type ENUM	YES
// timeInForce	ENUM	NO
// quantity	DECIMAL	YES
// price	DECIMAL	NO
// newClientOrderId	STRING	NO	A unique id for the order.Automatically generated if not sent.
// stopPrice	DECIMAL	NO	Used with STOP_LOSS, STOP_LOSS_LIMIT, TAKE_PROFIT, and TAKE_PROFIT_LIMIT orders.
// icebergQty	DECIMAL	NO	Used with LIMIT, STOP_LOSS_LIMIT, and TAKE_PROFIT_LIMIT to create an iceberg order.
// newOrderRespType	ENUM	NO	Set the response JSON.ACK, RESULT, or FULL; default: RESULT.
// recvWindow	LONG	NO
// timestamp	LONG	YES
