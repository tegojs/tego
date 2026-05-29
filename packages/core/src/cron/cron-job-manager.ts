import { CronExpressionParser } from 'cron-parser';

import Application from '../application';

export interface CronJobParameters {
  cronTime: string;
  onTick: () => void;
  start?: boolean;
  timeZone?: string;
  context?: any;
}

const MAX_TIMEOUT = 2 ** 31 - 1;

export class CronJob {
  private timer?: ReturnType<typeof setTimeout>;

  constructor(private params: CronJobParameters) {
    if (params.start !== false) {
      this.start();
    }
  }

  start() {
    if (this.timer) {
      return;
    }
    this.scheduleNext();
  }

  private scheduleNext() {
    const interval = CronExpressionParser.parse(this.params.cronTime, {
      tz: this.params.timeZone,
    });
    const next = interval.next().getTime();
    const delay = Math.max(0, next - Date.now());

    if (delay > MAX_TIMEOUT) {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.scheduleNext();
      }, MAX_TIMEOUT);
    } else {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.params.onTick();
        this.scheduleNext();
      }, delay);
    }
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}

export class CronJobManager {
  private _jobs: Set<CronJob> = new Set();

  private _started = false;

  constructor(private app: Application) {
    app.on('beforeStop', async () => {
      this.stop();
    });

    app.on('afterStart', async () => {
      this.start();
    });

    app.on('beforeReload', async () => {
      this.stop();
    });
  }

  public get started() {
    return this._started;
  }

  public get jobs() {
    return this._jobs;
  }

  public addJob(options: CronJobParameters) {
    const cronJob = new CronJob(options);
    this._jobs.add(cronJob);

    return cronJob;
  }

  public removeJob(job: CronJob) {
    job.stop();
    this._jobs.delete(job);
  }

  public start() {
    this._jobs.forEach((job) => {
      job.start();
    });
    this._started = true;
  }

  public stop() {
    this._jobs.forEach((job) => {
      job.stop();
    });
    this._started = false;
  }
}
