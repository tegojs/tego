import { AsyncLocalStorage } from 'node:async_hooks';

import { Sequelize, Transaction } from 'sequelize';

interface AssociationEventScope {
  owner: object;
  sequelize: Sequelize;
  transaction: Transaction;
  pending: Array<() => Promise<void>>;
  flushing: boolean;
  closed: boolean;
  failed: boolean;
  error?: unknown;
}

const associationEvents = new AsyncLocalStorage<AssociationEventScope[]>();
const flushingAssociationEventScope = new AsyncLocalStorage<AssociationEventScope>();

function getAssociationEventScope(owner: object) {
  const scopes = associationEvents.getStore();
  if (!scopes) return;

  for (let index = scopes.length - 1; index >= 0; index--) {
    if (scopes[index].owner === owner) return scopes[index];
  }
}

function assertActiveTransaction(sequelize: Sequelize, transaction: Transaction) {
  const state = transaction as Transaction & { sequelize?: Sequelize; finished?: string };
  if (!(transaction instanceof Transaction) || state.sequelize !== sequelize || state.finished)
    throw new TypeError('Deferred association events require an active transaction from this database');
}

export function assertAssociationEventTransaction(owner: object, transaction: Transaction | null | undefined) {
  const scope = getAssociationEventScope(owner);
  if (!scope || scope.closed) return;
  assertActiveTransaction(scope.sequelize, scope.transaction);
  if (transaction !== scope.transaction)
    throw new TypeError('Deferred association writes must use their original transaction');
}

export async function dispatchAssociationEvents(owner: object, transaction: Transaction, emit: () => Promise<void>) {
  const scope = getAssociationEventScope(owner);
  if (!scope || scope.closed || flushingAssociationEventScope.getStore() === scope) return emit();
  assertAssociationEventTransaction(owner, transaction);
  scope.pending.push(emit);
}

/** Explicit, transaction-bound event staging. The caller alone owns commit and rollback. */
export async function withDeferredAssociationEvents<T>(
  owner: object,
  sequelize: Sequelize,
  transaction: Transaction,
  callback: (flush: () => Promise<void>) => Promise<T>,
): Promise<T> {
  if (typeof callback !== 'function') throw new TypeError('Deferred association events require a callback');
  assertActiveTransaction(sequelize, transaction);
  const scope: AssociationEventScope = {
    owner,
    sequelize,
    transaction,
    pending: [],
    flushing: false,
    closed: false,
    failed: false,
  };
  return associationEvents.run([...(associationEvents.getStore() || []), scope], async () => {
    let activeFlush: Promise<void> | undefined;
    const flush = (): Promise<void> => {
      try {
        const scopes = associationEvents.getStore();
        if (scopes?.[scopes.length - 1] !== scope || scope.closed || scope.flushing)
          throw new TypeError('Association events can only be flushed in their active scope');
        assertActiveTransaction(sequelize, transaction);
        if (scope.failed) throw scope.error;
      } catch (error) {
        return Promise.reject(error);
      }
      scope.flushing = true;
      activeFlush = (async () => {
        try {
          while (scope.pending.length) {
            const emit = scope.pending.shift()!;
            await flushingAssociationEventScope.run(scope, emit);
          }
        } catch (error) {
          scope.failed = true;
          scope.error = error;
          throw error;
        } finally {
          scope.flushing = false;
        }
      })();
      // The scope also observes failure when its caller forgets to await flush().
      void activeFlush.catch(() => {});
      return activeFlush;
    };
    try {
      const result = await callback(flush);
      await activeFlush;
      if (scope.failed) throw scope.error;
      if (scope.pending.length) throw new TypeError('Pending association events must be flushed before returning');
      return result;
    } finally {
      // Never let transaction-sensitive listeners escape the caller's scope.
      await activeFlush?.catch(() => {});
      scope.closed = true;
      scope.pending.length = 0;
    }
  });
}
