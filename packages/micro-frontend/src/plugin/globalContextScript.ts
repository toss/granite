export const globalContextScript = String.raw`
(function bootstrapMicroFrontendGlobal(globalObject) {
  var canonicalKey = '__MICRO_FRONTEND__';
  var compatibilityKey = '_graniteMicroFrontend';
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

  function isCompatibilityContext(value) {
    return isRecord(value) && isRecord(value.containers) && isRecord(value.sharedModules);
  }

  function pendingEntries(target, source) {
    if (source == null || Object.is(target, source)) {
      return [];
    }
    var entries = [];
    Object.keys(source).forEach(function (key) {
      var sourceValue = source[key];
      if (Reflect.has(target, key)) {
        if (!Object.is(target[key], sourceValue)) {
          throw failure('registry-entry-conflict');
        }
        return;
      }
      entries.push([key, sourceValue]);
    });
    if (entries.length > 0 && !Object.isExtensible(target)) {
      throw failure('registry-is-not-extensible');
    }
    return entries;
  }

  function applyPendingEntries(adoptions) {
    var attemptedEntries = [];
    try {
      adoptions.forEach(function (adoption) {
        adoption[1].forEach(function (entry) {
          attemptedEntries.push([adoption[0], entry[0]]);
          if (!Reflect.set(adoption[0], entry[0], entry[1])) {
            throw failure('registry-is-not-extensible');
          }
        });
      });
    } catch (error) {
      attemptedEntries.reverse().forEach(function (entry) {
        Reflect.deleteProperty(entry[0], entry[1]);
      });
      throw error;
    }
    return attemptedEntries;
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
  var compatibilityValue = globalObject[compatibilityKey];
  if (canonicalValue != null && !isCanonicalContext(canonicalValue) && !isLegacyContext(canonicalValue)) {
    throw failure('canonical-global-is-not-adoptable');
  }
  if (compatibilityValue != null && !isCompatibilityContext(compatibilityValue)) {
    throw failure('compatibility-global-is-not-adoptable');
  }

  var canonicalDescriptor = Object.getOwnPropertyDescriptor(globalObject, canonicalKey);
  var compatibilityDescriptor = Object.getOwnPropertyDescriptor(globalObject, compatibilityKey);
  var canonicalNeedsReplacement = isLegacyContext(canonicalValue) &&
    !hasKeysInOrder(canonicalValue, [instancesKey, sharedKey]);
  if ((canonicalDescriptor == null || compatibilityDescriptor == null) && !Object.isExtensible(globalObject)) {
    throw failure('global-object-is-not-extensible');
  }
  if (canonicalDescriptor != null &&
      (canonicalValue == null || canonicalNeedsReplacement) &&
      canonicalDescriptor.configurable !== true) {
    throw failure('canonical-global-is-locked');
  }
  if (compatibilityDescriptor != null && compatibilityDescriptor.configurable !== true) {
    throw failure('compatibility-global-is-locked');
  }

  var adoptedContext = canonicalValue == null ? {
    __INSTANCES__: [],
    __SHARED__: compatibilityValue == null ? {} : compatibilityValue.sharedModules,
    __CONTAINERS__: compatibilityValue == null ? {} : compatibilityValue.containers,
  } : canonicalValue;
  var canonicalContainers = isCanonicalContext(adoptedContext) ? adoptedContext[containersKey] : {};
  var sharedEntries = pendingEntries(
    adoptedContext[sharedKey],
    compatibilityValue == null ? undefined : compatibilityValue.sharedModules
  );
  var containerEntries = pendingEntries(
    canonicalContainers,
    compatibilityValue == null ? undefined : compatibilityValue.containers
  );
  var canonicalDescriptorBefore = Object.getOwnPropertyDescriptor(globalObject, canonicalKey);
  var compatibilityDescriptorBefore = Object.getOwnPropertyDescriptor(globalObject, compatibilityKey);
  var containersDescriptorBefore = Object.getOwnPropertyDescriptor(adoptedContext, containersKey);
  var adoptedEntries = [];
  var context;
  try {
    if (isCanonicalContext(adoptedContext)) {
      context = adoptedContext;
    } else if (hasKeysInOrder(adoptedContext, [instancesKey, sharedKey])) {
      if (!Object.isExtensible(adoptedContext)) {
        throw failure('canonical-global-is-not-adoptable');
      }
      if (!Reflect.defineProperty(adoptedContext, containersKey, {
        configurable: true,
        enumerable: true,
        value: canonicalContainers,
        writable: true,
      })) {
        throw failure('canonical-global-is-not-adoptable');
      }
      context = adoptedContext;
    } else {
      context = {
        __INSTANCES__: adoptedContext[instancesKey],
        __SHARED__: adoptedContext[sharedKey],
        __CONTAINERS__: canonicalContainers,
      };
    }

    var adapter = compatibilityValue != null &&
      Object.is(compatibilityValue.containers, context[containersKey]) &&
      Object.is(compatibilityValue.sharedModules, context[sharedKey])
        ? compatibilityValue
        : { containers: context[containersKey], sharedModules: context[sharedKey] };
    if (!Object.is(canonicalValue, context) && !Reflect.defineProperty(globalObject, canonicalKey, {
        configurable: true,
        enumerable: true,
        value: context,
        writable: true,
      })) {
      throw failure('canonical-global-is-not-adoptable');
    }
    adoptedEntries = applyPendingEntries([
      [context[sharedKey], sharedEntries],
      [context[containersKey], containerEntries],
    ]);
    if (!Reflect.defineProperty(globalObject, compatibilityKey, {
      configurable: true,
      enumerable: true,
      get: function () { return adapter; },
      set: function (nextValue) {
        if (!Object.is(nextValue, adapter)) {
          throw failure('compatibility-global-is-not-adoptable');
        }
      },
    })) {
      throw failure('compatibility-global-is-not-adoptable');
    }
  } catch (error) {
    adoptedEntries.reverse().forEach(function (entry) {
      Reflect.deleteProperty(entry[0], entry[1]);
    });
    restoreProperty(globalObject, compatibilityKey, compatibilityDescriptorBefore);
    restoreProperty(globalObject, canonicalKey, canonicalDescriptorBefore);
    restoreProperty(adoptedContext, containersKey, containersDescriptorBefore);
    throw error;
  }
})(global);
`;
