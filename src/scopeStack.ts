import { IDisposable } from '../types/disposable';
import { RaiiScope } from './raiiScope';

class ScopeStack {
    protected _syncStack: RaiiScope[] = [];
    // key: scope, value: was saved by client
    protected _asyncScopes = new Map<RaiiScope, boolean>();

    public enterScope(isAsync: boolean, scope?: RaiiScope): RaiiScope {
        if (!scope) {
            scope = new RaiiScope();
        } else if (this.findSyncStackIndex(scope) !== -1) {
            throw new Error('Scope is already in stack');
        } else if (this._asyncScopes.has(scope)) {
            throw new Error('Scope is already in async scopes set');
        }
        this._syncStack.push(scope);
        if (isAsync) {
            this._asyncScopes.set(scope, false);
        }
        return scope;
    }

    public exitScope(scope: RaiiScope): Promise<any> | void {
        const syncIndex = this.findSyncStackIndex(scope);
        if (syncIndex === -1) {
            throw new Error('Scope is not in stack');
        }

        const scopesAbove = this._syncStack.length - 1 - syncIndex;
        if (scopesAbove > 0) {
            throw new Error(`Can't exit scope because there are ${scopesAbove} scopes above.`);
        }

        this._syncStack.splice(syncIndex, 1);

        const asyncScopeSaved = this._asyncScopes.get(scope);
        if (asyncScopeSaved === false) {
            console.warn('Async scope exited not being saved in method');
        }
        if (asyncScopeSaved === undefined) {
            return scope.dispose();
        }
    }

    // noinspection JSUnusedGlobalSymbols
    public asyncScopeDone(scope: RaiiScope): Promise<any> | void {
        const syncIndex = this.findSyncStackIndex(scope);
        if (syncIndex !== -1) {
            throw new Error('Scope from sync stack passed as async');
        }

        if (!this._asyncScopes.has(scope)) {
            throw new Error('Async scope not found');
        }

        this._asyncScopes.delete(scope);
        return scope.dispose();
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Call from sync methods
     */
    public pushToTopScope<T extends IDisposable>(resource: T): T {
        const topScope = this.getTopScope();
        if (this._asyncScopes.has(topScope)) {
            throw new Error(
                'In order to push to async scope, save it using saveCurrentAsyncScope() ' +
                    'in your method variable and push resources to it',
            );
        }
        return topScope.push(resource);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Call inside async method to keep scope in local variable
     */
    public saveCurrentAsyncScope(): RaiiScope {
        const scope = this.getTopScope();
        if (!this._asyncScopes.has(scope)) {
            throw new Error('Current scope is not async');
        }

        this._asyncScopes.set(scope, true);
        return scope;
    }

    protected getTopScope(): RaiiScope {
        if (this._syncStack.length > 0) {
            return this._syncStack[this._syncStack.length - 1];
        }
        throw new Error('Sync scopes stack is empty');
    }

    protected findSyncStackIndex(scope: RaiiScope): number {
        for (let i = this._syncStack.length - 1; i >= 0; --i) {
            if (this._syncStack[i] === scope) {
                return i;
            }
        }
        return -1;
    }
}

export const scopeStack = new ScopeStack();
