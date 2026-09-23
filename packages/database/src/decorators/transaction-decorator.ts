import lodash from 'lodash';

export function transactionWrapperBuilder(transactionGenerator) {
  return function transaction(transactionInjector?) {
    return (originalMethod: any, context: ClassMethodDecoratorContext) => {
      const name = String(context.name);
      const oldValue = originalMethod;

      const newMethod = async function (...args: unknown[]) {
        let transaction;
        let newTransaction = false;

        if (args.length > 0 && typeof args[0] === 'object') {
          transaction = args[0]['transaction'];
        }

        if (!transaction) {
          transaction = await transactionGenerator.apply(this);
          newTransaction = true;
        }

        // 需要将 newTransaction 注入到被装饰函数参数内
        if (newTransaction) {
          try {
            let callArguments;
            if (lodash.isPlainObject(args[0])) {
              callArguments = {
                // @ts-ignore lodash type error
                ...args[0],
                transaction,
              };
            } else if (transactionInjector) {
              callArguments = transactionInjector(args, transaction);
            } else if (lodash.isNull(args[0]) || lodash.isUndefined(args[0])) {
              callArguments = {
                transaction,
              };
            } else {
              throw new Error(`please provide transactionInjector for ${name} call`);
            }

            const results = await oldValue.call(this, callArguments);

            await transaction.commit();

            return results;
          } catch (err) {
            console.error(err);
            await transaction.rollback();
            throw err;
          }
        } else {
          return oldValue.apply(this, args);
        }
      };

      return newMethod;
    };
  };
}
