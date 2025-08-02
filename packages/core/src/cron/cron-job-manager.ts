import Application from '../application';

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
