const Telegraf = require('telegraf');
const debug = require('debug')('coinman:core');
const fileLogger = require('simple-node-logger').createSimpleLogger('logs/errors.log');

class Spokesman {
  constructor() {
    debug('Initializing Telegram bot');
    this.whiteList = JSON.parse(process.env.TELEGRAM_WHITE_LIST);
    this.bot = new Telegraf(process.env.TELEGRAM_TOKEN);

    if (process.env.BACKTEST) {
      Spokesman.prototype.sendMessage = () => {};
      return;
    }

    this.setupTelegram();
  }

  // register({ wsHandler, dbManager, sourceSet }) {
  //   this.wsHandler = wsHandler;
  //   this.dbManager = dbManager;
  //   this.sourceSet = sourceSet;
  // }

  isWhiteListed(id) {
    return this.whiteList.includes(id);
  }

  sendMessage(msg) {
    this.bot.telegram
      .sendMessage(this.whiteList[0], msg, { parse_mode: 'Markdown' })
      .catch(e => debug('Telegram message error', e));
  }

  setupTelegram() {
    this.bot
      .use((ctx, next) => {
        if (this.isWhiteListed(ctx.from.id)) next(ctx);
        return null;
      })

      .start((ctx) => {
        if (this.isWhiteListed(ctx.from.id)) return ctx.reply('Welcome Mr.');
        ctx.reply('You are not welcome here, get out.');
      })


      .hears('apocalypse', (ctx) => {
        ctx.reply('☄️️️️️️️️️️☄️☄️ You want to destroy me?');
        this.apocalypse = true;
        setTimeout(() => {
          this.apocalypse = false;
        }, 10000);
      })

      .hears('yes', (ctx) => {
        if (!this.apocalypse) return;
        ctx.reply('💥 Ok, I am dying...');
        process.emit('quit');
      })

      .catch(fileLogger.error)

      .startPolling();
  }
}

module.exports = Spokesman;
