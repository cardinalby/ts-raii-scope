### Introduction
RAII approach proof of concept in TypeScript, not for production use!
### Installation
`npm install ts-raii-scope`
### How to use   
Let's create class representing temporary dir. According to RAII object of this class should get acquisition of resource in constructor and be responsible of disposing (destroying) resource when the object is not more needed.
```js
class Tmp implements IDisposable {
    private _dirPath: string;
    
    constructor() {
        this._dirPath = fs.mkdtempSync('prefix');
    }
    
    // methods for using this._dirPath
    // ...

    // Method to implement IDisposable interface
    public dispose(): void {
        fs.rmdirSync(this._dirPath);
    }
}
```
Disposing also could be made async:
```js
    // Method to implement IDisposable interface
    public dispose(): Promise<any> {
        return new Promise((resolve, reject) => {
            fs.rmdir(this._dirPath, err => {
                err ? reject() : resolve();
            });
        });        
    }
``` 
You could also use `DisposableResource` from this package to get `IDisposable` object.
Ok, now usage of our `Tmp` class should looks like:
```js
const tmp1 = new Tmp();
const tmp2 = new Tmp();
try {
    // using tmp1, tmp2
}
finally {
  tmp1.dispose();  // or await tmp1.dispose() in case of async method
  tmp2.dispose();  // or await tmp2.dispose() in case of async method
}
```
Here we can use `RaiiScope` class to collect `IDisposable` resources and finally dispose them:
```js
const raiiScope = new RaiiScope();
const tmp1 = raiiScope.push(new Tmp());
const tmp2 = raiiScope.push(new Tmp());
try {
    // using tmp1, tmp2
}
finally {
  raiiScope.dispose();  // or await raiiScope.dispose() in case of async method  
}
```
It works ok for all disposable classes: ones which do `dispose()` synchronously and ones which return `Promise` from `dispose()`. 

Another way to do the same:
```js
RaiiScope.doInside(
    [new Tmp(), new Tmp()], 
    (tmp1: Tmp, tmp2: Tmp) => {
       // using tmp1, tmp2
    }
 );
```
`RaiiScope.doInsideAsync()` is also available. It `await`s method call inside and then `await`s all `dispose()` calls.

Package provide one more kind of syntax sugar for using `IDisposable` resources in methods: `@SyncRaiiMethodScope` and `@AsyncRaiiMethodScope` decorators with the global `raii` object.
```js
import { AsyncRaiiMethodScope, raii, SyncRaiiMethodScope } from 'ts-raii-scope';

class Example {
    @SyncRaiiMethodScope
    public method(): string {
        const tmp1 = raii.push(new Tmp());
        const tmp2 = raii.push(new Tmp());
        // using tmp1, tmp2
        
        // when execution goes out of scope (method returns, or throws exception)
        // tmp1.dispose() and tmp2.dispose() are called by decorator 
        // (actually it's dispose() of RaiiScope, internally created by decorator
        //  especially for your method call)
    }
}
``` 
Decorator wrap method call in `try...finally` and make global `raii` aware of method start and finish.
But to make it works for async methods (which return `Promise` but continue use local variables in their scope in the future) we should use `@AsyncRaiiMethodScope` and save raii scope to use it in method
```js
    @AsyncRaiiMethodScope
    public async method(): Promise<string> {
        const asyncScope = raii.saveCurrentAsyncScope();
        const tmp1 = asyncScope.push(new Tmp());
        const tmp2 = asyncScope.push(new Tmp());            
        // using tmp1, tmp2
        // await ...
        // using tmp1, tmp2 again
        
        // when result promise get resolved or rejected 
        // tmp1.dispose() and tmp2.dispose() are called by decorator 
        // (asyncScope.dispose() actually)
    }
```