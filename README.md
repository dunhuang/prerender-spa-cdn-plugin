## About prerender-spa-cdn-plugin


`prerender-spa-cdn-plugin` is an upgraded version of `prerender-spa-plugin` (https://github.com/chrisvfritz/prerender-spa-plugin/blob/master/README.md), which is a popular plugin which helps to provide a simple prerendering solution for SPA website.
`prerender-spa-cdn-plugin` provides a zero-config way to solve the issure that prerender-spa-plugin has bad support for CDN-like public-path (https://github.com/chrisvfritz/prerender-spa-plugin/issues/114).


## How it works

Under online environment, public-path of a website is normally an CDN host such as `//cdn.abcd.com`. 
While, usually prerender process is handled in an integraton mation before uploading static files to CDN machines. 

`prerender-spa-cdn-plugin` generates a proxy server and which will be configured to puppeteer as its forward proxy server while visiting websites. In this way, all http request to CDN host will be directed from forward proxy server to local static server. Then we don't need to do any other config such as adding new host or local webserver to support visiting CDN locally.

## Documentation

### Plugin Options

| Option | Type | Required? | Default | Description |
|-------------|-------------------------------------------|-----------|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| staticDir | String | Yes | None | The root path to serve your app from. |
| outputDir | String | No | None | Where the prerendered pages should be output. If not set, defaults to staticDir. |
| indexPath | String | No | `staticDir/index.html` | The index file to fall back on for SPAs. |
| postProcess | Function(Object context): [Object \| Promise] | No | None | See the [Using the postProcess Option](#using-the-postprocess-option) section. |
| minify | Object | No | None | Minifies the resulting HTML using [html-minifier](https://github.com/kangax/html-minifier). Full list of options available [here](https://github.com/kangax/html-minifier#options-quick-reference). |
| server | Object | Function(String serverPort): Object | No | None | App server configuration options (See below) |
| renderer | Renderer Instance or Configuration Object | No | `new PuppeteerRenderer()` | The renderer you'd like to use to prerender the app. It's recommended that you specify this, but if not it will default to `@prerenderer/renderer-puppeteer`. |
|browserProxyOptions | Object | Function(String serverPort, String browserProxyPort): Object | No | {target: `http://localhost:${serverPort}`} | The options of forward-proxy used by puppeteer. (See below)|
|browserProxyBypassList| String | No | None | The '--proxy-bypass-list' args being set before launching puppeteer. (See below)|

#### Server Options

Server option could be Object or Function.

If server is an object: 

| Option | Type    | Required? | Default                    | Description                            |
|--------|---------|-----------|----------------------------|----------------------------------------|
| port   | Integer | No        | First free port after 8000 | The port for the app server to run on. |
| proxy  | Object  | No        | No proxying                | Proxy configuration. Has the same signature as [webpack-dev-server](https://github.com/webpack/docs/wiki/webpack-dev-server#proxy) |

If server is a function, it passes `serverPort: String` as its only parameter and returns an object whose pattern is as shown in upper table. `serverPort` is the port number found by `port-finder` 。

```
server: function(serverPort){
  return {
    port: serverPort,
    '/static': {
      target: `http://localhost:${serverPort}`,
      pathRewrite: { '^/static': '' }
    }
  }
}
```
#### BrowserProxyBypassList Option

The '--proxy-bypass-list' args being set before launching puppeteer, defaults to ''. See [chromium docs of network-settings] (https://www.chromium.org/developers/design-documents/network-settings)

#### BrowserProxyOptions Option

The options of forward-proxy used by puppeteer. BrowserProxyOptions option could be Object or Function, defaults to none. 

If browserProxyOptions is an object, it is a configure with the same signature as [webpack-dev-server](https://github.com/webpack/docs/wiki/webpack-dev-server#proxy).

If browserProxyOptions is a function, it passes `serverPort: String, browserProxyPort: String` as its parameters and returns an object as [webpack-dev-server](https://github.com/webpack/docs/wiki/webpack-dev-server#proxy) . `serverPort` is the renderer's server port while `browserProxyPort` is the forward-proxy's port。

```
browserProxyOptions: function(serverPort, browserProxyPort){
  return {
    target: `http://localhost:${browserProxyPort}`,
  }
}
```

#### Using The postProcess Option

The `postProcess(Object context): Object | Promise` function in your renderer configuration allows you to adjust the output of `prerender-spa-plugin` before writing it to a file. It is called once per rendered route and is passed a `context` object in the form of:

```javascript
{
  // The prerendered route, after following redirects.
  route: String,
  // The original route passed, before redirects.
  originalRoute: String,
  // The resulting HTML for the route.
  html: String,
  // The path to write the rendered HTML to.
  // This is null (automatically calculated after postProcess)
  // unless explicitly set.
  outputPath: String || null
}
```

You can modify `context.html` to change what gets written to the prerendered files and/or modify `context.route` or `context.outputPath` to change the output location.

You are expected to adjust those properties as needed, then return the context object, or a promise that resolves to it like so:

```javascript
postProcess(context) {
  // Remove /index.html from the output path if the dir name ends with a .html file extension.
  // For example: /dist/dir/special.html/index.html -> /dist/dir/special.html
  if (context.route.endsWith('.html')) {
    context.outputPath = path.join(__dirname, 'dist', context.route)
  }

  return context
}

postProcess(context) {
  return someAsyncProcessing(context.html)
    .then((html) => {
      context.html = html;
      return context;
    });
}
```

#### Vue.js Notes
If you are having issues prerendering with Vue.js, try adding the [`data-server-rendered="true"`](https://ssr.vuejs.org/guide/hydration.html) attribute to your root app element. This will cause Vue to treat your current page as an already-rendered app and update it rather than completely rerendering the whole tree. You can add the attribute using `postProcess` or by manipulating the DOM with JavaScript prior prerendering with `renderAfterDocumentEvent`.

---

### `@prerenderer/renderer-puppeteer` options

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


## Basic Usage

Basic usage is similiar to `prerender-spa-plugin`
ex, when cdn host is as `//cdn.abcd.com`, plugin is without special configure.

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

ex, cdn host is `//cdn.abcd.com/static/`, `server` should be added into the option to configure a pathname rewrite. In this way, `server` option may be a function cause serverPort is not defined by developer but `port-finder`.
```
new PrerenderSpaCdnPlugin({
  staticDir: path.join(__dirname, 'dist'),
  routes: ['/', '/about'],
  server: function (serverPort) {
    return {
      port: serverPort,
      proxy: {
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
  browserProxyBypassList: 'api.abcd.com',
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