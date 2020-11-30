'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var path = require('path');
var Prerenderer = require('@prerenderer/prerenderer');
var PuppeteerRenderer = require('@prerenderer/renderer-puppeteer');

var _require = require('html-minifier'),
    minify = _require.minify;

var PortFinder = require('portfinder');
var httpProxy = require('http-proxy');

function makeProxy(_ref) {
  var serverPort = _ref.serverPort,
      browserProxyPort = _ref.browserProxyPort,
      browserProxyOptions = _ref.browserProxyOptions;

  if (typeof browserProxyOptions === 'function') {
    browserProxyOptions = browserProxyOptions(serverPort);
  }
  browserProxyOptions = browserProxyOptions || {
    target: `http://localhost:${serverPort}`
  };
  return httpProxy.createServer(browserProxyOptions).listen(browserProxyPort);
}

function PrerenderSPAPlugin() {
  var _this = this;

  this._options = {};
  var rendererOptions = {};
  // Normal args object.

  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  if (args.length === 1) {
    this._options = args[0] || {};
    // Backwards-compatibility with v2
  } else {
    console.warn("[prerender-spa-cdn-plugin] You appear to be using the v2 argument-based configuration options. It's recommended that you migrate to the clearer object-based configuration system.\nCheck the documentation for more information.");
    var staticDir = void 0,
        routes = void 0;
    args.forEach(function (arg) {
      if (typeof arg === 'string') staticDir = arg;else if (Array.isArray(arg)) routes = arg;else if (typeof arg === 'object') _this._options = arg;
    });

    // eslint-disable-next-line no-unused-expressions
    staticDir ? this._options.staticDir = staticDir : null;
    // eslint-disable-next-line no-unused-expressions
    routes ? this._options.routes = routes : null;
  }

  // Backwards compatiblity with v2.
  if (this._options.captureAfterDocumentEvent) {
    console.warn('[prerender-spa-plugin] captureAfterDocumentEvent has been renamed to renderAfterDocumentEvent and should be moved to the renderer options.');
    rendererOptions.renderAfterDocumentEvent = this._options.captureAfterDocumentEvent;
  }

  if (this._options.captureAfterElementExists) {
    console.warn('[prerender-spa-plugin] captureAfterElementExists has been renamed to renderAfterElementExists and should be moved to the renderer options.');
    rendererOptions.renderAfterElementExists = this._options.captureAfterElementExists;
  }

  if (this._options.captureAfterTime) {
    console.warn('[prerender-spa-plugin] captureAfterTime has been renamed to renderAfterTime and should be moved to the renderer options.');
    rendererOptions.renderAfterTime = this._options.captureAfterTime;
  }
  this._options.server = this._options.server || {};
  this.rendererOptions = Object.assign(this._options.rendererOptions || {}, rendererOptions);

  if (this._options.postProcessHtml) {
    console.warn('[prerender-spa-plugin] postProcessHtml should be migrated to postProcess! Consult the documentation for more information.');
  }
}

PrerenderSPAPlugin.prototype.apply = function (compiler) {
  var _this2 = this;

  var compilerFS = compiler.outputFileSystem;

  // From https://github.com/ahmadnassri/mkdirp-promise/blob/master/lib/index.js
  var mkdirp = function mkdirp(dir, opts) {
    return new Promise(function (resolve, reject) {
      compilerFS.mkdirp(dir, opts, function (err, made) {
        return err === null ? resolve(made) : reject(err);
      });
    });
  };

  var afterEmit = function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/_regenerator2.default.mark(function _callee(compilation, done) {
      var serverPort, browserProxyPort, errProxy, msg, PrerendererInstance;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              errProxy = null;
              _context.prev = 1;
              _context.t0 = _this2._options.server.port;

              if (_context.t0) {
                _context.next = 7;
                break;
              }

              _context.next = 6;
              return PortFinder.getPortPromise();

            case 6:
              _context.t0 = _context.sent;

            case 7:
              serverPort = _context.t0;

              if (typeof _this2._options.server === 'function') {
                _this2._options.server = _this2._options.server(serverPort);
              } else {
                _this2._options.server.port = serverPort;
              }
              // if (this._options.cdnHost) {
              PortFinder.basePort = serverPort + 1;
              _context.next = 12;
              return PortFinder.getPortPromise();

            case 12:
              browserProxyPort = _context.sent;

              _this2.rendererOptions.args = [`--proxy-server=localhost:${browserProxyPort}`];
              _this2.browserProxyServer = makeProxy({ serverPort, browserProxyPort, browserProxyOptions: _this2._options.browserProxyOptions });
              _this2._options.renderer = new PuppeteerRenderer(Object.assign({}, { headless: true }, _this2.rendererOptions));
              // }
              // this._options.renderer = new PuppeteerRenderer(Object.assign({}, { headless: true }, this.rendererOptions))
              _context.next = 27;
              break;

            case 18:
              _context.prev = 18;
              _context.t1 = _context['catch'](1);

              errProxy = true;
              console.log(_context.t1);
              _this2.browserProxyServer && _this2.browserProxyServer.close();
              msg = '[prerender-spa-cdn-plugin] Unable to start proxy server!';

              console.error(msg);
              compilation.errors.push(new Error(msg));
              done();

            case 27:
              if (!errProxy) {
                _context.next = 29;
                break;
              }

              return _context.abrupt('return');

            case 29:
              PrerendererInstance = new Prerenderer(_this2._options);


              PrerendererInstance.initialize().then(function () {
                return PrerendererInstance.renderRoutes(_this2._options.routes || []);
              })
              // Backwards-compatibility with v2 (postprocessHTML should be migrated to postProcess)
              .then(function (renderedRoutes) {
                return _this2._options.postProcessHtml ? renderedRoutes.map(function (renderedRoute) {
                  var processed = _this2._options.postProcessHtml(renderedRoute);
                  if (typeof processed === 'string') renderedRoute.html = processed;else renderedRoute = processed;

                  return renderedRoute;
                }) : renderedRoutes;
              })
              // Run postProcess hooks.
              .then(function (renderedRoutes) {
                return _this2._options.postProcess ? Promise.all(renderedRoutes.map(function (renderedRoute) {
                  return _this2._options.postProcess(renderedRoute);
                })) : renderedRoutes;
              })
              // Check to ensure postProcess hooks returned the renderedRoute object properly.
              .then(function (renderedRoutes) {
                var isValid = renderedRoutes.every(function (r) {
                  return typeof r === 'object';
                });
                if (!isValid) {
                  throw new Error('[prerender-spa-plugin] Rendered routes are empty, did you forget to return the `context` object in postProcess?');
                }

                return renderedRoutes;
              })
              // Minify html files if specified in config.
              .then(function (renderedRoutes) {
                if (!_this2._options.minify) return renderedRoutes;

                renderedRoutes.forEach(function (route) {
                  route.html = minify(route.html, _this2._options.minify);
                });

                return renderedRoutes;
              })
              // Calculate outputPath if it hasn't been set already.
              .then(function (renderedRoutes) {
                renderedRoutes.forEach(function (rendered) {
                  if (!rendered.outputPath) {
                    rendered.outputPath = path.join(_this2._options.outputDir || _this2._options.staticDir, rendered.route, 'index.html');
                  }
                });

                return renderedRoutes;
              })
              // Create dirs and write prerendered files.
              .then(function (processedRoutes) {
                var promises = Promise.all(processedRoutes.map(function (processedRoute) {
                  return mkdirp(path.dirname(processedRoute.outputPath)).then(function () {
                    return new Promise(function (resolve, reject) {
                      compilerFS.writeFile(processedRoute.outputPath, processedRoute.html.trim(), function (err) {
                        // eslint-disable-next-line prefer-promise-reject-errors
                        if (err) reject(`[prerender-spa-cdn-plugin] Unable to write rendered route to file "${processedRoute.outputPath}" \n ${err}.`);else resolve();
                      });
                    });
                  }).catch(function (err) {
                    if (typeof err === 'string') {
                      err = `[prerender-spa-cdn-plugin] Unable to create directory ${path.dirname(processedRoute.outputPath)} for route ${processedRoute.route}. \n ${err}`;
                    }

                    throw err;
                  });
                }));

                return promises;
              }).then(function (r) {
                PrerendererInstance.destroy();
                _this2.browserProxyServer && _this2.browserProxyServer.close(function () {
                  console.log(`\nproxy server http://localhost:${browserProxyPort} is close`);
                });
                done();
              }).catch(function () {
                PrerendererInstance.destroy();
                var msg = '[prerender-spa-cdn-plugin] Unable to prerender all routes!';
                console.error(msg);
                compilation.errors.push(new Error(msg));
                _this2.browserProxyServer && _this2.browserProxyServer.close(function () {
                  console.log(`\nproxy server http://localhost:${browserProxyPort} is close`);
                });
                done();
              });

            case 31:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, _this2, [[1, 18]]);
    }));

    return function afterEmit(_x, _x2) {
      return _ref2.apply(this, arguments);
    };
  }();

  if (compiler.hooks) {
    var plugin = { name: 'PrerenderSPACdnPlugin' };
    compiler.hooks.afterEmit.tapAsync(plugin, afterEmit);
  } else {
    compiler.plugin('after-emit', afterEmit);
  }
};

PrerenderSPAPlugin.PuppeteerRenderer = PuppeteerRenderer;

module.exports = PrerenderSPAPlugin;