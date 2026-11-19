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
});
