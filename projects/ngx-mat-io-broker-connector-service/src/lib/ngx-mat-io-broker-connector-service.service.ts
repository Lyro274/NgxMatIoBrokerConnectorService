import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NgxMatIoBrokerConnectorService {

  getters: any[] = [];    // Stores all registered getters for the behaviourSubject to know when to send data
  states = [];            // Stores all states that exist, returned from the socket adapter
  servConn: any;

  // BehaviorSubject to send data to all subscribers when the getters array includes that entry
  private getterBehaviourSubject = new BehaviorSubject<any>(0);
  getterData$ = this.getterBehaviourSubject.asObservable();

  // BehaviorSubject to send all data from the socket service to all subscribers
  private allDataBehaviourSubject = new BehaviorSubject<any>(0);
  allData$ = this.allDataBehaviourSubject.asObservable();

  constructor() {

    // For more information, look into the socket adapter documentation (https://github.com/ioBroker/ioBroker.socketio)
    this.servConn = {
      _socket: null,
      _onConnChange: null,
      _onUpdate: null,
      _isConnected: false,
      _disconnectedSince: null,
      _connCallbacks: {
        onConnChange: null,
        onUpdate: null,
        onRefresh: null,
        onAuth: null,
        onCommand: null,
        onError: null
      },
      _authInfo: null,
      _isAuthDone: false,
      _isAuthRequired: false,
      _authRunning: false,
      _cmdQueue: [],
      _connTimer: null,
      _type: 'socket.io', // [SignalR | socket.io | local]
      _timeout: 0,           // 0 - use transport default timeout to detect disconnect
      _reconnectInterval: 10000,       // reconnect interval
      _reloadInterval: 30,          // if connection was absent longer than 30 seconds
      _cmdData: null,
      _cmdInstance: null,
      _isSecure: false,
      _defaultMode: 0x644,
      _useStorage: false,
      _objects: null,        // used if _useStorage === true
      _enums: null,        // used if _useStorage === true
      namespace: 'vis.0',

      getType: function () {
        return this._type;
      },
      getIsConnected: function () {
        return this._isConnected;
      },
      getIsLoginRequired: function () {
        return this._isSecure;
      },
      getUser: function () {
        return this._user;
      },
      setReloadTimeout: function (timeout) {
        this._reloadInterval = parseInt(timeout, 10);
      },
      setReconnectInterval: function (interval) {
        this._reconnectInterval = parseInt(interval, 10);
      },
      _checkConnection: function (func, _arguments) {
        if (!this._isConnected) {
          console.log('No connection!');
          return false;
        }

        if (this._queueCmdIfRequired(func, _arguments)) return false;

        //socket.io
        if (this._socket === null) {
          console.log('socket.io not initialized');
          return false;
        }
        return true;
      },
      _monitor: function () {
        if (this._timer) return;
        var ts = (new Date()).getTime();
        if (this._reloadInterval && ts - this._lastTimer > this._reloadInterval * 1000) {
          // It seems, that PC was in a sleep => Reload page to request authentication anew
          window.location.reload();
        } else {
          this._lastTimer = ts;
        }
        var that = this;
        this._timer = setTimeout(function () {
          that._timer = null;
          that._monitor();
        }, 10000);
      },
      _onAuth: function (objectsRequired, isSecure) {
        var that = this;

        this._isSecure = isSecure;

        if (this._isSecure) {
          that._lastTimer = (new Date()).getTime();
          this._monitor();
        }

        this._socket.emit('subscribe', '*');
        if (objectsRequired) this._socket.emit('subscribeObjects', '*');

        if (this._isConnected === true) {
          // This seems to be a reconnect because we're already connected!
          // -> prevent firing onConnChange twice
          return;
        }
        this._isConnected = true;
        if (this._connCallbacks.onConnChange) {
          setTimeout(function () {
            that._socket.emit('authEnabled', function (auth, user) {
              that._user = user;
              that._connCallbacks.onConnChange(that._isConnected);
            });
          }, 0);
        }
      },
      reconnect: function (connOptions) {
        var that = this;
        // reconnect
        if ((!connOptions.mayReconnect || connOptions.mayReconnect()) && !this._connectInterval) {
          this._connectInterval = setInterval(function () {
            console.log('Trying connect...');
            that._socket.connect();
            that._countDown = Math.floor(that._reconnectInterval / 1000);
          }, this._reconnectInterval);

          this._countDown = Math.floor(this._reconnectInterval / 1000);

          this._countInterval = setInterval(function () {
            that._countDown--;
          }, 1000);
        }
      },
      init: function (connOptions, connCallbacks, objectsRequired) {
        var that = this; // support of old safary

        connOptions = connOptions || {};
        if (!connOptions.name) connOptions.name = this.namespace;

        // To start vis as local use one of:
        // - start vis from directory with name local, e.g. c:/blbla/local/ioBroker.vis/www/index.html
        // - do not create "_socket/info.js" file in "www" directory
        // - create "_socket/info.js" file with
        //   var socketUrl = "local"; var socketSession = ""; sysLang="en";
        //   in this case you can overwrite browser language settings

        this._connCallbacks = connCallbacks;

        var connLink = connOptions.connLink || window.localStorage.getItem('connLink');

        // if no remote data
        if (this._type === 'local') {
          // report connected state
          this._isConnected = true;
          if (this._connCallbacks.onConnChange) this._connCallbacks.onConnChange(this._isConnected);
        } else {
          connOptions.socketSession = connOptions.socketSession || 'nokey';

          var url;
          if (connLink) {
            url = connLink;
            if (typeof connLink !== 'undefined') {
              if (connLink[0] === ':') connLink = location.protocol + '://' + location.hostname + connLink;
            }
          } else {
            url = location.protocol + '//' + location.host;
          }

          // @ts-ignore
          this._socket = io.connect(url, {
            query: 'key=' + connOptions.socketSession,
            'reconnection limit': 10000,
            'max reconnection attempts': Infinity,
            reconnection: false,
            upgrade: !connOptions.socketForceWebSockets,
            rememberUpgrade: connOptions.socketForceWebSockets,
            transports: connOptions.socketForceWebSockets ? ['websocket'] : undefined
          });

          this._socket.on('connect', function () {
            if (that._disconnectedSince) {
              var offlineTime = (new Date()).getTime() - that._disconnectedSince;
              console.log('was offline for ' + (offlineTime / 1000) + 's');

              // reload whole page if no connection longer than some period
              if (that._reloadInterval && offlineTime > that._reloadInterval * 1000) window.location.reload();

              that._disconnectedSince = null;
            }

            if (that._connectInterval) {
              clearInterval(that._connectInterval);
              that._connectInterval = null;
            }
            if (that._countInterval) {
              clearInterval(that._countInterval);
              that._countInterval = null;
            }
            var elem = document.getElementById('server-disconnect');
            if (elem) elem.style.display = 'none';

            that._socket.emit('name', connOptions.name);
            console.log((new Date()).toISOString() + ' Connected => authenticate');
            setTimeout(function () {
              var wait = setTimeout(function () {
                console.error('No answer from server')
                window.location.reload();
              }, 3000);

              that._socket.emit('authenticate', function (isOk, isSecure) {
                clearTimeout(wait);
                console.log((new Date()).toISOString() + ' Authenticated: ' + isOk);
                if (isOk) {
                  that._onAuth(objectsRequired, isSecure);
                } else {
                  console.log('permissionError');
                }
              });
            }, 50);
          });

          this._socket.on('reauthenticate', function () {
            if (that._connCallbacks.onConnChange) {
              that._connCallbacks.onConnChange(false);
            }
            console.warn('reauthenticate');
            window.location.reload();
          });

          this._socket.on('connect_error', function () {

            that.reconnect(connOptions);
          });

          this._socket.on('disconnect', function () {
            that._disconnectedSince = (new Date()).getTime();

            // called only once when connection lost (and it was here before)
            that._isConnected = false;
            if (that._connCallbacks.onConnChange) {
              setTimeout(function () {
                var elem = document.getElementById('server-disconnect');
                if (elem) elem.style.display = '';
                that._connCallbacks.onConnChange(that._isConnected);
              }, 5000);
            } else {
              var elem = document.getElementById('server-disconnect');
              if (elem) elem.style.display = '';
            }

            // reconnect
            that.reconnect(connOptions);
          });

          // after reconnect the "connect" event will be called
          this._socket.on('reconnect', function () {
            var offlineTime = (new Date()).getTime() - that._disconnectedSince;
            console.log('was offline for ' + (offlineTime / 1000) + 's');

            // reload whole page if no connection longer than one minute
            if (that._reloadInterval && offlineTime > that._reloadInterval * 1000) {
              window.location.reload();
            }
            // anyway "on connect" is called
          });

          this._socket.on('objectChange', function (id, obj) {
            // If cache used

            if (that._connCallbacks.onObjectChange) that._connCallbacks.onObjectChange(id, obj);
          });

          this._socket.on('stateChange', function (id, state) {
            if (!id || state === null || typeof state !== 'object') return;

            if (that._connCallbacks.onCommand && id === that.namespace + '.control.command') {
              if (state.ack) return;

              if (state.val &&
                typeof state.val === 'string' &&
                state.val[0] === '{' &&
                state.val[state.val.length - 1] === '}') {
                try {
                  state.val = JSON.parse(state.val);
                } catch (e) {
                  console.log('Command seems to be an object, but cannot parse it: ' + state.val);
                }
              }

              // if command is an object {instance: 'iii', command: 'cmd', data: 'ddd'}
              if (state.val && state.val.instance) {
                if (that._connCallbacks.onCommand(state.val.instance, state.val.command, state.val.data)) {
                  // clear state
                  that.setState(id, {val: '', ack: true});
                }
              } else {
                if (that._connCallbacks.onCommand(that._cmdInstance, state.val, that._cmdData)) {
                  // clear state
                  that.setState(id, {val: '', ack: true});
                }
              }
            } else if (id === that.namespace + '.control.data') {
              that._cmdData = state.val;
            } else if (id === that.namespace + '.control.instance') {
              that._cmdInstance = state.val;
            } else if (that._connCallbacks.onUpdate) {
              that._connCallbacks.onUpdate(id, state);
            }
          });

          this._socket.on('permissionError', function (err) {
            if (that._connCallbacks.onError) {
              /* {
               command:
               type:
               operation:
               arg:
               }*/
              that._connCallbacks.onError(err);
            } else {
              console.log('permissionError');
            }
          });
        }
      },
      logout: function (callback) {
        if (!this._isConnected) {
          console.log('No connection!');
          return;
        }

        this._socket.emit('logout', callback);
      },
      getVersion: function (callback) {
        if (!this._checkConnection('getVersion', arguments)) return;

        this._socket.emit('getVersion', function (version) {
          if (callback) callback(version);
        });
      },
      _checkAuth: function (callback) {
        if (!this._isConnected) {
          console.log('No connection!');
          return;
        }
        //socket.io
        if (this._socket === null) {
          console.log('socket.io not initialized');
          return;
        }
        this._socket.emit('getVersion', function (version) {
          if (callback)
            callback(version);
        });
      },
      readFile: function (filename, callback, isRemote) {
        if (!callback) throw 'No callback set';

        if (this._type === 'local') {
          try {
          } catch (err) {
            callback(err, null);
          }
        } else {
          if (!this._checkConnection('readFile', arguments)) return;

          if (isRemote)  {
            var adapter = this.namespace;
            if (filename[0] === '/') {
              var p = filename.split('/');
              adapter = p[1];
              p.splice(0, 2);
              filename = p.join('/');
            }

            this._socket.emit('readFile', adapter, filename, function (err, data, mimeType) {
              setTimeout(function () {
                callback(err, data, filename, mimeType);
              }, 0);
            });
          }
        }
      },
      getMimeType: function (ext) {
        if (ext.indexOf('.') !== -1) ext = ext.toLowerCase().match(/\.[^.]+$/);
        var _mimeType;
        if (ext === '.css') {
          _mimeType = 'text/css';
        } else if (ext === '.bmp') {
          _mimeType = 'image/bmp';
        } else if (ext === '.png') {
          _mimeType = 'image/png';
        } else if (ext === '.jpg') {
          _mimeType = 'image/jpeg';
        } else if (ext === '.jpeg') {
          _mimeType = 'image/jpeg';
        } else if (ext === '.gif') {
          _mimeType = 'image/gif';
        } else if (ext === '.tif') {
          _mimeType = 'image/tiff';
        } else if (ext === '.js') {
          _mimeType = 'application/javascript';
        } else if (ext === '.html') {
          _mimeType = 'text/html';
        } else if (ext === '.htm') {
          _mimeType = 'text/html';
        } else if (ext === '.json') {
          _mimeType = 'application/json';
        } else if (ext === '.xml') {
          _mimeType = 'text/xml';
        } else if (ext === '.svg') {
          _mimeType = 'image/svg+xml';
        } else if (ext === '.eot') {
          _mimeType = 'application/vnd.ms-fontobject';
        } else if (ext === '.ttf') {
          _mimeType = 'application/font-sfnt';
        } else if (ext === '.woff') {
          _mimeType = 'application/font-woff';
        } else if (ext === '.wav') {
          _mimeType = 'audio/wav';
        } else if (ext === '.mp3') {
          _mimeType = 'audio/mpeg3';
        } else {
          _mimeType = 'text/javascript';
        }
        return _mimeType;
      },
      readFile64: function (filename, callback, isRemote) {
        var that = this;
        if (!callback) {
          throw 'No callback set';
        }

        if (!this._checkConnection('readFile', arguments)) return;

        if (isRemote) {
          var adapter = this.namespace;
          if (filename[0] === '/') {
            var p = filename.split('/');
            adapter = p[1];
            p.splice(0, 2);
            filename = p.join('/');
          }

          this._socket.emit('readFile64', adapter, filename, function (err, data, mimeType) {
            setTimeout(function () {
              if (data) {
                callback(err, {mime: mimeType || that.getMimeType(filename), data: data}, filename);
              } else {
                callback(err, {mime: mimeType || that.getMimeType(filename)}, filename);
              }
            }, 0);
          });
        }
      },
      // Write file base 64
      writeFile64: function (filename, data, callback) {
        if (!this._checkConnection('writeFile', arguments)) return;

        var parts = filename.split('/');
        var adapter = parts[1];
        parts.splice(0, 2);

        this._socket.emit('writeFile', adapter, parts.join('/'), atob(data), {mode: this._defaultMode}, callback);
      },
      readDir: function (dirname, callback) {
        //socket.io
        if (this._socket === null) {
          console.log('socket.io not initialized');
          return;
        }
        if (!dirname) dirname = '/';
        var parts = dirname.split('/');
        var adapter = parts[1];
        parts.splice(0, 2);

        this._socket.emit('readDir', adapter, parts.join('/'), {filter: true}, function (err, data) {
          if (callback) callback(err, data);
        });
      },
      mkdir: function (dirname, callback) {
        var parts = dirname.split('/');
        var adapter = parts[1];
        parts.splice(0, 2);

        this._socket.emit('mkdir', adapter, parts.join('/'), function (err) {
          if (callback) callback(err);
        });
      },
      unlink: function (name, callback) {
        var parts = name.split('/');
        var adapter = parts[1];
        parts.splice(0, 2);

        this._socket.emit('unlink', adapter, parts.join('/'), function (err) {
          if (callback) callback(err);
        });
      },
      renameFile: function (oldname, newname, callback) {
        var parts1 = oldname.split('/');
        var adapter = parts1[1];
        parts1.splice(0, 2);
        var parts2 = newname.split('/');
        parts2.splice(0, 2);
        this._socket.emit('rename', adapter, parts1.join('/'), parts2.join('/'), function (err) {
          if (callback) callback(err);
        });
      },
      setState: function (pointId, value, callback) {
        //socket.io
        if (this._socket === null) {
          //console.log('socket.io not initialized');
          return;
        }
        this._socket.emit('setState', pointId, value, callback);
      },
      sendTo: function (instance, command, payload, callback) {
        //socket.io
        if (this._socket === null) {
          //console.log('socket.io not initialized');
          return;
        }
        this._socket.emit('sendTo', instance, command, payload, callback);
      },
      // callback(err, data)
      getStates: function (IDs, callback) {
        if (typeof IDs === 'function') {
          callback = IDs;
          IDs = null;
        }

        if (this._type === 'local') {
          return callback(null, []);
        } else {
          if (!this._checkConnection('getStates', arguments)) return;

          this.gettingStates = this.gettingStates || 0;
          this.gettingStates++;
          if (this.gettingStates > 1) {
            // fix for slow devices
            console.log('Trying to get empty list, because the whole list could not be loaded');
            IDs = [];
          }
          var that = this;
          this._socket.emit('getStates', IDs, function (err, data) {
            that.gettingStates--;
            if (err || !data) {
              if (callback) {
                callback(err || 'Authentication required');
              }
            } else if (callback) {
              callback(null, data);
            }
          });
        }
      },
      _fillChildren: function (objects) {
        var items = [];

        for (var id in objects) {
          items.push(id);
        }
        items.sort();

        for (var i = 0; i < items.length; i++) {
          if (objects[items[i]].common) {
            var j = i + 1;
            var children = [];
            var len = items[i].length + 1;
            var name = items[i] + '.';
            while (j < items.length && items[j].substring(0, len) === name) {
              children.push(items[j++]);
            }

            objects[items[i]].children = children;
          }
        }
      },
      // callback(err, data)
      getObjects: function (useCache, callback) {
        if (typeof useCache === 'function') {
          callback = useCache;
          useCache = false;
        }

        if (!this._checkConnection('getObjects', arguments)) return;
        var that = this;
        this._socket.emit('getObjects', function (err, data) {

          // Read all enums
          that._socket.emit('getObjectView', 'system', 'enum', {
            startkey: 'enum.',
            endkey: 'enum.\u9999'
          }, function (err, res) {
            if (err) {
              callback(err);
              return;
            }
            var result = {};
            var enums = {};
            for (var i = 0; i < res.rows.length; i++) {
              data[res.rows[i].id] = res.rows[i].value;
              enums[res.rows[i].id] = res.rows[i].value;
            }

            // Read all adapters for images
            that._socket.emit('getObjectView', 'system', 'instance', {
              startkey: 'system.adapter.',
              endkey: 'system.adapter.\u9999'
            }, function (err, res) {
              if (err) {
                callback(err);
                return;
              }
              var result = {};
              for (var i = 0; i < res.rows.length; i++) {
                data[res.rows[i].id] = res.rows[i].value;
              }
              // find out default file mode
              if (data['system.adapter.' + that.namespace] &&
                data['system.adapter.' + that.namespace].native &&
                data['system.adapter.' + that.namespace].native.defaultFileMode) {
                that._defaultMode = data['system.adapter.' + that.namespace].native.defaultFileMode;
              }

              // Read all channels for images
              that._socket.emit('getObjectView', 'system', 'channel', {
                startkey: '',
                endkey: '\u9999'
              }, function (err, res) {
                if (err) {
                  callback(err);
                  return;
                }
                var result = {};
                for (var i = 0; i < res.rows.length; i++) {
                  data[res.rows[i].id] = res.rows[i].value;
                }

                // Read all devices for images
                that._socket.emit('getObjectView', 'system', 'device', {
                  startkey: '',
                  endkey: '\u9999'
                }, function (err, res) {
                  if (err) {
                    callback(err);
                    return;
                  }
                  var result = {};
                  for (var i = 0; i < res.rows.length; i++) {
                    data[res.rows[i].id] = res.rows[i].value;
                  }

                  if (callback) callback (err, data);
                });
              });
            });
          });
        });
      },
      getChildren: function (id, useCache, callback) {
        if (!this._checkConnection('getChildren', arguments)) return;

        if (typeof id === 'function') {
          callback = id;
          id = null;
          useCache = false;
        }
        if (typeof id === 'boolean') {
          callback = useCache;
          useCache = id;
          id = null;
        }
        if (typeof useCache === 'function') {
          callback = useCache;
          useCache = false;
        }

        if (!id) return callback('getChildren: no id given');

        var that = this;
        var data = [];

        // Read all devices
        that._socket.emit('getObjectView', 'system', 'device', {
          startkey: id + '.',
          endkey: id + '.\u9999'
        }, function (err, res) {
          if (err) {
            callback(err);
            return;
          }
          var result = {};
          for (var i = 0; i < res.rows.length; i++) {
            data[res.rows[i].id] = res.rows[i].value;
          }

          that._socket.emit('getObjectView', 'system', 'channel', {
            startkey: id + '.',
            endkey: id + '.\u9999'
          }, function (err, res) {
            if (err) {
              callback(err);
              return;
            }
            var result = {};
            for (var i = 0; i < res.rows.length; i++) {
              data[res.rows[i].id] = res.rows[i].value;
            }

            // Read all adapters for images
            that._socket.emit('getObjectView', 'system', 'state', {
              startkey: id + '.',
              endkey: id + '.\u9999'
            }, function (err, res) {
              if (err) {
                callback(err);
                return;
              }
              var result = {};
              for (var i = 0; i < res.rows.length; i++) {
                data[res.rows[i].id] = res.rows[i].value;
              }
              var list = [];

              var count = id.split('.').length;

              // find direct children
              for (var _id in data) {
                var parts = _id.split('.');
                if (count + 1 === parts.length) {
                  list.push(_id);
                }
              }
              list.sort();

              if (callback) callback(err, list);
            }.bind(this));
          }.bind(this));
        }.bind(this));
      },
      getObject: function (id, useCache, callback) {
        if (typeof id === 'function') {
          callback = id;
          id = null;
          useCache = false;
        }
        if (typeof id === 'boolean') {
          callback = useCache;
          useCache = id;
          id = null;
        }
        if (typeof useCache === 'function') {
          callback = useCache;
          useCache = false;
        }
        if (!id) return callback('no id given');

        this._socket.emit('getObject', id, function (err, obj) {
          if (err) {
            callback(err);
            return;
          }
          return callback(null, obj);
        }.bind(this));
      },
      getEnums: function (enumName, useCache, callback) {
        if (typeof enumName === 'function') {
          callback = enumName;
          enumName = null;
          useCache = false;
        }
        if (typeof enumName === 'boolean') {
          callback = useCache;
          useCache = enumName;
          enumName = null;
        }
        if (typeof useCache === 'function') {
          callback = useCache;
          useCache = false;
        }

        if (this._type === 'local') {
          return callback(null, []);
        } else {

          enumName = enumName ? enumName + '.' : '';

          // Read all enums
          this._socket.emit('getObjectView', 'system', 'enum', {
            startkey: 'enum.' + enumName,
            endkey: 'enum.' + enumName + '\u9999'
          }, function (err, res) {
            if (err) {
              callback(err);
              return;
            }
            var enums = {};
            for (var i = 0; i < res.rows.length; i++) {
              var obj = res.rows[i].value;
              enums[obj._id] = obj;
            }
            if (this._useStorage) {
            }
            callback(null, enums);
          }.bind(this));
        }
      },
      // return time when the objects were synchronized
      getSyncTime: function () {
        return null;
      },
      addObject: function (objId, obj, callback) {
        if (!this._isConnected) {
          console.log('No connection!');
          return;
        }
        //socket.io
        if (this._socket === null) {
          console.log('socket.io not initialized');
          return;
        }
      },
      delObject: function (objId) {
        if (!this._checkConnection('delObject', arguments)) return;

        this._socket.emit('delObject', objId);
      },
      httpGet: function (url, callback) {
        if (!this._isConnected) {
          console.log('No connection!');
          return;
        }
        //socket.io
        if (this._socket === null) {
          console.log('socket.io not initialized');
          return;
        }
        this._socket.emit('httpGet', url, function (data) {
          if (callback) callback(data);
        });
      },
      logError: function (errorText) {
        console.log("Error: " + errorText);
        if (!this._isConnected) {
          //console.log('No connection!');
          return;
        }
        //socket.io
        if (this._socket === null) {
          console.log('socket.io not initialized');
          return;
        }
        this._socket.emit('log', 'error', 'Addon DashUI  ' + errorText);
      },
      _queueCmdIfRequired: function (func, args) {
        var that = this;
        if (!this._isAuthDone) {
          // Queue command
          this._cmdQueue.push({func: func, args: args});

          if (!this._authRunning) {
            this._authRunning = true;
            // Try to read version
            this._checkAuth(function (version) {
              // If we have got version string, so there is no authentication, or we are authenticated
              that._authRunning = false;
              if (version) {
                that._isAuthDone = true;
                // Repeat all stored requests
                var __cmdQueue = that._cmdQueue;
                // Trigger GC
                that._cmdQueue = null;
                that._cmdQueue = [];
                for (var t = 0, len = __cmdQueue.length; t < len; t++) {
                  that[__cmdQueue[t].func].apply(that, __cmdQueue[t].args);
                }
              } else {
                // Auth required
                that._isAuthRequired = true;
                // What for AuthRequest from server
              }
            });
          }

          return true;
        } else {
          return false;
        }
      },
      authenticate: function (user, password, salt) {
        this._authRunning = true;

        if (user !== undefined) {
          this._authInfo = {
            user: user,
            hash: password + salt,
            salt: salt
          };
        }

        if (!this._isConnected) {
          console.log('No connection!');
          return;
        }

        if (!this._authInfo) {
          console.log("No credentials!");
        }
      },
      getConfig: function (useCache, callback) {
        if (!this._checkConnection('getConfig', arguments)) return;

        if (typeof useCache === 'function') {
          callback = useCache;
          useCache = false;
        }
        var that = this;
        this._socket.emit('getObject', 'system.config', function (err, obj) {
          if (callback && obj && obj.common) {

            callback(null, obj.common);
          } else {
            callback('Cannot read language');
          }
        });
      },
      sendCommand: function (instance, command, data, ack) {
        this.setState(this.namespace + '.control.instance', {val: instance || 'notdefined', ack: true});
        this.setState(this.namespace + '.control.data', {val: data, ack: true});
        this.setState(this.namespace + '.control.command', {val: command, ack: ack === undefined ? true : ack});
      },
      _detectViews: function (projectDir, callback) {
        this.readDir('/' + this.namespace + '/' + projectDir, function (err, dirs) {
          // find vis-views.json
          for (var f = 0; f < dirs.length; f++) {
            if (dirs[f].file === 'vis-views.json' && (!dirs[f].acl || dirs[f].acl.read)) {
              return callback(err, {
                name: projectDir,
                readOnly: (dirs[f].acl && !dirs[f].acl.write),
                mode: dirs[f].acl ? dirs[f].acl.permissions : 0
              });
            }
          }
          callback(err);
        });
      },
      readProjects: function (callback) {
        var that = this;
        this.readDir('/' + this.namespace, function (err, dirs) {
          var result = [];
          var count = 0;
          for (var d = 0; d < dirs.length; d++) {
            if (dirs[d].isDir) {
              count++;
              that._detectViews(dirs[d].file, function (subErr, project) {
                if (project) result.push(project);

                err = err || subErr;
                if (!(--count)) callback(err, result);
              });
            }
          }
        });
      },
      chmodProject: function (projectDir, mode, callback) {
        //socket.io
        if (this._socket === null) {
          console.log('socket.io not initialized');
          return;
        }
        this._socket.emit('chmodFile', this.namespace, projectDir + '*', {mode: mode}, function (err, data) {
          if (callback) callback(err, data);
        });
      },
      clearCache: function () {
      },
      getHistory: function (id, options, callback) {
        if (!this._checkConnection('getHistory', arguments)) return;

        if (!options) options = {};
        if (!options.timeout) options.timeout = 2000;

        var timeout = setTimeout(function () {
          timeout = null;
          callback('timeout');
        }, options.timeout);
        this._socket.emit('getHistory', id, options, function (err, result) {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
          callback(err, result);
        });
      },
      getLiveHost: function (cb) {
        var that = this;
        this._socket.emit('getObjectView', 'system', 'host', {
          startkey: 'system.host.',
          endkey: 'system.host.\u9999'
        }, function (err, res) {
          var _hosts = [];
          for (var h = 0; h < res.rows.length; h++) {
            _hosts.push(res.rows[h].id + '.alive');
          }
          if (!_hosts.length) {
            cb('');
            return;
          }
          that.getStates(_hosts, function (err, states) {
            for (var h in states) {
              if (states[h].val) {
                cb(h.substring(0, h.length - '.alive'.length));
                return;
              }
            }
            cb('');
          });
        });
      },
      readDirAsZip: function (project, useConvert, callback) {
        if (!callback) {
          callback = useConvert;
          useConvert = undefined;
        }
        if (!this._isConnected) {
          console.log('No connection!');
          return;
        }
        //socket.io
        if (this._socket === null) {
          console.log('socket.io not initialized');
          return;
        }
        if (project.match(/\/$/)) project = project.substring(0, project.length - 1);
        var that = this;
        this.getLiveHost(function (host) {
          if (!host) {
            window.alert('No active host found');
            return;
          }
          // to do find active host
          that._socket.emit('sendToHost', host, 'readDirAsZip', {
            id: that.namespace,
            name: project || 'main',
            options: {
              settings: useConvert
            }
          }, function (data) {
            if (data.error) console.error(data.error);
            if (callback) callback(data.error, data.data);
          });

        });
      },
      writeDirAsZip: function (project, base64, callback) {
        if (!this._isConnected) {
          console.log('No connection!');
          return;
        }
        //socket.io
        if (this._socket === null) {
          console.log('socket.io not initialized');
          return;
        }
        if (project.match(/\/$/)) project = project.substring(0, project.length - 1);
        var that = this;
        this.getLiveHost(function (host) {
          if (!host) {
            window.alert('No active host found');
            return;
          }
          that._socket.emit('sendToHost', host, 'writeDirAsZip', {
            id: that.namespace,
            name: project || 'main',
            data: base64
          }, function (data) {
            if (data.error) console.error(data.error);
            if (callback) callback(data.error);
          });

        });
      }
    };

  }

  // Created a connection to the socket adapter
  // For more information, look into the socket adapter documentation (https://github.com/ioBroker/ioBroker.socketio)
  connect(ip: string, port: number) {
    /*****************************************************************************
     ***  set up connection to the ioBroker socketIO adapter                      *
     *****************************************************************************/
    this.servConn.namespace = '';
    this.servConn._useStorage = false;

    return new Promise((resolve, reject) => {

      this.servConn.init({
        name: '',  // optional - default 'vis.0'
        connLink: 'http://' + ip + ':' + port,  // optional URL of the socket.io adapter
        socketSession: ''           // optional - used by authentication
      }, {
        onConnChange: (isConnected) => {
          if (isConnected) {
            console.log('connected');
            let this2 = this; // set this2 as this so this can be used later in the nested function
            this.servConn.getStates(function(err, _states) {
              let count = 0;
              for (let id in _states) {
                count++;
              }
              console.log('Received ' + count + ' states.');
              this2.states = _states; // this2 was set for this purpose earlier

              resolve();
            }, () => {
              console.log('callback');
              reject('error');
            });
          } else {
            console.log('disconnected');
          }
        },
        onRefresh: () => {
          window.location.reload();
        },
        onUpdate: (id, state) => {
          let this2 = this; // set this2 as this so this can be used later in the nested function
          setTimeout(function() {
            this2.states[id] = state; // this2 was set for this purpose earlier so the states array can be updated

            // Data is always being sent to all subscribers of the allDataBehaviourSubject here
            this2.allDataBehaviourSubject.next({id: id, state: state});

            // If the received updated state is included in the registeredGetters array (getters) then the
            // getterBehaviourSubject sends the object to all its subscribers
            this2.getters.map((x, index) => {
              if (x.id === id) {
                this2.getterBehaviourSubject.next({id: id, state: state});
              }
            });
          }, 0);
        },
        onError: (err) => {
          // window.alert(_('Cannot execute %s for %s, because of insufficient permissions', err.command, err.arg), _('Insufficient permissions'), 'alert', 600);
          console.log(err); // the given window alert was giving an error so it was removed
        }
      }, {});
    });
  }

  // Registeres a getter by adding it to the getters array
  registerGetter(object: string, state: string) {
    this.getters.push({id: object + '.' + state});
  }

  // Reads the specific key of the objectstate and returns it
  getter(object: string, state: string, key: string) {
    if (key === '') {
      return this.states[object + '.' + state]
    } else {
      return this.states[object + '.' + state][key];
    }
  }

  // Returns the states array with all current states
  getAllStates() {
    return this.states;
  }

  // Sets a value of an objectstate by using the setState() function of the imported servConn class
  setter(object: string, state: string, value: any) {
    this.servConn.setState(object + '.' + state, value, null);
  }
}
