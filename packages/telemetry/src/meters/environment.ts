import os from 'node:os';

import osUtils from 'node-os-utils';

export class environmentMeters {
  meter: any;
  constructor(meter) {
    this.meter = meter;
  }
  async start() {
    console.log('environment meter start');

    const uptime = this.meter.createObservableGauge('environment.hardware.uptime', {
      description: 'Uptime in seconds',
      unit: 'seconds',
    });
    uptime.addCallback((result) => {
      const uptime = os.uptime();
      console.log('uptime', uptime);
      result.observe(uptime);
    });

    const cpuUsage = this.meter.createObservableGauge('environment.hardware.cpuusage', {
      description: 'CPU Usage',
      unit: 'percent',
    });
    cpuUsage.addCallback(async (result) => {
      const cpuPercentage = await osUtils.cpu.usage();
      console.log('cpuPercentage', cpuPercentage);
      result.observe(cpuPercentage);
    });

    const load1min = this.meter.createObservableGauge('environment.hardware.load_1min', {
      description: 'Load Average in 1 minutes',
    });
    load1min.addCallback((result) => {
      const load = os.loadavg();
      const parsedLoad = Number(load[0].toFixed(2));
      console.log('load_1min', parsedLoad);
      result.observe(parsedLoad);
    });

    const load5min = this.meter.createObservableGauge('environment.hardware.load_5min', {
      description: 'Load Average in 5 minutes',
    });
    load5min.addCallback((result) => {
      const load = os.loadavg();
      const parsedLoad = Number(load[1].toFixed(2));
      console.log('load_5min', parsedLoad);
      result.observe(parsedLoad);
    });

    const load15min = this.meter.createObservableGauge('environment.hardware.load_15min', {
      description: 'Load Average in 15 minutes',
    });
    load15min.addCallback((result) => {
      const load = os.loadavg();
      const parsedLoad = Number(load[2].toFixed(2));
      console.log('load_15min', parsedLoad);
      result.observe(parsedLoad);
    });

    const memoryUsage = this.meter.createObservableGauge('environment.hardware.memoryusage', {
      description: 'Memory Usage',
      unit: 'percent',
    });
    memoryUsage.addCallback(async (result) => {
      const mem = await osUtils.mem.used();
      const memPercentage = Number(((mem.usedMemMb / mem.totalMemMb) * 100).toFixed(2));
      console.log('memPercentage', memPercentage);
      result.observe(memPercentage);
    });
  }
  async shutdown() {
    console.log('environment meter shutdown');
  }
}
