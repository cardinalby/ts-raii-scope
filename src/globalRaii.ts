import { IDisposable } from '../types/disposable';
import { RaiiScope } from './raiiScope';
import { scopeStack } from './scopeStack';

class GlobalRaii {
    // noinspection JSUnusedGlobalSymbols
    // noinspection JSMethodCanBeStatic
    public push<T extends IDisposable>(resource: T): T {
        return scopeStack.pushToTopScope(resource);
    }

    // noinspection JSUnusedGlobalSymbols
    // noinspection JSMethodCanBeStatic
    public saveCurrentAsyncScope(): RaiiScope {
        return scopeStack.saveCurrentAsyncScope();
    }
}

export const raii = new GlobalRaii();
