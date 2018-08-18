fromCollector() {
  const ws = new WebSocket(`ws://localhost:${process.env.COLLECTOR_WS_PORT}`);

  ws.on('error', err => errorLog('Error connecting WS: ', err));

  ws.on('open', () => {
    coreLog('Collector connected');
    this.wsRetries = 0;
  });

  ws.on('close', () => {
    coreLog(`WS disconnected! Retrying connection in ${this.wsRetries} seconds.`);
    setTimeout(() => {
      if (this.wsRetries < 5) this.wsRetries++;
      this.fromCollector();
    }, this.wsRetries * 1000);
  });

  ws.on('message', function onMessage(data) {
    this.handleCandle(JSON.parse(data));
  }.bind(this));
}
