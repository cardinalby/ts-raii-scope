import { IDisposable, IExternalDisposeCallback } from '../types/disposable';
import { isPromise } from './utils';

export class DisposableResource<T> implements IDisposable {
    protected _innerResource: T;
    protected _disposeCallback: IExternalDisposeCallback<T>;
    protected _isDisposed: boolean | undefined;

    constructor(innerResource: T, disposeCallback: IExternalDisposeCallback<T>) {
        this._innerResource = innerResource;
        this._disposeCallback = disposeCallback;
        this._isDisposed = false;
    }

    // noinspection JSUnusedGlobalSymbols
    public dispose(): Promise<void> | void {
        if (this._isDisposed === false) {
            this._isDisposed = undefined;
            const disposeResult = this._disposeCallback(this._innerResource);
            if (isPromise(disposeResult)) {
                return disposeResult.then(this.finishDisposing.bind(this));
            }
            this.finishDisposing();
        }
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Returns undefined if dispose in progress
     */
    public isDisposed(): boolean | undefined {
        return this._isDisposed;
    }

    protected finishDisposing() {
        delete this._innerResource;
        this._isDisposed = true;
    }
}
