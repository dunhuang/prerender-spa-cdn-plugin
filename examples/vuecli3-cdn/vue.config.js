const PrerenderSpaCdnPlugin = require('prerender-spa-cdn-plugin')
const path = require('path')
module.exports = {
  publicPath: process.env.PUBLIC_PATH,
  configureWebpack: config => {
    if (process.env.NODE_ENV === 'production') {
      config.plugins.push(new PrerenderSpaCdnPlugin({
        staticDir: path.join(__dirname, 'dist'),
        routes: ['/', '/about'],
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
