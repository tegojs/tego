import { Sequelize, Transaction } from 'sequelize';

import { dispatchAssociationEvents, withDeferredAssociationEvents } from '../association-events';

describe('deferred association event dispatch', () => {
  it('queues concurrent writes but dispatches writes descended from the active listener immediately', async () => {
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const transaction = new Transaction(sequelize, {});
    const owner = {};
    const events: string[] = [];
    let eventsBeforeListenerRelease: string[];
    let listenerStarted: () => void;
    let releaseListener: () => void;
    const started = new Promise<void>((resolve) => {
      listenerStarted = resolve;
    });
    const released = new Promise<void>((resolve) => {
      releaseListener = resolve;
    });

    try {
      await withDeferredAssociationEvents(owner, sequelize, transaction, async (flush) => {
        await dispatchAssociationEvents(owner, transaction, async () => {
          events.push('listener:start');
          listenerStarted();
          await released;
          await dispatchAssociationEvents(owner, transaction, async () => {
            events.push('listener:descendant');
          });
          events.push('listener:end');
        });

        const flushing = flush();
        await started;
        await dispatchAssociationEvents(owner, transaction, async () => {
          events.push('callback:concurrent');
        });

        eventsBeforeListenerRelease = [...events];
        releaseListener();
        await flushing;
      });

      expect(eventsBeforeListenerRelease).toEqual(['listener:start']);
      expect(events).toEqual(['listener:start', 'listener:descendant', 'listener:end', 'callback:concurrent']);
    } finally {
      releaseListener?.();
      await sequelize.close();
    }
  });

  it('keeps an outer listener active while a nested owner scope is flushing', async () => {
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const transaction = new Transaction(sequelize, {});
    const ownerA = {};
    const ownerB = {};
    const events: string[] = [];

    try {
      await withDeferredAssociationEvents(ownerA, sequelize, transaction, async (flushA) => {
        await dispatchAssociationEvents(ownerA, transaction, async () => {
          events.push('a:start');
          await withDeferredAssociationEvents(ownerB, sequelize, transaction, async (flushB) => {
            await dispatchAssociationEvents(ownerB, transaction, async () => {
              await dispatchAssociationEvents(ownerA, transaction, async () => {
                events.push('a:descendant');
              });
            });
            await flushB();
          });
          events.push('a:end');
        });
        await flushA();
      });

      expect(events).toEqual(['a:start', 'a:descendant', 'a:end']);
    } finally {
      await sequelize.close();
    }
  });

  it('queues async continuations that resume after their listener has settled', async () => {
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const transaction = new Transaction(sequelize, {});
    const owner = {};
    const events: string[] = [];
    let resumeContinuation: () => void;
    let continuationStarted: () => void;
    let continuationTask: Promise<void>;
    const continuation = new Promise<void>((resolve) => {
      resumeContinuation = resolve;
    });
    const started = new Promise<void>((resolve) => {
      continuationStarted = resolve;
    });

    try {
      await withDeferredAssociationEvents(owner, sequelize, transaction, async (flush) => {
        await dispatchAssociationEvents(owner, transaction, async () => {
          continuationTask = (async () => {
            await continuation;
            await dispatchAssociationEvents(owner, transaction, async () => {
              events.push('late:descendant');
            });
          })();
          continuationStarted();
        });

        const flushing = flush();
        await started;
        await flushing;
        resumeContinuation();
        await continuationTask;

        expect(events).toEqual([]);
        await flush();
      });

      expect(events).toEqual(['late:descendant']);
    } finally {
      resumeContinuation?.();
      await sequelize.close();
    }
  });
});
