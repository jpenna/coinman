const Telegraf = require('telegraf');

const whiteList = JSON.parse(process.env.TELEGRAM_WHITE_LIST);

const whiteListed = id => whiteList.includes(id);

function init() {
  const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

  bot.start((ctx) => {
    if (whiteListed(ctx.from.id)) return ctx.reply('Welcome Mr. 瑞利');
    ctx.reply('You are not welcome here.\nI am kicking you out.');
  });

  bot.hears('balanco', (ctx) => {
    ctx.reply('Envio do balanço');
  });

  bot.hears(/buy/i, (ctx) => {
    ctx.reply('Buy-buy');
  });

  bot.startPolling();

  return bot;
}

module.exports = { init };
