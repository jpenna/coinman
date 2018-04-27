const Telegraf = require('telegraf');
const debug = require('debug')('coinman:core');
const debugError = require('debug')('coinman:core:error');

function init() {
  debug('Initializing Telegram bot');

  const whiteList = JSON.parse(process.env.TELEGRAM_WHITE_LIST);
  const isWhiteListed = id => whiteList.includes(id);

  const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

  bot.use((ctx, next) => {
    if (isWhiteListed(ctx.from.id)) next(ctx);
    return null;
  });

  bot.start((ctx) => {
    if (isWhiteListed(ctx.from.id)) return ctx.reply('Welcome Mr. 瑞利');
    ctx.reply('You are not welcome here.\nI am kicking you out.');
  });

  bot.hears('balanco', (ctx) => {
    ctx.reply('Envio do balanço');
  });

  bot.hears(/buy/i, (ctx) => {
    ctx.reply('Buy-buy');
  });

  bot.catch(debugError);

  bot.startPolling();

  function sendMessage(msg) {
    try {
      bot.telegram.sendMessage(whiteList[0], msg, { parse_mode: 'Markdown' });
    } catch (e) {
      debugError('Telegram message error', e);
    }
  }

  // TODO 4 get pairs status (ON/OFF)
  // TODO 3 fix error, to many requests is throwing uncaught exception (bug on ticker, sending a lot at once)
  // coinman: gracefulExit Unhandled Rejection -> Promise: Error: 429: Too Many Requests: retry after 4
  // coinman: gracefulExit  Promise {
  //   <rejected> {Error: 429: Too Many Requests: retry after 4
  //     at buildConfig.then.then.then.then (/home/juliano/projects/coinman/bot/node_modules/telegraf/core/network/client.js:235:17)
  //   at <anonymous>
  //       at process._tickCallback (internal/process/next_tick.js:188:7)
  //     code: 429,
  //     response:
  //  {ok: false,
  //         error_code: 429,
  //         description: 'Too Many Requests: retry after 4',
  //         parameters: [Object] },
  //      description: 'Too Many Requests: retry after 4',
  // parameters: {retry_after: 4 },
  // on: {method: 'sendMessage', payload: [Object] } } } +0ms


  return {
    bot,
    sendMessage,
  };
}

module.exports = { init };
