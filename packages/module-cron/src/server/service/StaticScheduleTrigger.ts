import Database from '@tachybase/database';
import { EXECUTION_STATUS, PluginWorkflow, Processor } from '@tachybase/module-workflow';
import { Application, Logger } from '@tachybase/server';
import { App, Db, InjectLog, Service } from '@tachybase/utils';

import parser from 'cron-parser';

import { DATABASE_CRON_JOBS, SCHEDULE_MODE } from '../../constants';
import { CronJobModel } from '../model/CronJobModel';
import { parseDateWithoutMs } from '../utils';

const MAX_SAFE_INTERVAL = 2147483647;

@Service()
export class StaticScheduleTrigger {
  private static readonly inspectFields = ['startsOn', 'mode', 'endsOn', 'repeat', 'limit', 'enabled', 'limitExecuted'];
  @App()
  private app: Application;

  @Db()
  private readonly db: Database;

  @InjectLog()
  private readonly logger: Logger;

  private timers: Map<string, NodeJS.Timeout | null> = new Map();

  async load() {
    this.app.on('afterStart', async (app) => {
      const cronJobs = await app.db.getRepository('cronJobs').find({
        filter: { mode: SCHEDULE_MODE.STATIC, enabled: true },
      });
      this.inspect(cronJobs);
    });

    this.app.on('beforeStop', () => {
      for (const timer of this.timers.values()) {
        clearInterval(timer);
      }
    });

    this.db.on(`${DATABASE_CRON_JOBS}.beforeSave`, async (cronjob: CronJobModel, options) => {
      // 仅监听部分字段变化
      let changed = false;
      for (const field of options.fields) {
        if (StaticScheduleTrigger.inspectFields.includes(field)) {
          changed = true;
          break;
        }
      }
      if (!changed) {
        return;
      }
      this.off(cronjob);
    });

    this.db.on(`${DATABASE_CRON_JOBS}.afterSave`, async (cronjob: CronJobModel, options) => {
      // 仅监听部分字段变化
      let changed = false;
      for (const field of options.fields) {
        if (StaticScheduleTrigger.inspectFields.includes(field)) {
          changed = true;
          break;
        }
      }
      if (!changed) {
        return;
      }
      if (cronjob.get('enabled')) {
        this.on(cronjob);
      }
    });

    this.db.on(`${DATABASE_CRON_JOBS}.afterDestroy`, async (cronjob) => {
      this.off(cronjob);
    });

    this.app.resourcer.use(
      async (ctx, next) => {
        const { resourceName, actionName } = ctx.action;
        await next();
        if (resourceName === 'cronJobs' && actionName === 'list') {
          const rows = ctx.body.rows as CronJobModel[];
          rows.forEach((cronJob) => {
            if (!cronJob.enabled) {
              return;
            }
            const nextTime = this.getNextTime(cronJob, new Date());
            if (nextTime) {
              cronJob.nextTime = new Date(nextTime);
            }
          });
        }
      },
      { tag: 'addNextTimeToCronJobs' },
    );
  }

  inspect(cronJobs: CronJobModel[]) {
    const now = new Date();

    cronJobs.forEach((cronJob) => {
      const nextTime = this.getNextTime(cronJob, now);
      if (nextTime) {
        this.logger.info(
          `cronJobs [${cronJob.id}] caching scheduled workflow [${cronJob.workflowKey}] will run at: ${new Date(nextTime).toISOString()}`,
        );
      } else {
        this.logger.info(`cronJobs [${cronJob.id}] workflow [${cronJob.workflowKey}] will not be scheduled`);
      }
      this.schedule(cronJob, nextTime, nextTime >= now.getTime());
    });
  }

  getNextTime(cronJob: CronJobModel, currentDate: Date, nextSecond = false) {
    if (cronJob.limit && cronJob.limitExecuted >= cronJob.limit) {
      return null;
    }
    if (!cronJob.startsOn) {
      return null;
    }
    currentDate.setMilliseconds(nextSecond ? 1000 : 0);
    const timestamp = currentDate.getTime();
    const startTime = parseDateWithoutMs(cronJob.startsOn);
    if (startTime > timestamp) {
      return startTime;
    }
    if (cronJob.repeat) {
      const endTime = cronJob.endsOn ? parseDateWithoutMs(cronJob.endsOn) : null;
      if (endTime && endTime < timestamp) {
        return null;
      }
      if (cronJob.repeat && isNaN(+cronJob.repeat)) {
        const interval = parser.parseExpression(cronJob.repeat, { currentDate });
        const next = interval.next();
        return next.getTime();
      } else if (!isNaN(+cronJob.repeat)) {
        const repeat = +cronJob.repeat;
        const next = timestamp + repeat - ((timestamp - startTime) % repeat);
        return next;
      } else {
        return null;
      }
    } else {
      if (startTime < timestamp) {
        return null;
      }
      return timestamp;
    }
  }

  schedule(cronJob: CronJobModel, nextTime: number, toggle = true) {
    if (toggle) {
      const key = `${cronJob.id}@${nextTime}`;
      if (!this.timers.has(key)) {
        const interval = Math.max(nextTime - Date.now(), 0);
        if (interval > MAX_SAFE_INTERVAL) {
          this.timers.set(
            key,
            setTimeout(() => {
              this.timers.delete(key);
              this.schedule(cronJob, nextTime);
            }, MAX_SAFE_INTERVAL),
          );
        } else {
          this.timers.set(key, setTimeout(this.trigger.bind(this, cronJob.id, nextTime), interval));
        }
      }
    } else {
      for (const [key, timer] of this.timers.entries()) {
        if (key.startsWith(`${cronJob.id}@`)) {
          clearTimeout(timer);
          this.timers.delete(key);
        }
      }
    }
  }

  async trigger(cronJobId: number, time: number) {
    try {
      const cronJob = (await this.db
        .getRepository(DATABASE_CRON_JOBS)
        .findOne({ filterByTk: cronJobId })) as CronJobModel;

      if (!cronJob) {
        this.logger.warn(`Scheduled cron job ${cronJobId} no longer exists`);
        const eventKey = `${cronJobId}@${time}`;
        this.timers.delete(eventKey);
        return;
      }
      const eventKey = `${cronJob.id}@${time}`;
      this.timers.delete(eventKey);

      // TODO: 保存pluginWorkflow
      const pluginWorkflow = this.app.getPlugin(PluginWorkflow) as PluginWorkflow;

      const workflow = await this.db.getRepository('workflows').findOne({
        filter: { key: cronJob.workflowKey, enabled: true },
      });
      if (!workflow) {
        return;
      }

      let error = null;
      let process: Processor | null = null;
      try {
        process = (await pluginWorkflow.trigger(workflow, { date: new Date(time) }, { eventKey })) as Processor;
      } catch (e) {
        error = e;
        this.logger.error(`cronJobs [${cronJob.id}] workflow [${cronJob.workflowKey}] failed: ${e.message}`);
      } finally {
        if (!error && (process?.execution?.status === EXECUTION_STATUS.QUEUEING || process?.execution?.status >= 0)) {
          await cronJob.increment(['limitExecuted', 'allExecuted', 'successExecuted']);
          cronJob.update({
            lastTime: new Date(),
          });
        } else {
          await cronJob.increment(['limitExecuted', 'allExecuted']);
          cronJob.update({
            lastTime: new Date(),
          });
        }
      }

      if (!cronJob.repeat || (cronJob.limit && cronJob.limitExecuted >= cronJob.limit)) {
        return;
      }

      const nextTime = this.getNextTime(cronJob, new Date(), true);
      if (nextTime) {
        this.schedule(cronJob, nextTime);
      }
    } catch (e) {
      this.logger.error(`cronJobs [${cronJobId}] failed: ${e.message}`);
    }
  }

  on(cronJob: CronJobModel) {
    this.inspect([cronJob]);
  }

  off(cronJob: CronJobModel) {
    this.schedule(cronJob, null, false);
  }
}
