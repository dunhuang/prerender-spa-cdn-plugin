## About prerender-spa-cdn-plugin

`prerender-spa-cdn-plugin` is an webpack plugin derived from [`prerender-spa-plugin`](https://github.com/chrisvfritz/prerender-spa-plugin/). 

`prerender-spa-plugin` is a popular plugin which helps to provide a simple prerendering solution for SPA website. Although `prerender-spa-plugin` is very convenient to configure and popular used, it has bad support for CDN-like public-path as shown in [issue#114](https://github.com/chrisvfritz/prerender-spa-plugin/issues/114), I wrote `prerender-spa-cdn-plugin` and try to present a zero-config way to make it easier.

## How it works

In online environment, the host of static files in a website is usually different from website's main host. Normally static files use CDN host such as `//static-cdn.abc.com`. The problem is when the integration machine is running prerendering process, the needed static files have not been uploaded to CDN servers yet, which makes prerendering failed.

There are several solutions. 1, Upload files to CDN before start prerendering, which is unreasonable or unavailable in many circumstances. 2, Set  static files 2, Mock CDN host and server in the integration machine during prerendering. This plugin follows the latter.

Before starting to prerender, `prerender-spa-cdn-plugin` generates a forward proxy server which will be configured as the headless browser's proxy server. Then all traffic is directed to forward proxy server for both CDN hostname and website's main hostname. In this way we don't need to do any further configuration such as editing local etc/hosts or launching a local web server to support visiting static files with CDN hostname locally.

`prerender-spa-cdn-plugin` uses [puppeteer](https://github.com/GoogleChrome/puppeteer) as the only kind of headless browser.

## Basic Usage

Basic usage is similiar to `prerender-spa-plugin`
ex, cdn host is `//cdn.abcd.com`, plugin is without special configure.

```
const PrerenderSpaCdnPlugin = require('prerender-spa-cdn-plugin')
// ...
new PrerenderSpaCdnPlugin({
  staticDir: path.join(__dirname, 'dist'),
  routes: ['/', '/about'],
  rendererOptions: {
    maxConcurrentRoutes: 1,
    injectProperty: '__PRERENDER_INJECTED',
    inject: {
      rendering: true
    }
  }
})
```


## Advanced Usages

### 1、cdn host with pathname

ex, cdn host is `//cdn.abcd.com/static/`, `server` should be added into the option to configure a pathname rewrite. In this way, `server.proxy` option may be a function cause serverPort is not specified by developer but `port-finder`.
```
new PrerenderSpaCdnPlugin({
  staticDir: path.join(__dirname, 'dist'),
  routes: ['/', '/about'],
  server: 
    proxy: function (serverPort) {
      return {
        '/static': {
          target: `http://localhost:${serverPort}`,
          pathRewrite: { '^/static': '' }
        }
      }
    }
  },
  rendererOptions: {
    maxConcurrentRoutes: 1,
    injectProperty: '__PRERENDER_INJECTED',
    inject: {
      rendering: true
    }
  }
})
```

### 2、support other hosts

Cause we add a forward-proxy in pupeeteer, all request will be directed to the forward-proxy, which is configured to support the static server only. If other hostname should be supported, we add `proxy-bypass-list` args to puppeteer. 

ex, api host is 'api.abcd.com'
```
new PrerenderSpaCdnPlugin({
  staticDir: path.join(__dirname, 'dist'),
  routes: ['/', '/about'],
  browserProxyServer: {
    bypassList: 'api.abcd.com'
  },
  rendererOptions: {
    maxConcurrentRoutes: 1,
    injectProperty: '__PRERENDER_INJECTED',
    inject: {
      rendering: true
    },
    renderAfterTime: 5000
  }
})
```

## Documentation

### Plugin Options

Options is similiar to [prerender-spa-plugin](https://github.com/chrisvfritz/prerender-spa-plugin/blob/master/README.md). 

Difference is as follows.

| Option | Type | Required? | Default | Description |
|-------------|-------------------------------------------|-----------|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| server | Object | No | None | App server configuration options (See below) |
| rendererOptions  | Object  | No        | new PuppeteerRenderer()   |  Use `@prerenderer/renderer-puppeteer` as the renderer to prerender the app. |
|browserProxyServer | Object | No | None | The configuration of forward-proxy used by puppeteer. (See below)|

#### Server Options

| Option | Type    | Required? | Default                    | Description                            |
|--------|---------|-----------|----------------------------|----------------------------------------|
| port   | Integer | No        | First free port after 8000 | The port for the app server to run on. |
| proxy  | Object\|Function(String serverPort): Object  | No        | No proxying                | Proxy configuration. Has the same signature as [webpack-dev-server](https://github.com/webpack/docs/wiki/webpack-dev-server#proxy) |

`proxy` could be a function whenever `serverPort` is the free port autodetected by package `port-finder`. `serverPort: String` is function's single parameter and the function returns an object whose pattern is as shown in upper table. 

```
server: {
  proxy: function(serverPort){
    '/static': {
      target: `http://localhost:${serverPort}`,
      pathRewrite: { '^/static': '' }
    }
  }
}
```

#### BrowserProxyServer Option

| Option | Type    | Required? | Default                    | Description                            |
|--------|---------|-----------|----------------------------|----------------------------------------|
| port   | Integer | No        | First free port after server.port | The port for the forward proxy server to run on. |
| bypassList | String | No | None | List of hostnames which should be bypassed by forward proxy server. In principle it configures puppeteer' args with[`--proxy-bypass-list`](https://www.chromium.org/developers/design-documents/network-settings)
| proxy  | Object\|Function(String serverPort): Object  | No        | proxy: {target: `http://localhost:${serverPort}`}    | Forward proxy configuration. Has the same signature as [webpack-dev-server](https://github.com/webpack/docs/wiki/webpack-dev-server#proxy) |


If proxy is a function, it passes `serverPort: String` as its parameters and returns an object as [webpack-dev-server](https://github.com/webpack/docs/wiki/webpack-dev-server#proxy). `serverPort` is the app server's port specified by `server.port` or autodetected by package `port-finder`.

```
browserProxyOptions: {
  proxy: function(serverPort){
    return {
      target: `http://localhost:${serverPort}`,
    }
  },
  bypassList: 'api.abcd.com'
}
```


### RendererOptions

The only renderer browser used in this plugin is `@prerenderer/renderer-puppeteer`. To be simple, just configure `rendererOptions` instead of set `new PuppeteerRenderer()` to `render` option.

| Option                                                                                                                 | Type                                                                                                                                       | Required? | Default                | Description                                                                                                                                                                                                                                                           |
|------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|-----------|------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| maxConcurrentRoutes                                                                                                    | Number                                                                                                                                     | No        | 0 (No limit)           | The number of routes allowed to be rendered at the same time. Useful for breaking down massive batches of routes into smaller chunks.                                                                                                                                 |
| inject                                                                                                                 | Object                                                                                                                                     | No        | None                   | An object to inject into the global scope of the rendered page before it finishes loading. Must be `JSON.stringifiy`-able. The property injected to is `window['__PRERENDER_INJECTED']` by default.                                                                   |
| injectProperty                                                                                                         | String                                                                                                                                     | No        | `__PRERENDER_INJECTED` | The property to mount `inject` to during rendering.                                                                                                                                                                                                                   |
| renderAfterDocumentEvent                                                                                               | String                                                                                                                                     | No        | None                   | Wait to render until the specified event is fired on the document. (You can fire an event like so: `document.dispatchEvent(new Event('custom-render-trigger'))`                                                                                                       |
| renderAfterElementExists                                                                                               | String (Selector)                                                                                                                          | No        | None                   | Wait to render until the specified element is detected using `document.querySelector`                                                                                                                                                                                 |
| renderAfterTime                                                                                                        | Integer (Milliseconds)                                                                                                                     | No        | None                   | Wait to render until a certain amount of time has passed.                                                                                                                                                                                                             |
| skipThirdPartyRequests                                                                                                 | Boolean                                                                                                                                    | No        | `false`                | Automatically block any third-party requests. (This can make your pages load faster by not loading non-essential scripts, styles, or fonts.)                                                                                                                          |
| consoleHandler                                                                                                         | function(route: String, message: [ConsoleMessage](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-consolemessage)) | No        | None                   | Allows you to provide a custom console.* handler for pages. Argument one to your function is the route being rendered, argument two is the [Puppeteer ConsoleMessage](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-consolemessage) object. |
| [[Puppeteer Launch Options]](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions) | ?                                                                                                                                          | No        | None                   | Any additional options will be passed to `puppeteer.launch()`, such as `headless: false`.                                                                                                                                                                             |

---




## MIT License
```
## MIT License

Copyright (c) 2020 Dunhuang shiyh2012@foxmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```