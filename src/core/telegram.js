const Telegraf = require('telegraf');
const debug = require('debug')('coinman:core');
const error = require('debug')('coinman:core:error');

const whiteList = JSON.parse(process.env.TELEGRAM_WHITE_LIST);

const isWhiteListed = id => whiteList.includes(id);

function init() {
  debug('Initializing Telegram bot');
  const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

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

  bot.catch(error);

  bot.startPolling();

  return {
    bot,
    sendMessage: msg => bot.telegram.sendMessage(whiteList[0], msg, { parse_mode: 'Markdown' }),
  };
}

module.exports = { init };
