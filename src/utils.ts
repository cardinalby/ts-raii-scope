import { IDisposable } from '../types/disposable';

export function isPromise(obj: any): obj is Promise<any> {
    return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

export function isDisposable(resource: any): resource is IDisposable {
    return resource && typeof resource.dispose === 'function';
}

export function safeDisposeResource(resource: IDisposable): Promise<void> | void {
    try {
        const result = resource.dispose();
        if (isPromise(result)) {
            return result.catch(error => {
                console.warn(`Resource's dispose() promise rejected. Reason:`);
                console.info(error);
            });
        }
    } catch (error) {
        console.warn(`Resource's dispose() throws error`);
        console.info(error);
    }
}
