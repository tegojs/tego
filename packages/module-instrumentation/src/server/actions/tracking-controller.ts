import { Context, Next } from '@tachybase/actions';
import { Action, Controller } from '@tachybase/utils';

import { getDailyActiveUser } from '../hooks/getActiveUser';
import { getDataByEventFrequency } from '../hooks/getQueryResult';
import { countDataByEventFrequency, groupDataByTime } from '../hooks/getStatistics';

@Controller('instrumentation')
export class TrackingController {
  @Action('create', { acl: 'public' })
  async create(ctx: Context, next: () => Promise<any>) {
    const repo = await ctx.db.getRepository('trackingEvents');
    const version = process.env.npm_package_version;
    const currentTime = new Date().toISOString();
    const currentUserId = ctx.auth?.user?.id || null;
    const values = ctx.action.params.values.values
      ? {
          ...ctx.action.params.values,
          values: {
            meta: {
              userId: currentUserId,
              createdAt: currentTime,
            },
            payload: {
              ...ctx.action.params.values.values,
              version,
            },
          },
        }
      : { ...ctx.action.params.values, createdAt: currentTime };
    await repo.create({
      values,
    });
    return next();
  }

  @Action('list', { acl: 'private' })
  async list(ctx: Context, next: () => Promise<any>) {
    const userCount = await ctx.db.getRepository('users').count();
    const ActiveUsers = await getDailyActiveUser(ctx);
    const allData = await ctx.db.getRepository('trackingEvents').find();
    const configs = await ctx.db.getRepository('statisticsConfig').find();
    const historyConfigs = await ctx.db.getRepository('trackingHistoryOptions').find();
    let customData = {};
    let customDataByTime = {};
    for (const config of configs) {
      if (config.statisticsOptions?.collection) {
        try {
          const collectionName = config.statisticsOptions.collection.trim();
          if (!collectionName) {
            throw new Error('Collection name is empty or invalid.');
          }

          const collectionFilter = config.statisticsOptions.collectionFilter;
          if (collectionFilter && typeof collectionFilter !== 'object') {
            throw new Error('Collection filter is invalid. It must be an object.');
          }

          const count = await ctx.db.getRepository(collectionName).count({
            filter: collectionFilter || {},
          });

          customData[config.title] = count;
        } catch (error) {
          console.error(
            `Error fetching count for collection "${config.statisticsOptions?.collection}":`,
            error.message,
          );
          customData[config.title] = 0;
        }
      } else {
        // if (config.statisticsOptions?.timeGroup) {
        //   const grouped = groupDataByTime(allData, config.statisticsOptions);
        //   customDataByTime[config.title] = grouped;
        // } else {
        const count = countDataByEventFrequency(allData, config.statisticsOptions);
        customData[config.title] = count;
        // }
      }
    }

    for (const historyConfig of historyConfigs) {
      if (historyConfig.historyOptions?.timeGroup) {
        const grouped = groupDataByTime(allData, historyConfig.historyOptions);
        customDataByTime[historyConfig.title] = grouped;
      }
    }

    const result = {
      users: { ...ActiveUsers, userCount },
      customData,
      customDataByTime,
    };
    ctx.body = result;
    return next();
  }

  @Action('query', { acl: 'private' })
  async query(ctx: Context, next: () => Promise<any>) {
    const { values: configs } = ctx.action.params;
    const allData = await ctx.db.getRepository('trackingEvents').find();
    const queryResult = getDataByEventFrequency(allData, configs);
    ctx.body = queryResult;
    return next();
  }
}
