import { TOKENS, type Tego } from '@tego/core';

export interface CronJobParameters {
  cronTime: string;
  onTick: () => void;
  start?: boolean;
  timeZone?: string;
  context?: any;
}

export class CronJob {
  constructor(params: CronJobParameters) {
    if (params.start !== false) {
      this.start();
    }
  }

  start() {
    console.log('Mock CronJob started');
  }

  stop() {
    console.log('Mock CronJob stopped');
  }
}

export class CronJobManager {
  private _jobs: Set<CronJob> = new Set();
  private _started = false;

  constructor(private tego: Tego) {
    tego.on('tego:beforeStop', async () => {
      this.stop();
    });

    tego.on('tego:afterStart', async () => {
      this.start();
    });

    tego.on('tego:beforeReload', async () => {
      this.stop();
    });

    tego.container.set({ id: TOKENS.CronJobManager, value: this });
  }

  get started() {
    return this._started;
  }

  get jobs() {
    return this._jobs;
  }

  addJob(options: CronJobParameters) {
    const cronJob = new CronJob(options);
    this._jobs.add(cronJob);
    return cronJob;
  }

  removeJob(job: CronJob) {
    job.stop();
    this._jobs.delete(job);
  }

  start() {
    this._jobs.forEach((job) => {
      job.start();
    });
    this._started = true;
  }

  stop() {
    this._jobs.forEach((job) => {
      job.stop();
    });
    this._started = false;
  }
}

export const registerCron = (tego: Tego) => {
  return new CronJobManager(tego);
};
