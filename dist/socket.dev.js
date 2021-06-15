"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var __importDefault = void 0 && (void 0).__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Socket = exports.RESERVED_EVENTS = void 0;

var socket_io_parser_1 = require("socket.io-parser");

var url = require("url");

var debug_1 = __importDefault(require("debug"));

var typed_events_1 = require("socket.io/dist/typed-events");

var base64id_1 = __importDefault(require("base64id"));

var broadcast_operator_1 = require("socket.io/dist/broadcast-operator");

var debug = debug_1["default"]("socket.io:socket");
exports.RESERVED_EVENTS = new Set(["connect", "connect_error", "disconnect", "disconnecting", "newListener", "removeListener"]);

var Socket =
/*#__PURE__*/
function (_typed_events_1$Stric) {
  _inherits(Socket, _typed_events_1$Stric);

  /**
   * Interface to a `Client` for a given `Namespace`.
   *
   * @param {Namespace} nsp
   * @param {Client} client
   * @param {Object} auth
   * @package
   */
  function Socket(nsp, client, auth) {
    var _this;

    _classCallCheck(this, Socket);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Socket).call(this));
    _this.nsp = nsp;
    _this.client = client;
    /**
     * Additional information that can be attached to the Socket instance and which will be used in the fetchSockets method
     */

    _this.data = {};
    _this.acks = new Map();
    _this.fns = [];
    _this.flags = {};
    _this.server = nsp.server;
    _this.adapter = _this.nsp.adapter;

    if (client.conn.protocol === 3) {
      // @ts-ignore
      _this.id = nsp.name !== "/" ? nsp.name + "#" + client.id : client.id;
    } else {
      _this.id = base64id_1["default"].generateId(); // don't reuse the Engine.IO id because it's sensitive information
    }

    _this.connected = true;
    _this.disconnected = false;
    _this.handshake = _this.buildHandshake(auth);
    return _this;
  }
  /**
   * Builds the `handshake` BC object
   *
   * @private
   */


  _createClass(Socket, [{
    key: "buildHandshake",
    value: function buildHandshake(auth) {
      return {
        headers: this.request.headers,
        time: new Date() + "",
        address: this.conn.remoteAddress,
        xdomain: !!this.request.headers.origin,
        // @ts-ignore
        secure: !!this.request.connection.encrypted,
        issued: +new Date(),
        url: this.request.url,
        query: url.parse(this.request.url, true).query,
        auth: auth
      };
    }
    /**
     * Emits to this client.
     *
     * @return Always returns `true`.
     * @public
     */

  }, {
    key: "emit",
    value: function emit(ev) {
      if (exports.RESERVED_EVENTS.has(ev)) {
        throw new Error("\"".concat(ev, "\" is a reserved event name"));
      }

      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var data = [ev].concat(args);
      var packet = {
        type: socket_io_parser_1.PacketType.EVENT,
        data: data
      }; // access last argument to see if it's an ACK callback

      if (typeof data[data.length - 1] === "function") {
        debug("emitting packet with ack id %d", this.nsp._ids);
        this.acks.set(this.nsp._ids, data.pop());
        packet.id = this.nsp._ids++;
      }

      var flags = Object.assign({}, this.flags);
      this.flags = {};
      this.packet(packet, flags);
      return true;
    }
    /**
     * Targets a room when broadcasting.
     *
     * @param room
     * @return self
     * @public
     */

  }, {
    key: "to",
    value: function to(room) {
      return this.newBroadcastOperator().to(room);
    }
    /**
     * Targets a room when broadcasting.
     *
     * @param room
     * @return self
     * @public
     */

  }, {
    key: "in",
    value: function _in(room) {
      return this.newBroadcastOperator()["in"](room);
    }
    /**
     * Excludes a room when broadcasting.
     *
     * @param room
     * @return self
     * @public
     */

  }, {
    key: "except",
    value: function except(room) {
      return this.newBroadcastOperator().except(room);
    }
    /**
     * Sends a `message` event.
     *
     * @return self
     * @public
     */

  }, {
    key: "send",
    value: function send() {
      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      this.emit.apply(this, ["message"].concat(args));
      return this;
    }
    /**
     * Sends a `message` event.
     *
     * @return self
     * @public
     */

  }, {
    key: "write",
    value: function write() {
      for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }

      this.emit.apply(this, ["message"].concat(args));
      return this;
    }
    /**
     * Writes a packet.
     *
     * @param {Object} packet - packet object
     * @param {Object} opts - options
     * @private
     */

  }, {
    key: "packet",
    value: function packet(_packet) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      _packet.nsp = this.nsp.name;
      opts.compress = false !== opts.compress;

      this.client._packet(_packet, opts);
    }
    /**
     * Joins a room.
     *
     * @param {String|Array} rooms - room or array of rooms
     * @return a Promise or nothing, depending on the adapter
     * @public
     */

  }, {
    key: "join",
    value: function join(rooms) {
      debug("join room %s", rooms);
      return this.adapter.addAll(this.id, new Set(Array.isArray(rooms) ? rooms : [rooms]));
    }
    /**
     * Leaves a room.
     *
     * @param {String} room
     * @return a Promise or nothing, depending on the adapter
     * @public
     */

  }, {
    key: "leave",
    value: function leave(room) {
      debug("leave room %s", room);
      return this.adapter.del(this.id, room);
    }
    /**
     * Leave all rooms.
     *
     * @private
     */

  }, {
    key: "leaveAll",
    value: function leaveAll() {
      this.adapter.delAll(this.id);
    }
    /**
     * Called by `Namespace` upon successful
     * middleware execution (ie: authorization).
     * Socket is added to namespace array before
     * call to join, so adapters can access it.
     *
     * @private
     */

  }, {
    key: "_onconnect",
    value: function _onconnect() {
      debug("socket connected - writing packet");
      this.join(this.id);

      if (this.conn.protocol === 3) {
        this.packet({
          type: socket_io_parser_1.PacketType.CONNECT
        });
      } else {
        this.packet({
          type: socket_io_parser_1.PacketType.CONNECT,
          data: {
            sid: this.id
          }
        });
      }
    }
    /**
     * Called with each packet. Called by `Client`.
     *
     * @param {Object} packet
     * @private
     */

  }, {
    key: "_onpacket",
    value: function _onpacket(packet) {
      debug("got packet %j", packet);

      switch (packet.type) {
        case socket_io_parser_1.PacketType.EVENT:
          this.onevent(packet);
          break;

        case socket_io_parser_1.PacketType.BINARY_EVENT:
          this.onevent(packet);
          break;

        case socket_io_parser_1.PacketType.ACK:
          this.onack(packet);
          break;

        case socket_io_parser_1.PacketType.BINARY_ACK:
          this.onack(packet);
          break;

        case socket_io_parser_1.PacketType.DISCONNECT:
          this.ondisconnect();
          break;

        case socket_io_parser_1.PacketType.CONNECT_ERROR:
          this._onerror(new Error(packet.data));

      }
    }
    /**
     * Called upon event packet.
     *
     * @param {Packet} packet - packet object
     * @private
     */

  }, {
    key: "onevent",
    value: function onevent(packet) {
      var args = packet.data || [];
      debug("emitting event %j", args);

      if (null != packet.id) {
        debug("attaching ack callback to event");
        args.push(this.ack(packet.id));
      }

      if (this._anyListeners && this._anyListeners.length) {
        var listeners = this._anyListeners.slice();

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = listeners[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var listener = _step.value;
            listener.apply(this, args);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"] != null) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }

      this.dispatch(args);
    }
    /**
     * Produces an ack callback to emit with an event.
     *
     * @param {Number} id - packet id
     * @private
     */

  }, {
    key: "ack",
    value: function ack(id) {
      var self = this;
      var sent = false;
      return function () {
        // prevent double callbacks
        if (sent) return;
        var args = Array.prototype.slice.call(arguments);
        debug("sending ack %j", args);
        self.packet({
          id: id,
          type: socket_io_parser_1.PacketType.ACK,
          data: args
        });
        sent = true;
      };
    }
    /**
     * Called upon ack packet.
     *
     * @private
     */

  }, {
    key: "onack",
    value: function onack(packet) {
      var ack = this.acks.get(packet.id);

      if ("function" == typeof ack) {
        debug("calling ack %s with %j", packet.id, packet.data);
        ack.apply(this, packet.data);
        this.acks["delete"](packet.id);
      } else {
        debug("bad ack %s", packet.id);
      }
    }
    /**
     * Called upon client disconnect packet.
     *
     * @private
     */

  }, {
    key: "ondisconnect",
    value: function ondisconnect() {
      debug("got disconnect packet");

      this._onclose("client namespace disconnect");
    }
    /**
     * Handles a client error.
     *
     * @private
     */

  }, {
    key: "_onerror",
    value: function _onerror(err) {
      if (this.listeners("error").length) {
        this.emitReserved("error", err);
      } else {
        console.error("Missing error handler on `socket`.");
        console.error(err.stack);
      }
    }
    /**
     * Called upon closing. Called by `Client`.
     *
     * @param {String} reason
     * @throw {Error} optional error object
     *
     * @private
     */

  }, {
    key: "_onclose",
    value: function _onclose(reason) {
      if (!this.connected) return this;
      debug("closing socket - reason %s", reason);
      this.emitReserved("disconnecting", reason);
      this.leaveAll();

      this.nsp._remove(this);

      this.client._remove(this);

      this.connected = false;
      this.disconnected = true;
      this.emitReserved("disconnect", reason);
      return;
    }
    /**
     * Produces an `error` packet.
     *
     * @param {Object} err - error object
     *
     * @private
     */

  }, {
    key: "_error",
    value: function _error(err) {
      this.packet({
        type: socket_io_parser_1.PacketType.CONNECT_ERROR,
        data: err
      });
    }
    /**
     * Disconnects this client.
     *
     * @param {Boolean} close - if `true`, closes the underlying connection
     * @return {Socket} self
     *
     * @public
     */

  }, {
    key: "disconnect",
    value: function disconnect() {
      var close = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      if (!this.connected) return this;

      if (close) {
        this.client._disconnect();
      } else {
        this.packet({
          type: socket_io_parser_1.PacketType.DISCONNECT
        });

        this._onclose("server namespace disconnect");
      }

      return this;
    }
    /**
     * Sets the compress flag.
     *
     * @param {Boolean} compress - if `true`, compresses the sending data
     * @return {Socket} self
     * @public
     */

  }, {
    key: "compress",
    value: function compress(_compress) {
      this.flags.compress = _compress;
      return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the event data may be lost if the client is not ready to
     * receive messages (because of network slowness or other issues, or because they’re connected through long polling
     * and is in the middle of a request-response cycle).
     *
     * @return {Socket} self
     * @public
     */

  }, {
    key: "dispatch",

    /**
     * Dispatch incoming event to socket listeners.
     *
     * @param {Array} event - event that will get emitted
     * @private
     */
    value: function dispatch(event) {
      var _this2 = this;

      debug("dispatching an event %j", event);
      this.run(event, function (err) {
        process.nextTick(function () {
          if (err) {
            return _this2._onerror(err);
          }

          if (_this2.connected) {
            _get(_getPrototypeOf(Socket.prototype), "emitUntyped", _this2).apply(_this2, event);
          } else {
            debug("ignore packet received after disconnection");
          }
        });
      });
    }
    /**
     * Sets up socket middleware.
     *
     * @param {Function} fn - middleware function (event, next)
     * @return {Socket} self
     * @public
     */

  }, {
    key: "use",
    value: function use(fn) {
      this.fns.push(fn);
      return this;
    }
    /**
     * Executes the middleware for an incoming event.
     *
     * @param {Array} event - event that will get emitted
     * @param {Function} fn - last fn call in the middleware
     * @private
     */

  }, {
    key: "run",
    value: function run(event, fn) {
      var fns = this.fns.slice(0);
      if (!fns.length) return fn(null);

      function run(i) {
        fns[i](event, function (err) {
          // upon error, short-circuit
          if (err) return fn(err); // if no middleware left, summon callback

          if (!fns[i + 1]) return fn(null); // go on to next

          run(i + 1);
        });
      }

      run(0);
    }
    /**
     * A reference to the request that originated the underlying Engine.IO Socket.
     *
     * @public
     */

  }, {
    key: "onAny",

    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * @param listener
     * @public
     */
    value: function onAny(listener) {
      this._anyListeners = this._anyListeners || [];

      this._anyListeners.push(listener);

      return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * @param listener
     * @public
     */

  }, {
    key: "prependAny",
    value: function prependAny(listener) {
      this._anyListeners = this._anyListeners || [];

      this._anyListeners.unshift(listener);

      return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @param listener
     * @public
     */

  }, {
    key: "offAny",
    value: function offAny(listener) {
      if (!this._anyListeners) {
        return this;
      }

      if (listener) {
        var listeners = this._anyListeners;

        for (var i = 0; i < listeners.length; i++) {
          if (listener === listeners[i]) {
            listeners.splice(i, 1);
            return this;
          }
        }
      } else {
        this._anyListeners = [];
      }

      return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     *
     * @public
     */

  }, {
    key: "listenersAny",
    value: function listenersAny() {
      return this._anyListeners || [];
    }
  }, {
    key: "newBroadcastOperator",
    value: function newBroadcastOperator() {
      var flags = Object.assign({}, this.flags);
      this.flags = {};
      return new broadcast_operator_1.BroadcastOperator(this.adapter, new Set(), new Set([this.id]), flags);
    }
  }, {
    key: "volatile",
    get: function get() {
      this.flags["volatile"] = true;
      return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the event data will only be broadcast to every sockets but the
     * sender.
     *
     * @return {Socket} self
     * @public
     */

  }, {
    key: "broadcast",
    get: function get() {
      return this.newBroadcastOperator();
    }
    /**
     * Sets a modifier for a subsequent event emission that the event data will only be broadcast to the current node.
     *
     * @return {Socket} self
     * @public
     */

  }, {
    key: "local",
    get: function get() {
      return this.newBroadcastOperator().local;
    }
  }, {
    key: "request",
    get: function get() {
      return this.client.request;
    }
    /**
     * A reference to the underlying Client transport connection (Engine.IO Socket object).
     *
     * @public
     */

  }, {
    key: "conn",
    get: function get() {
      return this.client.conn;
    }
    /**
     * @public
     */

  }, {
    key: "rooms",
    get: function get() {
      return this.adapter.socketRooms(this.id) || new Set();
    }
  }]);

  return Socket;
}(typed_events_1.StrictEventEmitter);

exports.Socket = Socket;