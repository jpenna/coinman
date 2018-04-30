# Coinman

## Account information (USER_DATA)

```json
  {
    "makerCommission": 15,
    "takerCommission": 15,
    "buyerCommission": 0,
    "sellerCommission": 0,
    "canTrade": true,
    "canWithdraw": true,
    "canDeposit": true,
    "updateTime": 123456789,
    "balances": [
      {
        "asset": "BTC",
        "free": "4723846.89208129",
        "locked": "0.00000000"
      },
      {
        "asset": "LTC",
        "free": "4763368.68006011",
        "locked": "0.00000000"
      }
    ]
  }
```

## Kline streams

```json
{
  "e": "kline",     // Event type
  "E": 123456789,   // Event time
  "s": "BNBBTC",    // Symbol
  "k": {
    "t": 123400000, // Kline start time
    "T": 123460000, // Kline close time
    "s": "BNBBTC",  // Symbol
    "i": "1m",      // Interval
    "f": 100,       // First trade ID
    "L": 200,       // Last trade ID
    "o": "0.0010",  // Open price
    "c": "0.0020",  // Close price
    "h": "0.0025",  // High price
    "l": "0.0015",  // Low price
    "v": "1000",    // Base asset volume
    "n": 100,       // Number of trades
    "x": false,     // Is this kline closed?
    "q": "1.0000",  // Quote asset volume
    "V": "500",     // Taker buy base asset volume
    "Q": "0.500",   // Taker buy quote asset volume
    "B": "123456"   // Ignore
  }
}
```

## TODO flags

1: Needed for testing here
2: Needed for server deploy
3: Important improvement
4: Minor improvement
5: Strategy


## ERROR Telegram

```txt
Failed to fetch updates. Waiting: 1s request to https://api.telegram.org/bot568140030:AAFRcU9eqk8Za2nhWh4RyZJn3ldqKF4idPM/getUpdates?offset=0&limit=100&timeout=30 failed, reason: getaddrinfo EAI_AGAIN api.telegram.org:443
  coinman:gracefulExit Unhandled Rejection -> Promise: FetchError: request to https://api.telegram.org/bot568140030:AAFRcU9eqk8Za2nhWh4RyZJn3ldqKF4idPM/sendMessage failed, reason: getaddrinfo EAI_AGAIN api.telegram.org:443
  coinman:gracefulExit  Promise {
  <rejected> { FetchError: request to https://api.telegram.org/bot568140030:AAFRcU9eqk8Za2nhWh4RyZJn3ldqKF4idPM/sendMessage failed, reason: getaddrinfo EAI_AGAIN api.telegram.org:443
    at ClientRequest.<anonymous> (/home/juliano/projects/coinman/bot/node_modules/node-fetch/lib/index.js:1393:11)
    at emitOne (events.js:116:13)
    at ClientRequest.emit (events.js:211:7)
    at TLSSocket.socketErrorListener (_http_client.js:387:9)
    at emitOne (events.js:116:13)
    at TLSSocket.emit (events.js:211:7)
    at emitErrorNT (internal/streams/destroy.js:64:8)
    at _combinedTickCallback (internal/process/next_tick.js:138:11)
    at process._tickCallback (internal/process/next_tick.js:180:9)
  message: 'request to https://api.telegram.org/bot568140030:AAFRcU9eqk8Za2nhWh4RyZJn3ldqKF4idPM/sendMessage failed, reason: getaddrinfo EAI_AGAIN api.telegram.org:443',
  type: 'system',
  errno: 'EAI_AGAIN',
  code: 'EAI_AGAIN' } } +0ms
```
