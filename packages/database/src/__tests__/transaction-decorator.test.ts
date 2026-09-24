import { transactionWrapperBuilder } from '../decorators/transaction-decorator';

function wrap(transaction: any, operation: () => Promise<string>) {
  const decorator = transactionWrapperBuilder(() => transaction)();
  return decorator(operation, { name: 'set' } as any);
}

describe('transaction wrapper errors', () => {
  it('preserves the commit failure instead of rolling back a finished transaction', async () => {
    const commitError = new Error('primary customer relationship required');
    const transaction = {
      finished: 'commit',
      commit: vi.fn().mockRejectedValue(commitError),
      rollback: vi.fn().mockRejectedValue(new Error('already committed')),
    };

    await expect(wrap(transaction, async () => 'ok').call({}, {})).rejects.toBe(commitError);
    expect(transaction.rollback).not.toHaveBeenCalled();
  });

  it('preserves the operation failure even when its rollback also fails', async () => {
    const operationError = new Error('write failed');
    const transaction = {
      finished: undefined,
      commit: vi.fn(),
      rollback: vi.fn().mockRejectedValue(new Error('rollback failed')),
    };

    await expect(
      wrap(transaction, async () => {
        throw operationError;
      }).call({}, {}),
    ).rejects.toBe(operationError);
    expect(transaction.rollback).toHaveBeenCalledOnce();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});
