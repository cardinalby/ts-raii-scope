import { IDisposable, IExternalDisposeCallback } from '../types/disposable';
import { DisposableResource } from './disposableResource';
import { isDisposable, isPromise, safeDisposeResource } from './utils';

export class RaiiScope implements IDisposable {
    // noinspection JSUnusedGlobalSymbols
    public static doInside<TArgs extends IDisposable[], TResult>(
        resources: TArgs,
        action: (...args: TArgs) => TResult,
    ): TResult {
        const scope = new RaiiScope(...resources);
        try {
            return action(...resources);
        } finally {
            scope.dispose();
        }
    }

    // noinspection JSUnusedGlobalSymbols
    public static async doInsideAsync<TArgs extends IDisposable[], TResult>(
        resources: TArgs,
        action: (...args: IDisposable[]) => Promise<TResult>,
    ): Promise<TResult> {
        const scope = new RaiiScope(...resources);
        return action(...resources).then(
            async result => {
                await scope.dispose();
                return result;
            },
            async reason => {
                await scope.dispose();
                throw reason;
            },
        );
    }

    protected _stack: IDisposable[] = [];
    protected _isDisposed: boolean | undefined = false;

    public constructor(...args: IDisposable[]) {
        for (const arg of args) {
            this.push(arg);
        }
    }

    public push<T extends IDisposable | any>(resource: T, disposeCallback?: IExternalDisposeCallback<T>): T {
        if (isDisposable(resource)) {
            if (disposeCallback) {
                throw new Error('Disposable resource passed with extra disposeCallback');
            }
            return this.pushUnique(resource);
        }
        if (disposeCallback) {
            this.pushUnique(new DisposableResource(resource, disposeCallback));
            return resource;
        }

        throw new Error('Passed not disposable resource without disposeCallback');
    }

    public dispose(): Promise<void> | void {
        if (this._isDisposed === false) {
            const disposeResult = this.disposeImpl();
            if (isPromise(disposeResult)) {
                return disposeResult.then(() => {
                    this._isDisposed = true;
                });
            }
            this._isDisposed = true;
        }
    }

    protected disposeImpl(): Promise<void> | void {
        const resource = this._stack.pop();
        if (resource) {
            const disposing = safeDisposeResource(resource);

            return isPromise(disposing) ? disposing.then(() => this.disposeImpl()) : this.disposeImpl();
        }
    }

    protected pushUnique<T extends IDisposable>(resource: T): T {
        if (this._isDisposed === true) {
            throw new Error('Already disposed');
        }
        if (this._isDisposed === undefined) {
            throw new Error('Disposing in progress');
        }

        if (this._stack.indexOf(resource) !== -1) {
            throw new Error('Resource already pushed');
        }
        this._stack.push(resource);

        return resource;
    }
}
