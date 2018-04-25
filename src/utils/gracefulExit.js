const errorsLog = require('simple-node-logger').createSimpleLogger('logs/errors.log');
const debugError = require('debug')('coinman:process:error');

const codeMap = Object.create(null);
Object.assign(codeMap, {
  91: 'Uncaught Exception',
  90: 'Unhandled Promise Rejection',
  2: 'SIGINT',
  98: 'SIGUSR1',
  99: 'SIGUSR2',
});

function setup() {
  const letterManSkiped = Symbol('letterManSkiped');

  // Capture Errors not catched and start BOT reinicialization process
  process.on('uncaughtException', (err) => {
    const errorMsg = err;
    errorsLog.info(`Uncaught Exception -> ${errorMsg.stack}`);
    debugError(`Uncaught Exception -> ${errorMsg.stack}`);
    process.emit('cleanup', 91);
  });

  // Capture Promise rejections not handled and start BOT reinicialization process
  process.on('unhandledRejection', (reason, p) => {
    const errorMsg = `Promise: ${reason}`;
    errorsLog.info(`Unhandled Rejection -> ${errorMsg}\n`, p);
    debugError(`Unhandled Rejection -> ${errorMsg}\n`, p);
    process.emit('cleanup', 90);
  });

  // catch ctrl+c event and exit normally
  process.on('SIGINT', () => process.emit('cleanup', 2));

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', () => process.emit('cleanup', 98));
  process.on('SIGUSR2', () => process.emit('cleanup', 99));

  process.on('exit', (code) => {
    const skipedCount = JSON.stringify(process[letterManSkiped], null, 2);
    debugError(`Skiped requests to LetterMan: ${skipedCount}`);
    errorsLog.info(skipedCount);

    const errorMsg = `(PID ${process.pid}) Exiting with code: ${code} - ${codeMap[code]}`;
    errorsLog.info(errorMsg);
    debugError(errorMsg);
  });

  return ({ symbols: { letterManSkiped } });
}

let cleanupsCount = 0;
let cleanupsRunned = 0;

function gracefulExit(callback = () => { }) {
  cleanupsCount++;

  process.on('cleanup', async (code) => {
    console.log('CLEANUP GRACEFULL', cleanupsCount, cleanupsRunned);
    await callback();
    cleanupsRunned++;
    if (cleanupsCount === cleanupsRunned) process.exit(code);
  });
}

module.exports = {
  setup,
  gracefulExit,
};
