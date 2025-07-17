import { execSync } from 'node:child_process';
import { DumpRulesGroupType } from '@tachybase/database';
import { Plugin } from '@tachybase/server';

import parser from 'cron-parser';

import { COLLECTION_AUTOBACKUP } from '../constants';
import { Dumper } from './dumper';
import { AutoBackupModel } from './model/AutoBackupModel';
import backupFilesResourcer from './resourcers/backup-files';
import { cleanOldFiles } from './utils/files';

function parseDateWithoutMs(date: Date) {
  return Math.floor(date.getTime() / 1000) * 1000;
}

const MAX_SAFE_INTERVAL = 2147483647;
export default class PluginBackupRestoreServer extends Plugin {
  private static readonly inspectFields = ['repeat', 'enabled'];
  beforeLoad() {
    this.app.acl.registerSnippet({
      name: `pm.${this.name}.files`,
      actions: ['backupFiles:*'],
    });
    this.app.acl.registerSnippet({
      name: `pm.${this.name}.auto`,
      actions: ['autoBackup:*'],
    });
  }

  private timers: Map<string, NodeJS.Timeout | null> = new Map();

  async load() {
    this.app.resourcer.define(backupFilesResourcer);
    this.app.on('afterStart', async (app) => {
      const cronJobs = await app.db.getRepository(COLLECTION_AUTOBACKUP).find({
        filter: { enabled: true },
      });
      this.inspect(cronJobs);
    });

    this.app.on('beforeStop', () => {
      for (const timer of this.timers.values()) {
        clearInterval(timer);
      }
    });

    this.db.on(`${COLLECTION_AUTOBACKUP}.beforeSave`, async (cronjob: AutoBackupModel, options) => {
      // 仅监听部分字段变化
      let changed = false;
      for (const field of options.fields) {
        if (PluginBackupRestoreServer.inspectFields.includes(field)) {
          changed = true;
          break;
        }
      }
      if (!changed) {
        return;
      }
      this.off(cronjob);
    });

    this.db.on(`${COLLECTION_AUTOBACKUP}.afterSave`, async (cronjob: AutoBackupModel, options) => {
      // 仅监听部分字段变化
      let changed = false;
      for (const field of options.fields) {
        if (PluginBackupRestoreServer.inspectFields.includes(field)) {
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

    this.db.on(`${COLLECTION_AUTOBACKUP}.afterDestroy`, async (cronjob) => {
      this.off(cronjob);
    });
  }

  inspect(cronJobs: AutoBackupModel[]) {
    const now = new Date();

    cronJobs.forEach((cronJob) => {
      const nextTime = this.getNextTime(cronJob, now);
      if (nextTime) {
        this.app.logger.info(
          `cronJobs [${cronJob.id}] caching scheduled will run at: ${new Date(nextTime).toISOString()}`,
        );
      } else {
        this.app.logger.info(`cronJobs [${cronJob.id}] will not be scheduled`);
      }
      this.schedule(cronJob, nextTime, nextTime >= now.getTime());
    });
  }

  getNextTime(cronJob: AutoBackupModel, currentDate: Date, nextSecond = false) {
    currentDate.setMilliseconds(nextSecond ? 1000 : 0);
    const timestamp = currentDate.getTime();
    const startTime = parseDateWithoutMs(cronJob.startsOn || new Date());
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

  schedule(cronJob: AutoBackupModel, nextTime: number, toggle = true) {
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
        .getRepository(COLLECTION_AUTOBACKUP)
        .findOne({ filterByTk: cronJobId })) as AutoBackupModel;

      if (!cronJob) {
        this.app.logger.warn(`Scheduled cron job ${cronJobId} no longer exists`);
        const eventKey = `${cronJobId}@${time}`;
        this.timers.delete(eventKey);
        return;
      }
      const eventKey = `${cronJob.id}@${time}`;
      this.timers.delete(eventKey);

      try {
        const dumper = new Dumper(this.app);
        if (this.app.worker.available) {
          const filename = await dumper.getLockFile(this.app.name);
          this.app.worker
            .callPluginMethod({
              plugin: PluginBackupRestoreServer,
              method: 'workerCreateBackUp',
              params: {
                dataTypes: cronJob.dumpRules,
                appName: this.app.name,
                filename,
              },
              // 目前限制方法并发为1
              concurrency: 1,
            })
            .finally(() => {
              dumper.cleanLockFile(filename, this.app.name);
              const dirPath = dumper.backUpStorageDir(this.app.name);
              // 删除最旧的备份文件
              cleanOldFiles(dumper.backUpStorageDir(this.app.name), cronJob.maxNumber)
                .then(() => {
                  this.app.logger.info(`clean backup ${dirPath} to count: ${cronJob.maxNumber}`);
                })
                .catch((err) => {
                  this.app.logger.error('clean backup error', err);
                });
            });
        } else {
          this.app.logger.warn('auto backup skip, worker count: 0');
        }
      } catch (e) {
        this.app.logger.error(e);
      }

      const nextTime = this.getNextTime(cronJob, new Date(), true);
      if (nextTime) {
        this.schedule(cronJob, nextTime);
      }
    } catch (e) {
      this.app.logger.error(`cronJobs [${cronJobId}] failed: ${e.message}`);
    }
  }

  on(cronJob: AutoBackupModel) {
    this.inspect([cronJob]);
  }

  off(cronJob: AutoBackupModel) {
    this.schedule(cronJob, null, false);
  }

  async workerCreateBackUp(data: { dataTypes: string[]; appName: string; filename: string }) {
    await new Dumper(this.app).runDumpTask({
      groups: new Set(data.dataTypes) as Set<DumpRulesGroupType>,
      appName: data.appName,
      fileName: data.filename,
    });
  }
}
