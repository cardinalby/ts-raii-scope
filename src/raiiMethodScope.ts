import { scopeStack } from './scopeStack';

// noinspection JSUnusedGlobalSymbols
export function SyncRaiiMethodScope(
    target: object,
    propertyName: string,
    propertyDescriptor: PropertyDescriptor,
): PropertyDescriptor {
    const method = propertyDescriptor.value;
    if (method) {
        propertyDescriptor.value = function(...args: any[]) {
            const raiiScope = scopeStack.enterScope(false);
            try {
                return method.call(target, ...args);
            } finally {
                scopeStack.exitScope(raiiScope);
            }
        };
    }
    return propertyDescriptor;
}

// noinspection JSUnusedGlobalSymbols
export function AsyncRaiiMethodScope<TArgs, TResult>(
    target: object,
    propertyName: string,
    propertyDescriptor: TypedPropertyDescriptor<(...args: TArgs[]) => Promise<TResult>>,
): TypedPropertyDescriptor<(...args: TArgs[]) => Promise<TResult>> {
    const method = propertyDescriptor.value;
    if (method) {
        propertyDescriptor.value = function(...args: TArgs[]): Promise<TResult> {
            const raiiScope = scopeStack.enterScope(true);
            const methodPromise = method.call(target, ...args);
            scopeStack.exitScope(raiiScope);

            return methodPromise.then(
                async result => {
                    await scopeStack.asyncScopeDone(raiiScope);
                    return result;
                },
                async reason => {
                    await scopeStack.asyncScopeDone(raiiScope);
                    throw reason;
                },
            );
        };
    }
    return propertyDescriptor;
}
