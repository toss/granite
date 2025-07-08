var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/yallist/iterator.js
var require_iterator = __commonJS({
  "node_modules/yallist/iterator.js"(exports2, module2) {
    "use strict";
    module2.exports = function(Yallist) {
      Yallist.prototype[Symbol.iterator] = function* () {
        for (let walker = this.head; walker; walker = walker.next) {
          yield walker.value;
        }
      };
    };
  }
});

// node_modules/yallist/yallist.js
var require_yallist = __commonJS({
  "node_modules/yallist/yallist.js"(exports2, module2) {
    "use strict";
    module2.exports = Yallist;
    Yallist.Node = Node2;
    Yallist.create = Yallist;
    function Yallist(list) {
      var self = this;
      if (!(self instanceof Yallist)) {
        self = new Yallist();
      }
      self.tail = null;
      self.head = null;
      self.length = 0;
      if (list && typeof list.forEach === "function") {
        list.forEach(function(item) {
          self.push(item);
        });
      } else if (arguments.length > 0) {
        for (var i = 0, l = arguments.length; i < l; i++) {
          self.push(arguments[i]);
        }
      }
      return self;
    }
    Yallist.prototype.removeNode = function(node) {
      if (node.list !== this) {
        throw new Error("removing node which does not belong to this list");
      }
      var next = node.next;
      var prev = node.prev;
      if (next) {
        next.prev = prev;
      }
      if (prev) {
        prev.next = next;
      }
      if (node === this.head) {
        this.head = next;
      }
      if (node === this.tail) {
        this.tail = prev;
      }
      node.list.length--;
      node.next = null;
      node.prev = null;
      node.list = null;
      return next;
    };
    Yallist.prototype.unshiftNode = function(node) {
      if (node === this.head) {
        return;
      }
      if (node.list) {
        node.list.removeNode(node);
      }
      var head = this.head;
      node.list = this;
      node.next = head;
      if (head) {
        head.prev = node;
      }
      this.head = node;
      if (!this.tail) {
        this.tail = node;
      }
      this.length++;
    };
    Yallist.prototype.pushNode = function(node) {
      if (node === this.tail) {
        return;
      }
      if (node.list) {
        node.list.removeNode(node);
      }
      var tail = this.tail;
      node.list = this;
      node.prev = tail;
      if (tail) {
        tail.next = node;
      }
      this.tail = node;
      if (!this.head) {
        this.head = node;
      }
      this.length++;
    };
    Yallist.prototype.push = function() {
      for (var i = 0, l = arguments.length; i < l; i++) {
        push(this, arguments[i]);
      }
      return this.length;
    };
    Yallist.prototype.unshift = function() {
      for (var i = 0, l = arguments.length; i < l; i++) {
        unshift(this, arguments[i]);
      }
      return this.length;
    };
    Yallist.prototype.pop = function() {
      if (!this.tail) {
        return void 0;
      }
      var res = this.tail.value;
      this.tail = this.tail.prev;
      if (this.tail) {
        this.tail.next = null;
      } else {
        this.head = null;
      }
      this.length--;
      return res;
    };
    Yallist.prototype.shift = function() {
      if (!this.head) {
        return void 0;
      }
      var res = this.head.value;
      this.head = this.head.next;
      if (this.head) {
        this.head.prev = null;
      } else {
        this.tail = null;
      }
      this.length--;
      return res;
    };
    Yallist.prototype.forEach = function(fn, thisp) {
      thisp = thisp || this;
      for (var walker = this.head, i = 0; walker !== null; i++) {
        fn.call(thisp, walker.value, i, this);
        walker = walker.next;
      }
    };
    Yallist.prototype.forEachReverse = function(fn, thisp) {
      thisp = thisp || this;
      for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
        fn.call(thisp, walker.value, i, this);
        walker = walker.prev;
      }
    };
    Yallist.prototype.get = function(n) {
      for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
        walker = walker.next;
      }
      if (i === n && walker !== null) {
        return walker.value;
      }
    };
    Yallist.prototype.getReverse = function(n) {
      for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
        walker = walker.prev;
      }
      if (i === n && walker !== null) {
        return walker.value;
      }
    };
    Yallist.prototype.map = function(fn, thisp) {
      thisp = thisp || this;
      var res = new Yallist();
      for (var walker = this.head; walker !== null; ) {
        res.push(fn.call(thisp, walker.value, this));
        walker = walker.next;
      }
      return res;
    };
    Yallist.prototype.mapReverse = function(fn, thisp) {
      thisp = thisp || this;
      var res = new Yallist();
      for (var walker = this.tail; walker !== null; ) {
        res.push(fn.call(thisp, walker.value, this));
        walker = walker.prev;
      }
      return res;
    };
    Yallist.prototype.reduce = function(fn, initial) {
      var acc;
      var walker = this.head;
      if (arguments.length > 1) {
        acc = initial;
      } else if (this.head) {
        walker = this.head.next;
        acc = this.head.value;
      } else {
        throw new TypeError("Reduce of empty list with no initial value");
      }
      for (var i = 0; walker !== null; i++) {
        acc = fn(acc, walker.value, i);
        walker = walker.next;
      }
      return acc;
    };
    Yallist.prototype.reduceReverse = function(fn, initial) {
      var acc;
      var walker = this.tail;
      if (arguments.length > 1) {
        acc = initial;
      } else if (this.tail) {
        walker = this.tail.prev;
        acc = this.tail.value;
      } else {
        throw new TypeError("Reduce of empty list with no initial value");
      }
      for (var i = this.length - 1; walker !== null; i--) {
        acc = fn(acc, walker.value, i);
        walker = walker.prev;
      }
      return acc;
    };
    Yallist.prototype.toArray = function() {
      var arr = new Array(this.length);
      for (var i = 0, walker = this.head; walker !== null; i++) {
        arr[i] = walker.value;
        walker = walker.next;
      }
      return arr;
    };
    Yallist.prototype.toArrayReverse = function() {
      var arr = new Array(this.length);
      for (var i = 0, walker = this.tail; walker !== null; i++) {
        arr[i] = walker.value;
        walker = walker.prev;
      }
      return arr;
    };
    Yallist.prototype.slice = function(from, to) {
      to = to || this.length;
      if (to < 0) {
        to += this.length;
      }
      from = from || 0;
      if (from < 0) {
        from += this.length;
      }
      var ret = new Yallist();
      if (to < from || to < 0) {
        return ret;
      }
      if (from < 0) {
        from = 0;
      }
      if (to > this.length) {
        to = this.length;
      }
      for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
        walker = walker.next;
      }
      for (; walker !== null && i < to; i++, walker = walker.next) {
        ret.push(walker.value);
      }
      return ret;
    };
    Yallist.prototype.sliceReverse = function(from, to) {
      to = to || this.length;
      if (to < 0) {
        to += this.length;
      }
      from = from || 0;
      if (from < 0) {
        from += this.length;
      }
      var ret = new Yallist();
      if (to < from || to < 0) {
        return ret;
      }
      if (from < 0) {
        from = 0;
      }
      if (to > this.length) {
        to = this.length;
      }
      for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
        walker = walker.prev;
      }
      for (; walker !== null && i > from; i--, walker = walker.prev) {
        ret.push(walker.value);
      }
      return ret;
    };
    Yallist.prototype.splice = function(start, deleteCount) {
      if (start > this.length) {
        start = this.length - 1;
      }
      if (start < 0) {
        start = this.length + start;
      }
      for (var i = 0, walker = this.head; walker !== null && i < start; i++) {
        walker = walker.next;
      }
      var ret = [];
      for (var i = 0; walker && i < deleteCount; i++) {
        ret.push(walker.value);
        walker = this.removeNode(walker);
      }
      if (walker === null) {
        walker = this.tail;
      }
      if (walker !== this.head && walker !== this.tail) {
        walker = walker.prev;
      }
      for (var i = 2; i < arguments.length; i++) {
        walker = insert(this, walker, arguments[i]);
      }
      return ret;
    };
    Yallist.prototype.reverse = function() {
      var head = this.head;
      var tail = this.tail;
      for (var walker = head; walker !== null; walker = walker.prev) {
        var p = walker.prev;
        walker.prev = walker.next;
        walker.next = p;
      }
      this.head = tail;
      this.tail = head;
      return this;
    };
    function insert(self, node, value) {
      var inserted = node === self.head ? new Node2(value, null, node, self) : new Node2(value, node, node.next, self);
      if (inserted.next === null) {
        self.tail = inserted;
      }
      if (inserted.prev === null) {
        self.head = inserted;
      }
      self.length++;
      return inserted;
    }
    function push(self, item) {
      self.tail = new Node2(item, self.tail, null, self);
      if (!self.head) {
        self.head = self.tail;
      }
      self.length++;
    }
    function unshift(self, item) {
      self.head = new Node2(item, null, self.head, self);
      if (!self.tail) {
        self.tail = self.head;
      }
      self.length++;
    }
    function Node2(value, prev, next, list) {
      if (!(this instanceof Node2)) {
        return new Node2(value, prev, next, list);
      }
      this.list = list;
      this.value = value;
      if (prev) {
        prev.next = this;
        this.prev = prev;
      } else {
        this.prev = null;
      }
      if (next) {
        next.prev = this;
        this.next = next;
      } else {
        this.next = null;
      }
    }
    try {
      require_iterator()(Yallist);
    } catch (er) {
    }
  }
});

// node_modules/lru-cache/index.js
var require_lru_cache = __commonJS({
  "node_modules/lru-cache/index.js"(exports2, module2) {
    "use strict";
    var Yallist = require_yallist();
    var MAX = Symbol("max");
    var LENGTH = Symbol("length");
    var LENGTH_CALCULATOR = Symbol("lengthCalculator");
    var ALLOW_STALE = Symbol("allowStale");
    var MAX_AGE = Symbol("maxAge");
    var DISPOSE = Symbol("dispose");
    var NO_DISPOSE_ON_SET = Symbol("noDisposeOnSet");
    var LRU_LIST = Symbol("lruList");
    var CACHE = Symbol("cache");
    var UPDATE_AGE_ON_GET = Symbol("updateAgeOnGet");
    var naiveLength = () => 1;
    var LRUCache = class {
      constructor(options) {
        if (typeof options === "number")
          options = { max: options };
        if (!options)
          options = {};
        if (options.max && (typeof options.max !== "number" || options.max < 0))
          throw new TypeError("max must be a non-negative number");
        const max = this[MAX] = options.max || Infinity;
        const lc = options.length || naiveLength;
        this[LENGTH_CALCULATOR] = typeof lc !== "function" ? naiveLength : lc;
        this[ALLOW_STALE] = options.stale || false;
        if (options.maxAge && typeof options.maxAge !== "number")
          throw new TypeError("maxAge must be a number");
        this[MAX_AGE] = options.maxAge || 0;
        this[DISPOSE] = options.dispose;
        this[NO_DISPOSE_ON_SET] = options.noDisposeOnSet || false;
        this[UPDATE_AGE_ON_GET] = options.updateAgeOnGet || false;
        this.reset();
      }
      // resize the cache when the max changes.
      set max(mL) {
        if (typeof mL !== "number" || mL < 0)
          throw new TypeError("max must be a non-negative number");
        this[MAX] = mL || Infinity;
        trim(this);
      }
      get max() {
        return this[MAX];
      }
      set allowStale(allowStale) {
        this[ALLOW_STALE] = !!allowStale;
      }
      get allowStale() {
        return this[ALLOW_STALE];
      }
      set maxAge(mA) {
        if (typeof mA !== "number")
          throw new TypeError("maxAge must be a non-negative number");
        this[MAX_AGE] = mA;
        trim(this);
      }
      get maxAge() {
        return this[MAX_AGE];
      }
      // resize the cache when the lengthCalculator changes.
      set lengthCalculator(lC) {
        if (typeof lC !== "function")
          lC = naiveLength;
        if (lC !== this[LENGTH_CALCULATOR]) {
          this[LENGTH_CALCULATOR] = lC;
          this[LENGTH] = 0;
          this[LRU_LIST].forEach((hit) => {
            hit.length = this[LENGTH_CALCULATOR](hit.value, hit.key);
            this[LENGTH] += hit.length;
          });
        }
        trim(this);
      }
      get lengthCalculator() {
        return this[LENGTH_CALCULATOR];
      }
      get length() {
        return this[LENGTH];
      }
      get itemCount() {
        return this[LRU_LIST].length;
      }
      rforEach(fn, thisp) {
        thisp = thisp || this;
        for (let walker = this[LRU_LIST].tail; walker !== null; ) {
          const prev = walker.prev;
          forEachStep(this, fn, walker, thisp);
          walker = prev;
        }
      }
      forEach(fn, thisp) {
        thisp = thisp || this;
        for (let walker = this[LRU_LIST].head; walker !== null; ) {
          const next = walker.next;
          forEachStep(this, fn, walker, thisp);
          walker = next;
        }
      }
      keys() {
        return this[LRU_LIST].toArray().map((k) => k.key);
      }
      values() {
        return this[LRU_LIST].toArray().map((k) => k.value);
      }
      reset() {
        if (this[DISPOSE] && this[LRU_LIST] && this[LRU_LIST].length) {
          this[LRU_LIST].forEach((hit) => this[DISPOSE](hit.key, hit.value));
        }
        this[CACHE] = /* @__PURE__ */ new Map();
        this[LRU_LIST] = new Yallist();
        this[LENGTH] = 0;
      }
      dump() {
        return this[LRU_LIST].map((hit) => isStale(this, hit) ? false : {
          k: hit.key,
          v: hit.value,
          e: hit.now + (hit.maxAge || 0)
        }).toArray().filter((h) => h);
      }
      dumpLru() {
        return this[LRU_LIST];
      }
      set(key, value, maxAge) {
        maxAge = maxAge || this[MAX_AGE];
        if (maxAge && typeof maxAge !== "number")
          throw new TypeError("maxAge must be a number");
        const now = maxAge ? Date.now() : 0;
        const len = this[LENGTH_CALCULATOR](value, key);
        if (this[CACHE].has(key)) {
          if (len > this[MAX]) {
            del(this, this[CACHE].get(key));
            return false;
          }
          const node = this[CACHE].get(key);
          const item = node.value;
          if (this[DISPOSE]) {
            if (!this[NO_DISPOSE_ON_SET])
              this[DISPOSE](key, item.value);
          }
          item.now = now;
          item.maxAge = maxAge;
          item.value = value;
          this[LENGTH] += len - item.length;
          item.length = len;
          this.get(key);
          trim(this);
          return true;
        }
        const hit = new Entry(key, value, len, now, maxAge);
        if (hit.length > this[MAX]) {
          if (this[DISPOSE])
            this[DISPOSE](key, value);
          return false;
        }
        this[LENGTH] += hit.length;
        this[LRU_LIST].unshift(hit);
        this[CACHE].set(key, this[LRU_LIST].head);
        trim(this);
        return true;
      }
      has(key) {
        if (!this[CACHE].has(key)) return false;
        const hit = this[CACHE].get(key).value;
        return !isStale(this, hit);
      }
      get(key) {
        return get(this, key, true);
      }
      peek(key) {
        return get(this, key, false);
      }
      pop() {
        const node = this[LRU_LIST].tail;
        if (!node)
          return null;
        del(this, node);
        return node.value;
      }
      del(key) {
        del(this, this[CACHE].get(key));
      }
      load(arr) {
        this.reset();
        const now = Date.now();
        for (let l = arr.length - 1; l >= 0; l--) {
          const hit = arr[l];
          const expiresAt = hit.e || 0;
          if (expiresAt === 0)
            this.set(hit.k, hit.v);
          else {
            const maxAge = expiresAt - now;
            if (maxAge > 0) {
              this.set(hit.k, hit.v, maxAge);
            }
          }
        }
      }
      prune() {
        this[CACHE].forEach((value, key) => get(this, key, false));
      }
    };
    var get = (self, key, doUse) => {
      const node = self[CACHE].get(key);
      if (node) {
        const hit = node.value;
        if (isStale(self, hit)) {
          del(self, node);
          if (!self[ALLOW_STALE])
            return void 0;
        } else {
          if (doUse) {
            if (self[UPDATE_AGE_ON_GET])
              node.value.now = Date.now();
            self[LRU_LIST].unshiftNode(node);
          }
        }
        return hit.value;
      }
    };
    var isStale = (self, hit) => {
      if (!hit || !hit.maxAge && !self[MAX_AGE])
        return false;
      const diff = Date.now() - hit.now;
      return hit.maxAge ? diff > hit.maxAge : self[MAX_AGE] && diff > self[MAX_AGE];
    };
    var trim = (self) => {
      if (self[LENGTH] > self[MAX]) {
        for (let walker = self[LRU_LIST].tail; self[LENGTH] > self[MAX] && walker !== null; ) {
          const prev = walker.prev;
          del(self, walker);
          walker = prev;
        }
      }
    };
    var del = (self, node) => {
      if (node) {
        const hit = node.value;
        if (self[DISPOSE])
          self[DISPOSE](hit.key, hit.value);
        self[LENGTH] -= hit.length;
        self[CACHE].delete(hit.key);
        self[LRU_LIST].removeNode(node);
      }
    };
    var Entry = class {
      constructor(key, value, length, now, maxAge) {
        this.key = key;
        this.value = value;
        this.length = length;
        this.now = now;
        this.maxAge = maxAge || 0;
      }
    };
    var forEachStep = (self, fn, node, thisp) => {
      let hit = node.value;
      if (isStale(self, hit)) {
        del(self, node);
        if (!self[ALLOW_STALE])
          hit = void 0;
      }
      if (hit)
        fn.call(thisp, hit.value, hit.key, self);
    };
    module2.exports = LRUCache;
  }
});

// src/index.js
var index_exports = {};
__export(index_exports, {
  Agent: () => Agent,
  createBridge: () => createBridge
});
module.exports = __toCommonJS(index_exports);

// src/events.js
var EventEmitter = class {
  listenersMap = /* @__PURE__ */ new Map();
  addListener(event, listener) {
    const listeners = this.listenersMap.get(event);
    if (listeners === void 0) {
      this.listenersMap.set(event, [listener]);
    } else {
      const index = listeners.indexOf(listener);
      if (index < 0) {
        listeners.push(listener);
      }
    }
  }
  emit(event, ...args) {
    const listeners = this.listenersMap.get(event);
    if (listeners !== void 0) {
      if (listeners.length === 1) {
        const listener = listeners[0];
        listener.apply(null, args);
      } else {
        let didThrow = false;
        let caughtError = null;
        const clonedListeners = Array.from(listeners);
        for (let i = 0; i < clonedListeners.length; i++) {
          const listener = clonedListeners[i];
          try {
            listener.apply(null, args);
          } catch (error) {
            if (caughtError === null) {
              didThrow = true;
              caughtError = error;
            }
          }
        }
        if (didThrow) {
          throw caughtError;
        }
      }
    }
  }
  removeAllListeners() {
    this.listenersMap.clear();
  }
  removeListener(event, listener) {
    const listeners = this.listenersMap.get(event);
    if (listeners !== void 0) {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }
};

// src/constants.js
var __DEBUG__ = false;
var SESSION_STORAGE_LAST_SELECTION_KEY = "React::DevTools::lastSelection";

// src/utils.js
var import_lru_cache = __toESM(require_lru_cache(), 1);

// src/ReactFeatureFlags.js
var renameElementSymbol = true;

// src/ReactSymbols.js
var REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element");
var REACT_ELEMENT_TYPE = renameElementSymbol ? Symbol.for("react.transitional.element") : REACT_LEGACY_ELEMENT_TYPE;
var REACT_PORTAL_TYPE = Symbol.for("react.portal");
var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
var REACT_CONTEXT_TYPE = Symbol.for("react.context");
var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
var REACT_SUSPENSE_LIST_TYPE = Symbol.for(
  "react.suspense_list"
);
var REACT_MEMO_TYPE = Symbol.for("react.memo");
var REACT_LAZY_TYPE = Symbol.for("react.lazy");
var REACT_SCOPE_TYPE = Symbol.for("react.scope");
var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
var REACT_LEGACY_HIDDEN_TYPE = Symbol.for(
  "react.legacy_hidden"
);
var REACT_TRACING_MARKER_TYPE = Symbol.for(
  "react.tracing_marker"
);
var REACT_MEMO_CACHE_SENTINEL = Symbol.for(
  "react.memo_cache_sentinel"
);
var REACT_POSTPONE_TYPE = Symbol.for("react.postpone");
var REACT_VIEW_TRANSITION_TYPE = Symbol.for(
  "react.view_transition"
);

// src/storage.js
function sessionStorageGetItem(key) {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    return null;
  }
}
function sessionStorageRemoveItem(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
  }
}
function sessionStorageSetItem(key, value) {
  try {
    return sessionStorage.setItem(key, value);
  } catch (error) {
  }
}

// src/isArray.js
var isArray = Array.isArray;

// src/utils.js
var encodedStringCache = new import_lru_cache.default({
  max: 1e3
});
var LEGACY_REACT_PROVIDER_TYPE = Symbol.for("react.provider");

// src/hydration.js
var meta = {
  inspectable: Symbol("inspectable"),
  inspected: Symbol("inspected"),
  name: Symbol("name"),
  preview_long: Symbol("preview_long"),
  preview_short: Symbol("preview_short"),
  readonly: Symbol("readonly"),
  size: Symbol("size"),
  type: Symbol("type"),
  unserializable: Symbol("unserializable")
};

// src/backend/utils/index.js
var isReactNativeEnvironment = () => {
  return window.document == null;
};

// src/backend/views/utils.js
function getOwnerWindow(node) {
  if (!node.ownerDocument) {
    return null;
  }
  return node.ownerDocument.defaultView;
}
function getOwnerIframe(node) {
  const nodeWindow = getOwnerWindow(node);
  if (nodeWindow) {
    return nodeWindow.frameElement;
  }
  return null;
}
function getBoundingClientRectWithBorderOffset(node) {
  const dimensions = getElementDimensions(node);
  return mergeRectOffsets([
    node.getBoundingClientRect(),
    {
      top: dimensions.borderTop,
      left: dimensions.borderLeft,
      bottom: dimensions.borderBottom,
      right: dimensions.borderRight,
      // This width and height won't get used by mergeRectOffsets (since this
      // is not the first rect in the array), but we set them so that this
      // object type checks as a ClientRect.
      width: 0,
      height: 0
    }
  ]);
}
function mergeRectOffsets(rects) {
  return rects.reduce((previousRect, rect) => {
    if (previousRect == null) {
      return rect;
    }
    return {
      top: previousRect.top + rect.top,
      left: previousRect.left + rect.left,
      width: previousRect.width,
      height: previousRect.height,
      bottom: previousRect.bottom + rect.bottom,
      right: previousRect.right + rect.right
    };
  });
}
function getNestedBoundingClientRect(node, boundaryWindow) {
  const ownerIframe = getOwnerIframe(node);
  if (ownerIframe && ownerIframe !== boundaryWindow) {
    const rects = [node.getBoundingClientRect()];
    let currentIframe = ownerIframe;
    let onlyOneMore = false;
    while (currentIframe) {
      const rect = getBoundingClientRectWithBorderOffset(currentIframe);
      rects.push(rect);
      currentIframe = getOwnerIframe(currentIframe);
      if (onlyOneMore) {
        break;
      }
      if (currentIframe && getOwnerWindow(currentIframe) === boundaryWindow) {
        onlyOneMore = true;
      }
    }
    return mergeRectOffsets(rects);
  } else {
    return node.getBoundingClientRect();
  }
}
function getElementDimensions(domElement) {
  const calculatedStyle = window.getComputedStyle(domElement);
  return {
    borderLeft: parseInt(calculatedStyle.borderLeftWidth, 10),
    borderRight: parseInt(calculatedStyle.borderRightWidth, 10),
    borderTop: parseInt(calculatedStyle.borderTopWidth, 10),
    borderBottom: parseInt(calculatedStyle.borderBottomWidth, 10),
    marginLeft: parseInt(calculatedStyle.marginLeft, 10),
    marginRight: parseInt(calculatedStyle.marginRight, 10),
    marginTop: parseInt(calculatedStyle.marginTop, 10),
    marginBottom: parseInt(calculatedStyle.marginBottom, 10),
    paddingLeft: parseInt(calculatedStyle.paddingLeft, 10),
    paddingRight: parseInt(calculatedStyle.paddingRight, 10),
    paddingTop: parseInt(calculatedStyle.paddingTop, 10),
    paddingBottom: parseInt(calculatedStyle.paddingBottom, 10)
  };
}
function extractHOCNames(displayName) {
  if (!displayName) return { baseComponentName: "", hocNames: [] };
  const hocRegex = /([A-Z][a-zA-Z0-9]*?)\((.*)\)/g;
  const hocNames = [];
  let baseComponentName = displayName;
  let match;
  while ((match = hocRegex.exec(baseComponentName)) != null) {
    if (Array.isArray(match)) {
      const [, hocName, inner] = match;
      hocNames.push(hocName);
      baseComponentName = inner;
    }
  }
  return {
    baseComponentName,
    hocNames
  };
}

// src/backend/views/Highlighter/Overlay.js
var assign = Object.assign;
var OverlayRect = class {
  node;
  border;
  padding;
  content;
  constructor(doc, container) {
    this.node = doc.createElement("div");
    this.border = doc.createElement("div");
    this.padding = doc.createElement("div");
    this.content = doc.createElement("div");
    this.border.style.borderColor = overlayStyles.border;
    this.padding.style.borderColor = overlayStyles.padding;
    this.content.style.backgroundColor = overlayStyles.background;
    assign(this.node.style, {
      borderColor: overlayStyles.margin,
      pointerEvents: "none",
      position: "fixed"
    });
    this.node.style.zIndex = "10000000";
    this.node.appendChild(this.border);
    this.border.appendChild(this.padding);
    this.padding.appendChild(this.content);
    container.appendChild(this.node);
  }
  remove() {
    if (this.node.parentNode) {
      this.node.parentNode.removeChild(this.node);
    }
  }
  update(box, dims) {
    boxWrap(dims, "margin", this.node);
    boxWrap(dims, "border", this.border);
    boxWrap(dims, "padding", this.padding);
    assign(this.content.style, {
      height: box.height - dims.borderTop - dims.borderBottom - dims.paddingTop - dims.paddingBottom + "px",
      width: box.width - dims.borderLeft - dims.borderRight - dims.paddingLeft - dims.paddingRight + "px"
    });
    assign(this.node.style, {
      top: box.top - dims.marginTop + "px",
      left: box.left - dims.marginLeft + "px"
    });
  }
};
var OverlayTip = class {
  tip;
  nameSpan;
  dimSpan;
  constructor(doc, container) {
    this.tip = doc.createElement("div");
    assign(this.tip.style, {
      display: "flex",
      flexFlow: "row nowrap",
      backgroundColor: "#333740",
      borderRadius: "2px",
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
      fontWeight: "bold",
      padding: "3px 5px",
      pointerEvents: "none",
      position: "fixed",
      fontSize: "12px",
      whiteSpace: "nowrap"
    });
    this.nameSpan = doc.createElement("span");
    this.tip.appendChild(this.nameSpan);
    assign(this.nameSpan.style, {
      color: "#ee78e6",
      borderRight: "1px solid #aaaaaa",
      paddingRight: "0.5rem",
      marginRight: "0.5rem"
    });
    this.dimSpan = doc.createElement("span");
    this.tip.appendChild(this.dimSpan);
    assign(this.dimSpan.style, {
      color: "#d7d7d7"
    });
    this.tip.style.zIndex = "10000000";
    container.appendChild(this.tip);
  }
  remove() {
    if (this.tip.parentNode) {
      this.tip.parentNode.removeChild(this.tip);
    }
  }
  updateText(name, width, height) {
    this.nameSpan.textContent = name;
    this.dimSpan.textContent = Math.round(width) + "px \xD7 " + Math.round(height) + "px";
  }
  updatePosition(dims, bounds) {
    const tipRect = this.tip.getBoundingClientRect();
    const tipPos = findTipPos(dims, bounds, {
      width: tipRect.width,
      height: tipRect.height
    });
    assign(this.tip.style, tipPos.style);
  }
};
var Overlay = class {
  window;
  tipBoundsWindow;
  container;
  tip;
  rects;
  agent;
  constructor(agent2) {
    const currentWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
    this.window = currentWindow;
    const tipBoundsWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
    this.tipBoundsWindow = tipBoundsWindow;
    const doc = currentWindow.document;
    this.container = doc.createElement("div");
    this.container.style.zIndex = "10000000";
    this.tip = new OverlayTip(doc, this.container);
    this.rects = [];
    this.agent = agent2;
    doc.body.appendChild(this.container);
  }
  remove() {
    this.tip.remove();
    this.rects.forEach((rect) => {
      rect.remove();
    });
    this.rects.length = 0;
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
  inspect(nodes, name) {
    const elements = nodes.filter((node) => node.nodeType === Node.ELEMENT_NODE);
    while (this.rects.length > elements.length) {
      const rect = this.rects.pop();
      rect.remove();
    }
    if (elements.length === 0) {
      return;
    }
    while (this.rects.length < elements.length) {
      this.rects.push(new OverlayRect(this.window.document, this.container));
    }
    const outerBox = {
      top: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      bottom: Number.NEGATIVE_INFINITY,
      left: Number.POSITIVE_INFINITY
    };
    elements.forEach((element, index) => {
      const box = getNestedBoundingClientRect(element, this.window);
      const dims = getElementDimensions(element);
      outerBox.top = Math.min(outerBox.top, box.top - dims.marginTop);
      outerBox.right = Math.max(
        outerBox.right,
        box.left + box.width + dims.marginRight
      );
      outerBox.bottom = Math.max(
        outerBox.bottom,
        box.top + box.height + dims.marginBottom
      );
      outerBox.left = Math.min(outerBox.left, box.left - dims.marginLeft);
      const rect = this.rects[index];
      rect.update(box, dims);
    });
    if (!name) {
      name = elements[0].nodeName.toLowerCase();
      const node = elements[0];
      const ownerName = this.agent.getComponentNameForHostInstance(node);
      if (ownerName) {
        name += " (in " + ownerName + ")";
      }
    }
    this.tip.updateText(
      name,
      outerBox.right - outerBox.left,
      outerBox.bottom - outerBox.top
    );
    const tipBounds = getNestedBoundingClientRect(
      this.tipBoundsWindow.document.documentElement,
      this.window
    );
    this.tip.updatePosition(
      {
        top: outerBox.top,
        left: outerBox.left,
        height: outerBox.bottom - outerBox.top,
        width: outerBox.right - outerBox.left
      },
      {
        top: tipBounds.top + this.tipBoundsWindow.scrollY,
        left: tipBounds.left + this.tipBoundsWindow.scrollX,
        height: this.tipBoundsWindow.innerHeight,
        width: this.tipBoundsWindow.innerWidth
      }
    );
  }
};
function findTipPos(dims, bounds, tipSize) {
  const tipHeight = Math.max(tipSize.height, 20);
  const tipWidth = Math.max(tipSize.width, 60);
  const margin = 5;
  let top;
  if (dims.top + dims.height + tipHeight <= bounds.top + bounds.height) {
    if (dims.top + dims.height < bounds.top + 0) {
      top = bounds.top + margin;
    } else {
      top = dims.top + dims.height + margin;
    }
  } else if (dims.top - tipHeight <= bounds.top + bounds.height) {
    if (dims.top - tipHeight - margin < bounds.top + margin) {
      top = bounds.top + margin;
    } else {
      top = dims.top - tipHeight - margin;
    }
  } else {
    top = bounds.top + bounds.height - tipHeight - margin;
  }
  let left = dims.left + margin;
  if (dims.left < bounds.left) {
    left = bounds.left + margin;
  }
  if (dims.left + tipWidth > bounds.left + bounds.width) {
    left = bounds.left + bounds.width - tipWidth - margin;
  }
  top += "px";
  left += "px";
  return {
    style: { top, left }
  };
}
function boxWrap(dims, what, node) {
  assign(node.style, {
    borderTopWidth: dims[what + "Top"] + "px",
    borderLeftWidth: dims[what + "Left"] + "px",
    borderRightWidth: dims[what + "Right"] + "px",
    borderBottomWidth: dims[what + "Bottom"] + "px",
    borderStyle: "solid"
  });
}
var overlayStyles = {
  background: "rgba(120, 170, 210, 0.7)",
  padding: "rgba(77, 200, 0, 0.3)",
  margin: "rgba(255, 155, 0, 0.3)",
  border: "rgba(255, 200, 50, 0.3)"
};

// src/backend/views/Highlighter/Highlighter.js
var SHOW_DURATION = 2e3;
var timeoutID = null;
var overlay = null;
function hideOverlayNative(agent2) {
  agent2.emit("hideNativeHighlight");
}
function hideOverlayWeb() {
  timeoutID = null;
  if (overlay !== null) {
    overlay.remove();
    overlay = null;
  }
}
function hideOverlay(agent2) {
  return isReactNativeEnvironment() ? hideOverlayNative(agent2) : hideOverlayWeb();
}
function showOverlayNative(elements, agent2) {
  agent2.emit("showNativeHighlight", elements);
}
function showOverlayWeb(elements, componentName, agent2, hideAfterTimeout) {
  if (timeoutID !== null) {
    clearTimeout(timeoutID);
  }
  if (overlay === null) {
    overlay = new Overlay(agent2);
  }
  overlay.inspect(elements, componentName);
  if (hideAfterTimeout) {
    timeoutID = setTimeout(() => hideOverlay(agent2), SHOW_DURATION);
  }
}
function showOverlay(elements, componentName, agent2, hideAfterTimeout) {
  return isReactNativeEnvironment() ? showOverlayNative(elements, agent2) : showOverlayWeb(
    elements,
    componentName,
    agent2,
    hideAfterTimeout
  );
}

// src/backend/views/Highlighter/index.js
var iframesListeningTo = /* @__PURE__ */ new Set();
function setupHighlighter(bridge, agent2) {
  bridge.addListener("clearHostInstanceHighlight", clearHostInstanceHighlight);
  bridge.addListener("highlightHostInstance", highlightHostInstance);
  bridge.addListener("shutdown", stopInspectingHost);
  bridge.addListener("startInspectingHost", startInspectingHost);
  bridge.addListener("stopInspectingHost", stopInspectingHost);
  function startInspectingHost() {
    registerListenersOnWindow(window);
  }
  function registerListenersOnWindow(window2) {
    if (window2 && typeof window2.addEventListener === "function") {
      window2.addEventListener("click", onClick, true);
      window2.addEventListener("mousedown", onMouseEvent, true);
      window2.addEventListener("mouseover", onMouseEvent, true);
      window2.addEventListener("mouseup", onMouseEvent, true);
      window2.addEventListener("pointerdown", onPointerDown, true);
      window2.addEventListener("pointermove", onPointerMove, true);
      window2.addEventListener("pointerup", onPointerUp, true);
    } else {
      agent2.emit("startInspectingNative");
    }
  }
  function stopInspectingHost() {
    hideOverlay(agent2);
    removeListenersOnWindow(window);
    iframesListeningTo.forEach(function(frame) {
      try {
        removeListenersOnWindow(frame.contentWindow);
      } catch (error) {
      }
    });
    iframesListeningTo = /* @__PURE__ */ new Set();
  }
  function removeListenersOnWindow(window2) {
    if (window2 && typeof window2.removeEventListener === "function") {
      window2.removeEventListener("click", onClick, true);
      window2.removeEventListener("mousedown", onMouseEvent, true);
      window2.removeEventListener("mouseover", onMouseEvent, true);
      window2.removeEventListener("mouseup", onMouseEvent, true);
      window2.removeEventListener("pointerdown", onPointerDown, true);
      window2.removeEventListener("pointermove", onPointerMove, true);
      window2.removeEventListener("pointerup", onPointerUp, true);
    } else {
      agent2.emit("stopInspectingNative");
    }
  }
  function clearHostInstanceHighlight() {
    hideOverlay(agent2);
  }
  function highlightHostInstance({
    displayName,
    hideAfterTimeout,
    id,
    openBuiltinElementsPanel,
    rendererID,
    scrollIntoView
  }) {
    const renderer = agent2.rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
      hideOverlay(agent2);
      return;
    }
    if (!renderer.hasElementWithId(id)) {
      hideOverlay(agent2);
      return;
    }
    const nodes = renderer.findHostInstancesForElementID(id);
    if (nodes != null && nodes[0] != null) {
      const node = nodes[0];
      if (scrollIntoView && typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      showOverlay(nodes, displayName, agent2, hideAfterTimeout);
      if (openBuiltinElementsPanel) {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0 = node;
        bridge.send("syncSelectionToBuiltinElementsPanel");
      }
    } else {
      hideOverlay(agent2);
    }
  }
  function onClick(event) {
    event.preventDefault();
    event.stopPropagation();
    stopInspectingHost();
    bridge.send("stopInspectingHost", true);
  }
  function onMouseEvent(event) {
    event.preventDefault();
    event.stopPropagation();
  }
  function onPointerDown(event) {
    event.preventDefault();
    event.stopPropagation();
    selectElementForNode(getEventTarget(event));
  }
  let lastHoveredNode = null;
  function onPointerMove(event) {
    event.preventDefault();
    event.stopPropagation();
    const target = getEventTarget(event);
    if (lastHoveredNode === target) return;
    lastHoveredNode = target;
    if (target.tagName === "IFRAME") {
      const iframe = target;
      try {
        if (!iframesListeningTo.has(iframe)) {
          const window2 = iframe.contentWindow;
          registerListenersOnWindow(window2);
          iframesListeningTo.add(iframe);
        }
      } catch (error) {
      }
    }
    showOverlay([target], null, agent2, false);
    selectElementForNode(target);
  }
  function onPointerUp(event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const selectElementForNode = (node) => {
    const id = agent2.getIDForHostInstance(node);
    if (id !== null) {
      bridge.send("selectElement", id);
    }
  };
  function getEventTarget(event) {
    if (event.composed) {
      return event.composedPath()[0];
    }
    return event.target;
  }
}

// src/backend/views/TraceUpdates/canvas.js
var COLORS = [
  "#37afa9",
  "#63b19e",
  "#80b393",
  "#97b488",
  "#abb67d",
  "#beb771",
  "#cfb965",
  "#dfba57",
  "#efbb49",
  "#febc38"
];
var canvas = null;
function drawNative(nodeToData2, agent2) {
  const nodesToDraw = [];
  iterateNodes(nodeToData2, ({ color, node }) => {
    nodesToDraw.push({ node, color });
  });
  agent2.emit("drawTraceUpdates", nodesToDraw);
  const mergedNodes = groupAndSortNodes(nodeToData2);
  agent2.emit("drawGroupedTraceUpdatesWithNames", mergedNodes);
}
function drawWeb(nodeToData2) {
  if (canvas === null) {
    initialize();
  }
  const dpr = window.devicePixelRatio || 1;
  const canvasFlow = canvas;
  canvasFlow.width = window.innerWidth * dpr;
  canvasFlow.height = window.innerHeight * dpr;
  canvasFlow.style.width = `${window.innerWidth}px`;
  canvasFlow.style.height = `${window.innerHeight}px`;
  const context = canvasFlow.getContext("2d");
  context.scale(dpr, dpr);
  context.clearRect(0, 0, canvasFlow.width / dpr, canvasFlow.height / dpr);
  const mergedNodes = groupAndSortNodes(nodeToData2);
  mergedNodes.forEach((group) => {
    drawGroupBorders(context, group);
    drawGroupLabel(context, group);
  });
  if (canvas !== null) {
    if (nodeToData2.size === 0 && canvas.matches(":popover-open")) {
      canvas.hidePopover();
      return;
    }
    if (canvas.matches(":popover-open")) {
      canvas.hidePopover();
    }
    canvas.showPopover();
  }
}
function groupAndSortNodes(nodeToData2) {
  const positionGroups = /* @__PURE__ */ new Map();
  iterateNodes(nodeToData2, ({ rect, color, displayName, count }) => {
    if (!rect) return;
    const key = `${rect.left},${rect.top}`;
    if (!positionGroups.has(key)) positionGroups.set(key, []);
    positionGroups.get(key)?.push({ rect, color, displayName, count });
  });
  return Array.from(positionGroups.values()).sort((groupA, groupB) => {
    const maxCountA = Math.max(...groupA.map((item) => item.count));
    const maxCountB = Math.max(...groupB.map((item) => item.count));
    return maxCountA - maxCountB;
  });
}
function drawGroupBorders(context, group) {
  group.forEach(({ color, rect }) => {
    context.beginPath();
    context.strokeStyle = color;
    context.rect(rect.left, rect.top, rect.width - 1, rect.height - 1);
    context.stroke();
  });
}
function drawGroupLabel(context, group) {
  const mergedName = group.map(
    ({ displayName, count }) => displayName ? `${displayName}${count > 1 ? ` x${count}` : ""}` : ""
  ).filter(Boolean).join(", ");
  if (mergedName) {
    drawLabel(context, group[0].rect, mergedName, group[0].color);
  }
}
function draw(nodeToData2, agent2) {
  return isReactNativeEnvironment() ? drawNative(nodeToData2, agent2) : drawWeb(nodeToData2);
}
function iterateNodes(nodeToData2, execute) {
  nodeToData2.forEach((data, node) => {
    const colorIndex = Math.min(COLORS.length - 1, data.count - 1);
    const color = COLORS[colorIndex];
    execute({
      color,
      node,
      count: data.count,
      displayName: data.displayName,
      expirationTime: data.expirationTime,
      lastMeasuredAt: data.lastMeasuredAt,
      rect: data.rect
    });
  });
}
function drawLabel(context, rect, text, color) {
  const { left, top } = rect;
  context.font = "10px monospace";
  context.textBaseline = "middle";
  context.textAlign = "center";
  const padding = 2;
  const textHeight = 14;
  const metrics = context.measureText(text);
  const backgroundWidth = metrics.width + padding * 2;
  const backgroundHeight = textHeight;
  const labelX = left;
  const labelY = top - backgroundHeight;
  context.fillStyle = color;
  context.fillRect(labelX, labelY, backgroundWidth, backgroundHeight);
  context.fillStyle = "#000000";
  context.fillText(
    text,
    labelX + backgroundWidth / 2,
    labelY + backgroundHeight / 2
  );
}
function destroyNative(agent2) {
  agent2.emit("disableTraceUpdates");
}
function destroyWeb() {
  if (canvas !== null) {
    if (canvas.matches(":popover-open")) {
      canvas.hidePopover();
    }
    if (canvas.parentNode != null) {
      canvas.parentNode.removeChild(canvas);
    }
    canvas = null;
  }
}
function destroy(agent2) {
  return isReactNativeEnvironment() ? destroyNative(agent2) : destroyWeb();
}
function initialize() {
  canvas = window.document.createElement("canvas");
  canvas.setAttribute("popover", "manual");
  canvas.style.cssText = `
    xx-background-color: red;
    xx-opacity: 0.5;
    bottom: 0;
    left: 0;
    pointer-events: none;
    position: fixed;
    right: 0;
    top: 0;
    background-color: transparent;
    outline: none;
    box-shadow: none;
    border: none;
  `;
  const root = window.document.documentElement;
  root.insertBefore(canvas, root.firstChild);
}

// src/backend/views/TraceUpdates/index.js
var DISPLAY_DURATION = 250;
var MAX_DISPLAY_DURATION = 3e3;
var REMEASUREMENT_AFTER_DURATION = 250;
var HOC_MARKERS = /* @__PURE__ */ new Map([
  ["Forget", "\u2728"],
  ["Memo", "\u{1F9E0}"]
]);
var getCurrentTime = (
  // $FlowFixMe[method-unbinding]
  typeof performance === "object" && typeof performance.now === "function" ? () => performance.now() : () => Date.now()
);
var nodeToData = /* @__PURE__ */ new Map();
var agent = null;
var drawAnimationFrameID = null;
var isEnabled = false;
var redrawTimeoutID = null;
function initialize2(injectedAgent) {
  agent = injectedAgent;
  agent.addListener("traceUpdates", traceUpdates);
}
function toggleEnabled(value) {
  isEnabled = value;
  if (!isEnabled) {
    nodeToData.clear();
    if (drawAnimationFrameID !== null) {
      cancelAnimationFrame(drawAnimationFrameID);
      drawAnimationFrameID = null;
    }
    if (redrawTimeoutID !== null) {
      clearTimeout(redrawTimeoutID);
      redrawTimeoutID = null;
    }
    destroy(agent);
  }
}
function traceUpdates(nodes) {
  if (!isEnabled) return;
  nodes.forEach((node) => {
    const data = nodeToData.get(node);
    const now = getCurrentTime();
    let lastMeasuredAt = data != null ? data.lastMeasuredAt : 0;
    let rect = data != null ? data.rect : null;
    if (rect === null || lastMeasuredAt + REMEASUREMENT_AFTER_DURATION < now) {
      lastMeasuredAt = now;
      rect = measureNode(node);
    }
    let displayName = agent.getComponentNameForHostInstance(node);
    if (displayName) {
      const { baseComponentName, hocNames } = extractHOCNames(displayName);
      const markers = hocNames.map((hoc) => HOC_MARKERS.get(hoc) || "").join("");
      const enhancedDisplayName = markers ? `${markers}${baseComponentName}` : baseComponentName;
      displayName = enhancedDisplayName;
    }
    nodeToData.set(node, {
      count: data != null ? data.count + 1 : 1,
      expirationTime: data != null ? Math.min(
        now + MAX_DISPLAY_DURATION,
        data.expirationTime + DISPLAY_DURATION
      ) : now + DISPLAY_DURATION,
      lastMeasuredAt,
      rect,
      displayName
    });
  });
  if (redrawTimeoutID !== null) {
    clearTimeout(redrawTimeoutID);
    redrawTimeoutID = null;
  }
  if (drawAnimationFrameID === null) {
    drawAnimationFrameID = requestAnimationFrame(prepareToDraw);
  }
}
function prepareToDraw() {
  drawAnimationFrameID = null;
  redrawTimeoutID = null;
  const now = getCurrentTime();
  let earliestExpiration = Number.MAX_VALUE;
  nodeToData.forEach((data, node) => {
    if (data.expirationTime < now) {
      nodeToData.delete(node);
    } else {
      earliestExpiration = Math.min(earliestExpiration, data.expirationTime);
    }
  });
  draw(nodeToData, agent);
  if (earliestExpiration !== Number.MAX_VALUE) {
    redrawTimeoutID = setTimeout(prepareToDraw, earliestExpiration - now);
  }
}
function measureNode(node) {
  if (!node || typeof node.getBoundingClientRect !== "function") {
    return null;
  }
  const currentWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
  return getNestedBoundingClientRect(node, currentWindow);
}

// src/bridge.js
var BRIDGE_PROTOCOL = [
  // This version technically never existed,
  // but a backwards breaking change was added in 4.11,
  // so the safest guess to downgrade the frontend would be to version 4.10.
  {
    version: 0,
    minNpmVersion: '"<4.11.0"',
    maxNpmVersion: '"<4.11.0"'
  },
  // Versions 4.11.x – 4.12.x contained the backwards breaking change,
  // but we didn't add the "fix" of checking the protocol version until 4.13,
  // so we don't recommend downgrading to 4.11 or 4.12.
  {
    version: 1,
    minNpmVersion: "4.13.0",
    maxNpmVersion: "4.21.0"
  },
  // Version 2 adds a StrictMode-enabled and supports-StrictMode bits to add-root operation.
  {
    version: 2,
    minNpmVersion: "4.22.0",
    maxNpmVersion: null
  }
];
var currentBridgeProtocol = BRIDGE_PROTOCOL[BRIDGE_PROTOCOL.length - 1];
var Bridge = class extends EventEmitter {
  _isShutdown = false;
  _messageQueue = [];
  _scheduledFlush = false;
  _wall;
  _wallUnlisten = null;
  constructor(wall) {
    super();
    this._wall = wall;
    this._wallUnlisten = wall.listen((message) => {
      if (message && message.event) {
        this.emit(message.event, message.payload);
      }
    }) || null;
    this.addListener("overrideValueAtPath", this.overrideValueAtPath);
  }
  // Listening directly to the wall isn't advised.
  // It can be used to listen for legacy (v3) messages (since they use a different format).
  get wall() {
    return this._wall;
  }
  send(event, ...payload) {
    if (this._isShutdown) {
      console.warn(
        `Cannot send message "${event}" through a Bridge that has been shutdown.`
      );
      return;
    }
    this._messageQueue.push(event, payload);
    if (!this._scheduledFlush) {
      this._scheduledFlush = true;
      if (typeof devtoolsJestTestScheduler === "function") {
        devtoolsJestTestScheduler(this._flush);
      } else {
        queueMicrotask(this._flush);
      }
    }
  }
  shutdown() {
    if (this._isShutdown) {
      console.warn("Bridge was already shutdown.");
      return;
    }
    this.emit("shutdown");
    this.send("shutdown");
    this._isShutdown = true;
    this.addListener = function() {
    };
    this.emit = function() {
    };
    this.removeAllListeners();
    const wallUnlisten = this._wallUnlisten;
    if (wallUnlisten) {
      wallUnlisten();
    }
    do {
      this._flush();
    } while (this._messageQueue.length);
  }
  _flush = () => {
    try {
      if (this._messageQueue.length) {
        for (let i = 0; i < this._messageQueue.length; i += 2) {
          this._wall.send(this._messageQueue[i], ...this._messageQueue[i + 1]);
        }
        this._messageQueue.length = 0;
      }
    } finally {
      this._scheduledFlush = false;
    }
  };
  // Temporarily support older standalone backends by forwarding "overrideValueAtPath" commands
  // to the older message types they may be listening to.
  overrideValueAtPath = ({
    id,
    path,
    rendererID,
    type,
    value
  }) => {
    switch (type) {
      case "context":
        this.send("overrideContext", {
          id,
          path,
          rendererID,
          wasForwarded: true,
          value
        });
        break;
      case "hooks":
        this.send("overrideHookState", {
          id,
          path,
          rendererID,
          wasForwarded: true,
          value
        });
        break;
      case "props":
        this.send("overrideProps", {
          id,
          path,
          rendererID,
          wasForwarded: true,
          value
        });
        break;
      case "state":
        this.send("overrideState", {
          id,
          path,
          rendererID,
          wasForwarded: true,
          value
        });
        break;
    }
  };
};
var bridge_default = Bridge;

// src/backend/agent.js
var debug = (methodName, ...args) => {
  if (__DEBUG__) {
    console.log(
      `%cAgent %c${methodName}`,
      "color: purple; font-weight: bold;",
      "font-weight: bold;",
      ...args
    );
  }
};
var Agent = class extends EventEmitter {
  _bridge;
  _isProfiling = false;
  _rendererInterfaces = {};
  _persistedSelection = null;
  _persistedSelectionMatch = null;
  _traceUpdatesEnabled = false;
  _onReloadAndProfile;
  constructor(bridge, isProfiling = false, onReloadAndProfile) {
    super();
    this._isProfiling = isProfiling;
    this._onReloadAndProfile = onReloadAndProfile;
    const persistedSelectionString = sessionStorageGetItem(
      SESSION_STORAGE_LAST_SELECTION_KEY
    );
    if (persistedSelectionString != null) {
      this._persistedSelection = JSON.parse(persistedSelectionString);
    }
    this._bridge = bridge;
    bridge.addListener("clearErrorsAndWarnings", this.clearErrorsAndWarnings);
    bridge.addListener("clearErrorsForElementID", this.clearErrorsForElementID);
    bridge.addListener(
      "clearWarningsForElementID",
      this.clearWarningsForElementID
    );
    bridge.addListener("copyElementPath", this.copyElementPath);
    bridge.addListener("deletePath", this.deletePath);
    bridge.addListener("getBackendVersion", this.getBackendVersion);
    bridge.addListener("getBridgeProtocol", this.getBridgeProtocol);
    bridge.addListener("getProfilingData", this.getProfilingData);
    bridge.addListener("getProfilingStatus", this.getProfilingStatus);
    bridge.addListener("getOwnersList", this.getOwnersList);
    bridge.addListener("inspectElement", this.inspectElement);
    bridge.addListener("logElementToConsole", this.logElementToConsole);
    bridge.addListener("overrideError", this.overrideError);
    bridge.addListener("overrideSuspense", this.overrideSuspense);
    bridge.addListener("overrideValueAtPath", this.overrideValueAtPath);
    bridge.addListener("reloadAndProfile", this.reloadAndProfile);
    bridge.addListener("renamePath", this.renamePath);
    bridge.addListener("setTraceUpdatesEnabled", this.setTraceUpdatesEnabled);
    bridge.addListener("startProfiling", this.startProfiling);
    bridge.addListener("stopProfiling", this.stopProfiling);
    bridge.addListener("storeAsGlobal", this.storeAsGlobal);
    bridge.addListener(
      "syncSelectionFromBuiltinElementsPanel",
      this.syncSelectionFromBuiltinElementsPanel
    );
    bridge.addListener("shutdown", this.shutdown);
    bridge.addListener("updateHookSettings", this.updateHookSettings);
    bridge.addListener("getHookSettings", this.getHookSettings);
    bridge.addListener("updateComponentFilters", this.updateComponentFilters);
    bridge.addListener("getEnvironmentNames", this.getEnvironmentNames);
    bridge.addListener(
      "getIfHasUnsupportedRendererVersion",
      this.getIfHasUnsupportedRendererVersion
    );
    bridge.addListener("overrideContext", this.overrideContext);
    bridge.addListener("overrideHookState", this.overrideHookState);
    bridge.addListener("overrideProps", this.overrideProps);
    bridge.addListener("overrideState", this.overrideState);
    setupHighlighter(bridge, this);
    initialize2(this);
    bridge.send("backendInitialized");
    if (this._isProfiling) {
      bridge.send("profilingStatus", true);
    }
  }
  get rendererInterfaces() {
    return this._rendererInterfaces;
  }
  clearErrorsAndWarnings = ({
    rendererID
  }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}"`);
    } else {
      renderer.clearErrorsAndWarnings();
    }
  };
  clearErrorsForElementID = ({
    id,
    rendererID
  }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}"`);
    } else {
      renderer.clearErrorsForElementID(id);
    }
  };
  clearWarningsForElementID = ({
    id,
    rendererID
  }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}"`);
    } else {
      renderer.clearWarningsForElementID(id);
    }
  };
  copyElementPath = ({
    id,
    path,
    rendererID
  }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      const value = renderer.getSerializedElementValueByPath(id, path);
      if (value != null) {
        this._bridge.send("saveToClipboard", value);
      } else {
        console.warn(`Unable to obtain serialized value for element "${id}"`);
      }
    }
  };
  deletePath = ({
    hookID,
    id,
    path,
    rendererID,
    type
  }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.deletePath(type, id, hookID, path);
    }
  };
  getInstanceAndStyle({
    id,
    rendererID
  }) {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}"`);
      return null;
    }
    return renderer.getInstanceAndStyle(id);
  }
  getIDForHostInstance(target) {
    if (isReactNativeEnvironment() || typeof target.nodeType !== "number") {
      for (const rendererID in this._rendererInterfaces) {
        const renderer = this._rendererInterfaces[rendererID];
        try {
          const match = renderer.getElementIDForHostInstance(target);
          if (match != null) {
            return match;
          }
        } catch (error) {
        }
      }
      return null;
    } else {
      let bestMatch = null;
      let bestRenderer = null;
      for (const rendererID in this._rendererInterfaces) {
        const renderer = this._rendererInterfaces[rendererID];
        const nearestNode = renderer.getNearestMountedDOMNode(
          target
        );
        if (nearestNode !== null) {
          if (nearestNode === target) {
            bestMatch = nearestNode;
            bestRenderer = renderer;
            break;
          }
          if (bestMatch === null || bestMatch.contains(nearestNode)) {
            bestMatch = nearestNode;
            bestRenderer = renderer;
          }
        }
      }
      if (bestRenderer != null && bestMatch != null) {
        try {
          return bestRenderer.getElementIDForHostInstance(bestMatch);
        } catch (error) {
        }
      }
      return null;
    }
  }
  getComponentNameForHostInstance(target) {
    if (isReactNativeEnvironment() || typeof target.nodeType !== "number") {
      for (const rendererID in this._rendererInterfaces) {
        const renderer = this._rendererInterfaces[rendererID];
        try {
          const id = renderer.getElementIDForHostInstance(target);
          if (id) {
            return renderer.getDisplayNameForElementID(id);
          }
        } catch (error) {
        }
      }
      return null;
    } else {
      let bestMatch = null;
      let bestRenderer = null;
      for (const rendererID in this._rendererInterfaces) {
        const renderer = this._rendererInterfaces[rendererID];
        const nearestNode = renderer.getNearestMountedDOMNode(
          target
        );
        if (nearestNode !== null) {
          if (nearestNode === target) {
            bestMatch = nearestNode;
            bestRenderer = renderer;
            break;
          }
          if (bestMatch === null || bestMatch.contains(nearestNode)) {
            bestMatch = nearestNode;
            bestRenderer = renderer;
          }
        }
      }
      if (bestRenderer != null && bestMatch != null) {
        try {
          const id = bestRenderer.getElementIDForHostInstance(bestMatch);
          if (id) {
            return bestRenderer.getDisplayNameForElementID(id);
          }
        } catch (error) {
        }
      }
      return null;
    }
  }
  getBackendVersion = () => {
    const version = "0.0.0";
    if (version) {
      this._bridge.send("backendVersion", version);
    }
  };
  getBridgeProtocol = () => {
    this._bridge.send("bridgeProtocol", currentBridgeProtocol);
  };
  getProfilingData = ({ rendererID }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}"`);
    }
    this._bridge.send("profilingData", renderer.getProfilingData());
  };
  getProfilingStatus = () => {
    this._bridge.send("profilingStatus", this._isProfiling);
  };
  getOwnersList = ({ id, rendererID }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      const owners = renderer.getOwnersList(id);
      this._bridge.send("ownersList", { id, owners });
    }
  };
  inspectElement = ({
    forceFullData,
    id,
    path,
    rendererID,
    requestID
  }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      this._bridge.send(
        "inspectedElement",
        renderer.inspectElement(requestID, id, path, forceFullData)
      );
      if (this._persistedSelectionMatch === null || this._persistedSelectionMatch.id !== id) {
        this._persistedSelection = null;
        this._persistedSelectionMatch = null;
        renderer.setTrackedPath(null);
        this._lastSelectedElementID = id;
        this._lastSelectedRendererID = rendererID;
        if (!this._persistSelectionTimerScheduled) {
          this._persistSelectionTimerScheduled = true;
          setTimeout(this._persistSelection, 1e3);
        }
      }
    }
  };
  logElementToConsole = ({ id, rendererID }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.logElementToConsole(id);
    }
  };
  overrideError = ({
    id,
    rendererID,
    forceError
  }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.overrideError(id, forceError);
    }
  };
  overrideSuspense = ({
    id,
    rendererID,
    forceFallback
  }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.overrideSuspense(id, forceFallback);
    }
  };
  overrideValueAtPath = ({
    hookID,
    id,
    path,
    rendererID,
    type,
    value
  }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.overrideValueAtPath(type, id, hookID, path, value);
    }
  };
  // Temporarily support older standalone front-ends by forwarding the older message types
  // to the new "overrideValueAtPath" command the backend is now listening to.
  overrideContext = ({
    id,
    path,
    rendererID,
    wasForwarded,
    value
  }) => {
    if (!wasForwarded) {
      this.overrideValueAtPath({
        id,
        path,
        rendererID,
        type: "context",
        value
      });
    }
  };
  // Temporarily support older standalone front-ends by forwarding the older message types
  // to the new "overrideValueAtPath" command the backend is now listening to.
  overrideHookState = ({
    id,
    hookID,
    path,
    rendererID,
    wasForwarded,
    value
  }) => {
    if (!wasForwarded) {
      this.overrideValueAtPath({
        id,
        path,
        rendererID,
        type: "hooks",
        value
      });
    }
  };
  // Temporarily support older standalone front-ends by forwarding the older message types
  // to the new "overrideValueAtPath" command the backend is now listening to.
  overrideProps = ({
    id,
    path,
    rendererID,
    wasForwarded,
    value
  }) => {
    if (!wasForwarded) {
      this.overrideValueAtPath({
        id,
        path,
        rendererID,
        type: "props",
        value
      });
    }
  };
  // Temporarily support older standalone front-ends by forwarding the older message types
  // to the new "overrideValueAtPath" command the backend is now listening to.
  overrideState = ({
    id,
    path,
    rendererID,
    wasForwarded,
    value
  }) => {
    if (!wasForwarded) {
      this.overrideValueAtPath({
        id,
        path,
        rendererID,
        type: "state",
        value
      });
    }
  };
  onReloadAndProfileSupportedByHost = () => {
    this._bridge.send("isReloadAndProfileSupportedByBackend", true);
  };
  reloadAndProfile = ({ recordChangeDescriptions, recordTimeline }) => {
    if (typeof this._onReloadAndProfile === "function") {
      this._onReloadAndProfile(recordChangeDescriptions, recordTimeline);
    }
    this._bridge.send("reloadAppForProfiling");
  };
  renamePath = ({
    hookID,
    id,
    newPath,
    oldPath,
    rendererID,
    type
  }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.renamePath(type, id, hookID, oldPath, newPath);
    }
  };
  selectNode(target) {
    const id = this.getIDForHostInstance(target);
    if (id !== null) {
      this._bridge.send("selectElement", id);
    }
  }
  registerRendererInterface(rendererID, rendererInterface) {
    this._rendererInterfaces[rendererID] = rendererInterface;
    rendererInterface.setTraceUpdatesEnabled(this._traceUpdatesEnabled);
    const selection = this._persistedSelection;
    if (selection !== null && selection.rendererID === rendererID) {
      rendererInterface.setTrackedPath(selection.path);
    }
  }
  setTraceUpdatesEnabled = (traceUpdatesEnabled) => {
    this._traceUpdatesEnabled = traceUpdatesEnabled;
    toggleEnabled(traceUpdatesEnabled);
    for (const rendererID in this._rendererInterfaces) {
      const renderer = this._rendererInterfaces[rendererID];
      renderer.setTraceUpdatesEnabled(traceUpdatesEnabled);
    }
  };
  syncSelectionFromBuiltinElementsPanel = () => {
    const target = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0;
    if (target == null) {
      return;
    }
    this.selectNode(target);
  };
  shutdown = () => {
    this.emit("shutdown");
    this._bridge.removeAllListeners();
    this.removeAllListeners();
  };
  startProfiling = ({ recordChangeDescriptions, recordTimeline }) => {
    this._isProfiling = true;
    for (const rendererID in this._rendererInterfaces) {
      const renderer = this._rendererInterfaces[rendererID];
      renderer.startProfiling(recordChangeDescriptions, recordTimeline);
    }
    this._bridge.send("profilingStatus", this._isProfiling);
  };
  stopProfiling = () => {
    this._isProfiling = false;
    for (const rendererID in this._rendererInterfaces) {
      const renderer = this._rendererInterfaces[rendererID];
      renderer.stopProfiling();
    }
    this._bridge.send("profilingStatus", this._isProfiling);
  };
  stopInspectingNative = (selected) => {
    this._bridge.send("stopInspectingHost", selected);
  };
  storeAsGlobal = ({
    count,
    id,
    path,
    rendererID
  }) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.storeAsGlobal(id, path, count);
    }
  };
  updateHookSettings = (settings) => {
    this.emit("updateHookSettings", settings);
  };
  getHookSettings = () => {
    this.emit("getHookSettings");
  };
  onHookSettings = (settings) => {
    this._bridge.send("hookSettings", settings);
  };
  updateComponentFilters = (componentFilters) => {
    for (const rendererIDString in this._rendererInterfaces) {
      const rendererID = +rendererIDString;
      const renderer = this._rendererInterfaces[rendererID];
      if (this._lastSelectedRendererID === rendererID) {
        const path = renderer.getPathForElement(this._lastSelectedElementID);
        if (path !== null) {
          renderer.setTrackedPath(path);
          this._persistedSelection = {
            rendererID,
            path
          };
        }
      }
      renderer.updateComponentFilters(componentFilters);
    }
  };
  getEnvironmentNames = () => {
    let accumulatedNames = null;
    for (const rendererID in this._rendererInterfaces) {
      const renderer = this._rendererInterfaces[+rendererID];
      const names = renderer.getEnvironmentNames();
      if (accumulatedNames === null) {
        accumulatedNames = names;
      } else {
        for (let i = 0; i < names.length; i++) {
          if (accumulatedNames.indexOf(names[i]) === -1) {
            accumulatedNames.push(names[i]);
          }
        }
      }
    }
    this._bridge.send("environmentNames", accumulatedNames || []);
  };
  onTraceUpdates = (nodes) => {
    this.emit("traceUpdates", nodes);
  };
  onFastRefreshScheduled = () => {
    if (__DEBUG__) {
      debug("onFastRefreshScheduled");
    }
    this._bridge.send("fastRefreshScheduled");
  };
  onHookOperations = (operations) => {
    if (__DEBUG__) {
      debug(
        "onHookOperations",
        `(${operations.length}) [${operations.join(", ")}]`
      );
    }
    this._bridge.send("operations", operations);
    if (this._persistedSelection !== null) {
      const rendererID = operations[0];
      if (this._persistedSelection.rendererID === rendererID) {
        const renderer = this._rendererInterfaces[rendererID];
        if (renderer == null) {
          console.warn(`Invalid renderer id "${rendererID}"`);
        } else {
          const prevMatch = this._persistedSelectionMatch;
          const nextMatch = renderer.getBestMatchForTrackedPath();
          this._persistedSelectionMatch = nextMatch;
          const prevMatchID = prevMatch !== null ? prevMatch.id : null;
          const nextMatchID = nextMatch !== null ? nextMatch.id : null;
          if (prevMatchID !== nextMatchID) {
            if (nextMatchID !== null) {
              this._bridge.send("selectElement", nextMatchID);
            }
          }
          if (nextMatch !== null && nextMatch.isFullMatch) {
            this._persistedSelection = null;
            this._persistedSelectionMatch = null;
            renderer.setTrackedPath(null);
          }
        }
      }
    }
  };
  getIfHasUnsupportedRendererVersion = () => {
    this.emit("getIfHasUnsupportedRendererVersion");
  };
  onUnsupportedRenderer() {
    this._bridge.send("unsupportedRendererVersion");
  }
  _persistSelectionTimerScheduled = false;
  _lastSelectedRendererID = -1;
  _lastSelectedElementID = -1;
  _persistSelection = () => {
    this._persistSelectionTimerScheduled = false;
    const rendererID = this._lastSelectedRendererID;
    const id = this._lastSelectedElementID;
    const renderer = this._rendererInterfaces[rendererID];
    const path = renderer != null ? renderer.getPathForElement(id) : null;
    if (path !== null) {
      sessionStorageSetItem(
        SESSION_STORAGE_LAST_SELECTION_KEY,
        JSON.stringify({ rendererID, path })
      );
    } else {
      sessionStorageRemoveItem(SESSION_STORAGE_LAST_SELECTION_KEY);
    }
  };
};

// src/createBridge.js
function createBridge(contentWindow, wall) {
  const { parent } = contentWindow;
  if (wall == null) {
    wall = {
      listen(fn) {
        const onMessage = ({ data }) => {
          fn(data);
        };
        contentWindow.addEventListener("message", onMessage);
        return () => {
          contentWindow.removeEventListener("message", onMessage);
        };
      },
      send(event, payload, transferable) {
        parent.postMessage({ event, payload }, "*", transferable);
      }
    };
  }
  return new bridge_default(wall);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Agent,
  createBridge
});
