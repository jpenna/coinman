const os = require('os');
const log = require('simple-node-logger').createSimpleLogger('logs/system.log');

module.exports = {
  monitorSystem() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const { rss, heapTotal, heapUsed, external } = process.memoryUsage();
    log.info(`Total: ${totalMem} | Free: ${freeMem} | Used: ${usedMem} (${usedMem / totalMem})`);
    log.info(`Process -> rss: ${rss} | heapTotal: ${heapTotal} | heapUsed: ${heapUsed} (${heapUsed / heapTotal}) | external: ${external})`);
    setTimeout(this.monitorSystem.bind(this), 600000);
  },
};
