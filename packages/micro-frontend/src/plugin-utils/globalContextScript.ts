export const globalContextScript = String.raw`
(function bootstrapMicroFrontendGlobal(globalObject) {
  var canonicalKey = '__MICRO_FRONTEND__';
  var instancesKey = '__INSTANCES__';
  var sharedKey = '__SHARED__';
  var containersKey = '__CONTAINERS__';

  function failure(reason) {
    return new Error('Cannot establish the micro-frontend global context: ' + reason);
  }

  function isRecord(value) {
    return typeof value === 'object' && value != null && !Array.isArray(value);
  }

  function hasKeysInOrder(value, expectedKeys) {
    var actualKeys = Object.keys(value);
    return actualKeys.length === expectedKeys.length && actualKeys.every(function (key, index) {
      return key === expectedKeys[index];
    });
  }

  function hasExactKeySet(value, expectedKeys) {
    var actualKeys = Object.keys(value);
    return actualKeys.length === expectedKeys.length && expectedKeys.every(function (key) {
      return actualKeys.indexOf(key) !== -1;
    });
  }

  function isCanonicalContext(value) {
    return isRecord(value) &&
      hasKeysInOrder(value, [instancesKey, sharedKey, containersKey]) &&
      Array.isArray(value[instancesKey]) &&
      isRecord(value[sharedKey]) &&
      isRecord(value[containersKey]);
  }

  function isLegacyContext(value) {
    return isRecord(value) &&
      hasExactKeySet(value, [instancesKey, sharedKey]) &&
      Array.isArray(value[instancesKey]) &&
      isRecord(value[sharedKey]);
  }

  function restoreProperty(target, key, descriptor) {
    var current = Object.getOwnPropertyDescriptor(target, key) || {};
    var previous = descriptor || {};
    var currentKeys = Object.keys(current);
    var descriptorsMatch = currentKeys.length === Object.keys(previous).length && currentKeys.every(function (property) {
      return Object.is(Reflect.get(current, property), Reflect.get(previous, property));
    });
    if (descriptorsMatch) {
      return;
    }
    if (!(descriptor == null ? Reflect.deleteProperty(target, key) : Reflect.defineProperty(target, key, descriptor))) {
      throw failure('canonical-global-is-not-adoptable');
    }
  }

  var canonicalValue = globalObject[canonicalKey];
  if (canonicalValue != null && !isCanonicalContext(canonicalValue) && !isLegacyContext(canonicalValue)) {
    throw failure('canonical-global-is-not-adoptable');
  }
  if (isCanonicalContext(canonicalValue)) {
    return;
  }

  var canonicalDescriptor = Object.getOwnPropertyDescriptor(globalObject, canonicalKey);
  var legacyHasCanonicalOrder = isLegacyContext(canonicalValue) &&
    hasKeysInOrder(canonicalValue, [instancesKey, sharedKey]);
  if (canonicalDescriptor == null && !Object.isExtensible(globalObject)) {
    throw failure('global-object-is-not-extensible');
  }
  if (canonicalDescriptor != null && !legacyHasCanonicalOrder && canonicalDescriptor.configurable !== true) {
    throw failure('canonical-global-is-locked');
  }

  if (legacyHasCanonicalOrder) {
    var containersDescriptor = Object.getOwnPropertyDescriptor(canonicalValue, containersKey);
    if (!Object.isExtensible(canonicalValue)) {
      throw failure('canonical-global-is-not-adoptable');
    }
    try {
      if (!Reflect.defineProperty(canonicalValue, containersKey, {
        configurable: true,
        enumerable: true,
        value: {},
        writable: true,
      }) || !isCanonicalContext(canonicalValue)) {
        throw failure('canonical-global-is-not-adoptable');
      }
      return;
    } catch (error) {
      restoreProperty(canonicalValue, containersKey, containersDescriptor);
      throw error;
    }
  }

  var context = {
    __INSTANCES__: canonicalValue == null ? [] : canonicalValue[instancesKey],
    __SHARED__: canonicalValue == null ? {} : canonicalValue[sharedKey],
    __CONTAINERS__: {},
  };
  try {
    if (!Reflect.defineProperty(globalObject, canonicalKey, {
      configurable: true,
      enumerable: true,
      value: context,
      writable: true,
    })) {
      throw failure('canonical-global-is-not-adoptable');
    }
  } catch (error) {
    restoreProperty(globalObject, canonicalKey, canonicalDescriptor);
    throw error;
  }
})(global);
`;
