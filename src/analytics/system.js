const os = require('os');
const log = require('simple-node-logger').createSimpleLogger('logs/system.log');

module.exports = {
  monitorSystem() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    log.info(`Total: ${totalMem} | Free: ${freeMem} | Used: ${usedMem} (${usedMem / totalMem})`);
    setTimeout(this.monitorSystem, 600000);
  },
};
