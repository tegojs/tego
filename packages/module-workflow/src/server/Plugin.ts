import path from 'path';
import { Op, Transactionable } from '@tachybase/database';
import { Logger, LoggerOptions } from '@tachybase/logger';
import Application, { Plugin, PluginOptions } from '@tachybase/server';
import { Registry } from '@tachybase/utils';

import { LRUCache } from 'lru-cache';

import initActions from './actions';
import { EXECUTION_STATUS, JOB_STATUS } from './constants';
import PluginWorkflowJSParseServer from './features/_deprecated-js-parse/plugin';
import PluginWorkflowJSONParseServer from './features/_deprecated-json-parse/plugin';
import { PluginAggregate } from './features/aggregate/Plugin';
import { PluginDelay } from './features/delay/Plugin';
import { PluginDynamicCalculation } from './features/dynamic-calculation/Plugin';
import { PluginInterception } from './features/interception';
import { PluginLoop } from './features/loop/Plugin';
import { PluginManual } from './features/manual/Plugin';
import PluginWorkflowNoticeServer from './features/notice/plugin';
import { PluginOmniTrigger } from './features/omni-trigger';
import { PluginParallel } from './features/parallel/Plugin';
import { PluginRequest } from './features/request/Plugin';
import { PluginResponse } from './features/response';
import PluginWorkflowDataMappingServer from './features/script/plugin';
import { PluginSql } from './features/sql/Plugin';
import { PluginTriggerInstruction } from './features/trigger-instruction/plugin';
import { PluginVariables } from './features/variables';
import initFunctions, { CustomFunction } from './functions';
import { Instruction, InstructionInterface } from './instructions';
import CalculationInstruction from './instructions/CalculationInstruction';
import ConditionInstruction from './instructions/ConditionInstruction';
import CreateInstruction from './instructions/CreateInstruction';
import DestroyInstruction from './instructions/DestroyInstruction';
import EndInstruction from './instructions/EndInstruction';
import QueryInstruction from './instructions/QueryInstruction';
import UpdateInstruction from './instructions/UpdateInstruction';
import UpdateOrCreateInstruction from './instructions/UpdateOrCreateInstruction';
import Processor from './Processor';
import Trigger from './triggers';
import CollectionTrigger from './triggers/CollectionTrigger';
import ScheduleTrigger from './triggers/ScheduleTrigger';
import type { ExecutionModel, JobModel, WorkflowModel } from './types';

type ID = number | string;

type Pending = [ExecutionModel, JobModel?];

type CachedEvent = [WorkflowModel, any, { context?: any }];

export default class PluginWorkflowServer extends Plugin {
  instructions: Registry<InstructionInterface> = new Registry();
  triggers: Registry<Trigger> = new Registry();
  functions: Registry<CustomFunction> = new Registry();
  enabledCache: Map<number, WorkflowModel> = new Map();

  private ready = false;
  private executing: Promise<void> | null = null;
  private pending: Pending[] = [];
  private events: CachedEvent[] = [];
  private eventsCount = 0;

  private loggerCache: LRUCache<string, Logger>;
  private meter = null;

  constructor(app: Application, options?: PluginOptions) {
    super(app, options);
    this.addFeature(PluginSql);
    this.addFeature(PluginRequest);
    this.addFeature(PluginParallel);
    this.addFeature(PluginManual);
    this.addFeature(PluginLoop);
    this.addFeature(PluginDynamicCalculation);
    this.addFeature(PluginDelay);
    this.addFeature(PluginAggregate);
    this.addFeature(PluginWorkflowJSONParseServer);
    this.addFeature(PluginWorkflowJSParseServer);
    this.addFeature(PluginWorkflowDataMappingServer);
    this.addFeature(PluginInterception);
    this.addFeature(PluginVariables);
    this.addFeature(PluginResponse);
    this.addFeature(PluginOmniTrigger);
    this.addFeature(PluginTriggerInstruction);
    this.addFeature(PluginWorkflowNoticeServer);
  }

  getLogger(workflowId: ID): Logger {
    const now = new Date();
    const date = `${now.getFullYear()}-${`0${now.getMonth() + 1}`.slice(-2)}-${`0${now.getDate()}`.slice(-2)}`;
    const key = `${date}-${workflowId}}`;
    if (this.loggerCache.has(key)) {
      return this.loggerCache.get(key);
    }

    const logger = this.createLogger({
      dirname: path.join('workflows', date),
      filename: `${workflowId}.log`,
      transports: process.env.APP_ENV !== 'production' ? ['console'] : ['file'],
    } as LoggerOptions);

    this.loggerCache.set(key, logger);

    return logger;
  }

  isWorkflowSync(workflow: WorkflowModel) {
    const trigger = this.triggers.get(workflow.type);
    if (!trigger) {
      throw new Error(`invalid trigger type ${workflow.type} of workflow ${workflow.id}`);
    }
    return trigger.sync ?? workflow.sync;
  }

  private onBeforeSave = async (instance: WorkflowModel, options) => {
    const Model = <typeof WorkflowModel>instance.constructor;

    if (instance.enabled) {
      instance.set('current', true);
    } else if (!instance.current) {
      const count = await Model.count({
        where: {
          key: instance.key,
        },
        transaction: options.transaction,
      });
      if (!count) {
        instance.set('current', true);
      }
    }

    if (!instance.changed('enabled') || !instance.enabled) {
      return;
    }

    const previous = await Model.findOne({
      where: {
        key: instance.key,
        current: true,
        id: {
          [Op.ne]: instance.id,
        },
      },
      transaction: options.transaction,
    });

    if (previous) {
      // NOTE: set to `null` but not `false` will not violate the unique index
      await previous.update(
        { enabled: false, current: null },
        {
          transaction: options.transaction,
          hooks: false,
        },
      );

      this.toggle(previous, false);
    }
  };

  registerTrigger<T extends Trigger>(type: string, trigger: T | { new (p: Plugin): T }) {
    if (typeof trigger === 'function') {
      this.triggers.register(type, new trigger(this));
    } else if (trigger) {
      this.triggers.register(type, trigger);
    } else {
      throw new Error('invalid trigger type to register');
    }
  }

  registerInstruction(type: string, instruction: InstructionInterface | { new (p: Plugin): InstructionInterface }) {
    if (typeof instruction === 'function') {
      this.instructions.register(type, new instruction(this));
    } else if (instruction) {
      this.instructions.register(type, instruction);
    } else {
      throw new Error('invalid instruction type to register');
    }
  }

  private initTriggers<T extends Trigger>(more: { [key: string]: T | { new (p: Plugin): T } } = {}) {
    this.registerTrigger('collection', CollectionTrigger);
    this.registerTrigger('schedule', ScheduleTrigger);

    for (const [name, trigger] of Object.entries(more)) {
      this.registerTrigger(name, trigger);
    }
  }

  private initInstructions<T extends Instruction>(more: { [key: string]: T | { new (p: Plugin): T } } = {}) {
    this.registerInstruction('calculation', CalculationInstruction);
    this.registerInstruction('condition', ConditionInstruction);
    this.registerInstruction('end', EndInstruction);
    this.registerInstruction('create', CreateInstruction);
    this.registerInstruction('updateorcreate', UpdateOrCreateInstruction);
    this.registerInstruction('destroy', DestroyInstruction);
    this.registerInstruction('query', QueryInstruction);
    this.registerInstruction('update', UpdateInstruction);

    for (const [name, instruction] of Object.entries({ ...more })) {
      this.registerInstruction(name, instruction);
    }
  }

  async load() {
    const { db, options } = this;

    initActions(this);
    this.initTriggers(options.triggers);
    this.initInstructions(options.instructions);
    initFunctions(this, options.functions);

    this.loggerCache = new LRUCache({
      max: 20,
      updateAgeOnGet: true,
      dispose(logger) {
        (<Logger>logger).end();
      },
    });

    // this.meter = this.app.telemetry.metric.getMeter();
    // const counter = this.meter.createObservableGauge('workflow.events.counter');
    // counter.addCallback((result) => {
    //   result.observe(this.eventsCount);
    // });

    this.app.acl.registerSnippet({
      name: `pm.${this.name}.workflows`,
      actions: [
        'workflows:*',
        'workflows.nodes:*',
        'executions:list',
        'executions:get',
        'executions:cancel',
        'executions:retry',
        'flow_nodes:update',
        'flow_nodes:destroy',
        'flow_nodes:moveUp',
        'flow_nodes:moveDown',
        'workflowCategories:*',
      ],
    });

    this.app.acl.registerSnippet({
      name: 'ui.*',
      actions: ['workflows:list'],
    });

    this.app.acl.allow('workflows', ['trigger', 'list'], 'loggedIn');
    // this.app.acl.allow('flow_nodes', ['moveUp', 'moveDown'], 'loggedIn');

    db.on('workflows.beforeSave', this.onBeforeSave);
    db.on('workflows.afterSave', (model: WorkflowModel) => this.toggle(model));
    db.on('workflows.afterDestroy', (model: WorkflowModel) => this.toggle(model, false));

    // [Life Cycle]:
    //   * load all workflows in db
    //   * add all hooks for enabled workflows
    //   * add hooks for create/update[enabled]/delete workflow to add/remove specific hooks
    this.app.on('beforeStart', async () => {
      const collection = db.getCollection('workflows');
      const workflows = await collection.repository.find({
        filter: { enabled: true },
      });

      workflows.forEach((workflow: WorkflowModel) => {
        this.toggle(workflow);
      });
    });

    this.app.on('afterStart', () => {
      this.app.setMaintainingMessage('check for not started executions');
      this.ready = true;
      // check for not started executions
      this.dispatch();
    });

    this.app.on('beforeStop', async () => {
      const repository = db.getRepository('workflows');
      const workflows = await repository.find({
        filter: { enabled: true },
      });

      workflows.forEach((workflow: WorkflowModel) => {
        this.toggle(workflow, false);
      });

      this.ready = false;
      if (this.events.length) {
        await this.prepare();
      }
      if (this.executing) {
        await this.executing;
      }
    });

    this.db.on('webhooks.afterCreate', this.removeWebhooksCache.bind(this));
    this.db.on('webhooks.afterUpdate', this.removeWebhooksCache.bind(this));
    this.db.on('webhooks.afterDestroy', this.removeWebhooksCache.bind(this));
  }

  async removeWebhooksCache() {
    this.app.cache.del('webhooks');
  }

  toggle(workflow: WorkflowModel, enable?: boolean) {
    const type = workflow.get('type');
    const trigger = this.triggers.get(type);
    if (!trigger) {
      this.getLogger(workflow.id).error(`trigger type ${workflow.type} of workflow ${workflow.id} is not implemented`);
      return;
    }
    if (enable ?? workflow.get('enabled')) {
      // NOTE: remove previous listener if config updated
      const prev = workflow.previous();
      if (prev.config) {
        trigger.off({ ...workflow.get(), ...prev });
      }
      trigger.on(workflow);
      this.enabledCache.set(workflow.id, workflow);
    } else {
      trigger.off(workflow);
      this.enabledCache.delete(workflow.id);
    }
  }

  public trigger(
    workflow: WorkflowModel,
    context: object,
    options: { [key: string]: any } & Transactionable = {},
  ): void | Promise<Processor | null> {
    const logger = this.getLogger(workflow.id);
    if (!this.ready) {
      logger.warn(`app is not ready, event of workflow ${workflow.id} will be ignored`);
      logger.debug(`ignored event data:`, context);
      return;
    }
    // `null` means not to trigger
    if (context == null) {
      logger.warn(`workflow ${workflow.id} event data context is null, event will be ignored`);
      return;
    }

    if (this.isWorkflowSync(workflow)) {
      return this.triggerSync(workflow, context, options);
    }

    const { transaction, ...rest } = options;
    this.events.push([workflow, context, rest]);
    this.eventsCount = this.events.length;

    logger.info(`new event triggered, now events: ${this.events.length}`);
    logger.debug(`event data:`, { context });

    if (this.events.length > 1) {
      return;
    }

    // NOTE: no await for quick return
    setTimeout(this.prepare);
  }

  private async triggerSync(
    workflow: WorkflowModel,
    context: object,
    options: { [key: string]: any } & Transactionable = {},
  ): Promise<Processor | null> {
    let execution;
    try {
      execution = await this.createExecution(workflow, context, options);
    } catch (err) {
      this.getLogger(workflow.id).error(`creating execution failed: ${err.message}`, err);
      return null;
    }

    try {
      return this.process(execution, null, options);
    } catch (err) {
      this.getLogger(execution.workflowId).error(`execution (${execution.id}) error: ${err.message}`, err);
    }
    return null;
  }

  public async resume(job: JobModel) {
    if (!job.execution) {
      job.execution = await job.getExecution();
    }
    this.getLogger(job.execution.workflowId).info(
      `execution (${job.execution.id}) resuming from job (${job.id}) added to pending list`,
    );
    this.pending.push([job.execution, job]);
    this.dispatch();
  }

  public createProcessor(execution: ExecutionModel, options = {}): Processor {
    return new Processor(execution, { ...options, plugin: this });
  }

  private async createExecution(workflow: WorkflowModel, context, options): Promise<ExecutionModel | null> {
    const { transaction = await this.db.sequelize.transaction() } = options;
    const sameTransaction = options.transaction === transaction;
    const trigger = this.triggers.get(workflow.type);
    const valid = await trigger.validateEvent(workflow, context, { ...options, transaction });
    if (!valid) {
      if (!sameTransaction) {
        await transaction.commit();
      }
      return null;
    }

    let execution;
    try {
      execution = await workflow.createExecution(
        {
          context,
          key: workflow.key,
          status: EXECUTION_STATUS.QUEUEING,
          parentNode: options.parentNode || null,
          parentId: options.parent ? options.parent.id : null,
        },
        { transaction },
      );
    } catch (err) {
      if (!sameTransaction) {
        await transaction.rollback();
      }
      throw err;
    }

    this.getLogger(workflow.id).info(`execution of workflow ${workflow.id} created as ${execution.id}`);

    await workflow.increment(['executed', 'allExecuted'], { transaction });
    // NOTE: https://sequelize.org/api/v6/class/src/model.js~model#instance-method-increment
    if (this.db.options.dialect !== 'postgres') {
      await workflow.reload({ transaction });
    }

    await (<typeof WorkflowModel>workflow.constructor).update(
      {
        allExecuted: workflow.allExecuted,
      },
      {
        where: {
          key: workflow.key,
        },
        transaction,
      },
    );

    if (!sameTransaction) {
      await transaction.commit();
    }

    execution.workflow = workflow;

    return execution;
  }

  private prepare = async () => {
    if (this.executing && this.db.options.dialect === 'sqlite') {
      await this.executing;
    }

    const event = this.events.shift();
    this.eventsCount = this.events.length;
    if (!event) {
      this.getLogger('dispatcher').warn(`events queue is empty, no need to prepare`);
      return;
    }

    const logger = this.getLogger(event[0].id);
    logger.info(`preparing execution for event`);

    try {
      const execution = await this.createExecution(...event);
      // NOTE: cache first execution for most cases
      if (execution && !this.executing && !this.pending.length) {
        this.pending.push([execution]);
      }
    } catch (err) {
      logger.error(`failed to create execution: ${err.message}`, err);
      // this.events.push(event); // NOTE: retry will cause infinite loop
    }

    if (this.events.length) {
      await this.prepare();
    } else {
      this.dispatch();
    }
  };

  private dispatch() {
    if (!this.ready) {
      this.getLogger('dispatcher').warn(`app is not ready, new dispatching will be ignored`);
      return;
    }

    if (this.executing) {
      this.getLogger('dispatcher').warn(`workflow executing is not finished, new dispatching will be ignored`);
      return;
    }

    if (this.events.length) {
      return this.prepare();
    }

    this.executing = (async () => {
      let next: Pending | null = null;
      // resuming has high priority
      if (this.pending.length) {
        next = this.pending.shift() as Pending;
        this.getLogger(next[0].workflowId).info(`pending execution (${next[0].id}) ready to process`);
      } else {
        const execution = (await this.db.getRepository('executions').findOne({
          filter: {
            status: EXECUTION_STATUS.QUEUEING,
            'workflow.enabled': true,
            'workflow.id': {
              [Op.not]: null,
            },
          },
          appends: ['workflow'],
          sort: 'createdAt',
        })) as ExecutionModel;
        if (execution) {
          this.getLogger(execution.workflowId).info(`execution (${execution.id}) fetched from db`);
          next = [execution];
        }
      }
      if (next) {
        await this.process(...next);
      }

      this.executing = null;

      if (next) {
        this.dispatch();
      }
    })();
  }

  private async process(execution: ExecutionModel, job?: JobModel, options: Transactionable = {}): Promise<Processor> {
    if (execution.status === EXECUTION_STATUS.QUEUEING) {
      await execution.update({ status: EXECUTION_STATUS.STARTED }, { transaction: options.transaction });
    }
    const logger = this.getLogger(execution.workflowId);
    const processor = this.createProcessor(execution, options);

    logger.info(`execution (${execution.id}) ${job ? 'resuming' : 'starting'}...`);

    // this.emit('beforeProcess', processor);

    try {
      await (job ? processor.resume(job) : processor.start());
      logger.info(`execution (${execution.id}) finished with status: ${execution.status}`, { execution });
      if (execution.status !== 0) {
        const executionDuration = execution.updatedAt.getTime() - execution.createdAt.getTime();
        await execution.update({ executionCost: executionDuration }, { transaction: options.transaction });
      }
      if (execution.status && execution.parentNode) {
        // 根据parentId找到parent
        const { database } = <typeof ExecutionModel>execution.constructor;
        const { model } = database.getCollection('executions');
        const parent = (await model.findByPk(execution.parentId, options)) as ExecutionModel;
        const jobs = await parent.getJobs();
        const job = jobs.find((v) => v.status === JOB_STATUS.PENDING && v.nodeId === execution.parentNode);
        if (job) {
          const lastSavedJob = processor.lastSavedJob;
          job.status = execution.status;
          // 为了防止没有返回值导致错误, 取默认输入值
          job.result = lastSavedJob.result || execution.context;
          await this.resume(job);
        } else {
          logger.error(`execution (${execution.id}) error: parent job not found`);
        }
      }
    } catch (err) {
      logger.error(`execution (${execution.id}) error: ${err.message}`, err);
    }

    // this.emit('afterProcess', processor);

    return processor;
  }

  useDataSourceTransaction(dataSourceName = 'main', transaction, create = false) {
    // @ts-ignore
    const { db } = this.app.dataSourceManager.dataSources.get(dataSourceName).collectionManager;
    if (!db) {
      return;
    }
    if (db.sequelize === transaction?.sequelize) {
      return transaction;
    }
    if (create) {
      return db.sequelize.transaction();
    }
  }
}
