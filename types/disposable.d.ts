export type IDisposeCallback = () => Promise<void> | void;
export type IExternalDisposeCallback<T> = (resource: T) => Promise<void> | void;

export interface IDisposable {
    dispose: IDisposeCallback;
}
