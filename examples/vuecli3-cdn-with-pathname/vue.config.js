const PrerenderSpaCdnPlugin = require('prerender-spa-cdn-plugin')
const path = require('path')

module.exports = {
  publicPath: process.env.PUBLIC_PATH,
  configureWebpack: config => {
    if (process.env.NODE_ENV === 'production') {
      config.plugins.push(new PrerenderSpaCdnPlugin({
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
      }))
    }
  }
}
