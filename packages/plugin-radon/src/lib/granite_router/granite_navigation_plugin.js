import { useEffect, useRef, useState } from 'react';
import { computeRouteIdentifier, extractGraniteRouteList, sendNavigationChange } from './granite_router_helpers.js';

const graniteStore = {
  currentRoute: { pathname: '/', params: {} },
  routes: [],
  listeners: [],

  subscribeToStateChange: (callback) => {
    graniteStore.listeners.push(callback);
    return () => {
      const index = graniteStore.listeners.indexOf(callback);
      if (index > -1) {
        graniteStore.listeners.splice(index, 1);
      }
    };
  },

  routeInfoSnapshot: () => {
    return graniteStore.currentRoute;
  },

  notifyStateChange: () => {
    graniteStore.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('🔥 Radon Runtime: Error in state change listener:', error);
      }
    });
  },

  // Update route
  updateRoute: (newRoute) => {
    graniteStore.currentRoute = newRoute;
    graniteStore.notifyStateChange();
  },
};

const getNavigationObject = () => {
  return globalThis.__granite_real_navigation;
};

const connectToGraniteRouter = () => {
  try {
    const navigation = getNavigationObject();

    if (navigation) {
      return {
        navigate: (pathname, params) => {
          try {
            navigation.navigate(pathname, params);
          } catch (error) {
            console.error('🔥 Radon Runtime: Navigation error:', error);
            try {
              navigation.dispatch({
                type: 'NAVIGATE',
                payload: { name: pathname, params },
              });
            } catch (dispatchError) {
              console.error('🔥 Radon Runtime: Dispatch navigation error:', dispatchError);
            }
          }
        },
        back: () => {
          try {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              console.warn('🔥 Radon Runtime: Cannot go back');
            }
          } catch (error) {
            console.error('🔥 Radon Runtime: Back navigation error:', error);
          }
        },
        canGoBack: () => {
          try {
            return navigation.canGoBack();
          } catch {
            return false;
          }
        },
      };
    }
  } catch (error) {
    console.log('🔥 Radon Runtime: Real navigation not found, using fallback', error);
  }

  return null;
};

if (!globalThis.__granite) {
  globalThis.__granite = {};
}

if (!globalThis.__granite.router) {
  globalThis.__granite.router = {
    current: graniteStore.currentRoute,
    navigate: (pathname, params) => {
      const newRoute = {
        pathname: pathname.startsWith('/') ? pathname : `/${pathname}`,
        params: params || {},
      };

      const realRouter = connectToGraniteRouter();
      if (realRouter) {
        realRouter.navigate(pathname, params);
      } else {
        console.log('🔥 Radon Runtime: Real navigation not available, updating internal state only');
      }

      graniteStore.updateRoute(newRoute);
      globalThis.__granite.router.current = newRoute;
    },
    back: () => {
      const realRouter = connectToGraniteRouter();
      if (realRouter) {
        realRouter.back();
      } else {
        console.log('🔥 Radon Runtime: Real navigation not available for back action');
      }
    },
    canGoBack: () => {
      const realRouter = connectToGraniteRouter();
      if (realRouter) {
        return realRouter.canGoBack();
      }
      return true; // fallback
    },
    setParams: (params) => {
      const newRoute = {
        ...graniteStore.currentRoute,
        params: { ...graniteStore.currentRoute.params, ...params },
      };
      graniteStore.updateRoute(newRoute);
      globalThis.__granite.router.current = newRoute;
    },

    // Manual route registration function for RadonIDE (fallback)
    registerRoute: (route) => {
      if (!globalThis.__GRANITE_MANUAL_ROUTES) {
        globalThis.__GRANITE_MANUAL_ROUTES = [];
      }

      // Remove duplicates
      const existingIndex = globalThis.__GRANITE_MANUAL_ROUTES.findIndex((r) => r.path === route.path);
      if (existingIndex >= 0) {
        globalThis.__GRANITE_MANUAL_ROUTES[existingIndex] = route;
      } else {
        globalThis.__GRANITE_MANUAL_ROUTES.push(route);
      }
    },

    // Get registered route list
    getRoutes: () => {
      return globalThis.__GRANITE_ROUTES || globalThis.__GRANITE_MANUAL_ROUTES || [];
    },
  };
}

// useRouter hook simulation for Granite Router
const useGraniteRouter = () => {
  return {
    navigate: globalThis.__granite.router.navigate,
    back: globalThis.__granite.router.back,
    canGoBack: globalThis.__granite.router.canGoBack,
    setParams: globalThis.__granite.router.setParams,
  };
};

// Helper to register actual navigation object globally
globalThis.__granite_register_navigation = (navigation) => {
  globalThis.__granite_real_navigation = navigation;

  // Sync current state to Granite store immediately upon registration
  try {
    const state = navigation.getState();
    if (state && state.routes && state.routes.length > 0) {
      const currentRoute = state.routes[state.index];
      const routeInfo = {
        pathname: currentRoute.name,
        params: currentRoute.params || {},
      };

      graniteStore.updateRoute(routeInfo);
    }
  } catch (error) {
    console.log('🔥 Radon Runtime: Could not sync initial state:', error.message);
  }
};

// useSyncExternalStore simulation for Granite Router
const useGraniteRouteInfo = () => {
  const [routeInfo, setRouteInfo] = useState(graniteStore.routeInfoSnapshot());

  useEffect(() => {
    const unsubscribe = graniteStore.subscribeToStateChange(() => {
      const newRouteInfo = graniteStore.routeInfoSnapshot();
      setRouteInfo(newRouteInfo);
    });
    return unsubscribe;
  }, []);

  return routeInfo;
};

// Actual React Navigation state change detection system
const useReactNavigationStateListener = (onNavigationChange) => {
  useEffect(() => {
    let isListenerAdded = false;

    const addNavigationListener = () => {
      const navigation = globalThis.__granite_real_navigation;
      if (navigation && navigation.addListener && !isListenerAdded) {
        const unsubscribe = navigation.addListener('state', () => {
          const state = navigation.getState();

          if (state && state.routes && state.routes.length > 0) {
            const currentRoute = state.routes[state.index];
            const routeInfo = {
              pathname: currentRoute.name,
              params: currentRoute.params || {},
            };

            graniteStore.updateRoute(routeInfo);
          }
        });

        isListenerAdded = true;
        return unsubscribe;
      }
      return null;
    };

    // Try immediately
    let unsubscribe = addNavigationListener();

    // Retry periodically since navigation might be registered later
    const interval = setInterval(() => {
      if (!isListenerAdded) {
        unsubscribe = addNavigationListener();
      }
    }, 1000);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      clearInterval(interval);
    };
  }, [onNavigationChange]);
};

// Main hook identical to Expo Router structure
function useGraniteRouterPluginMainHook({ onNavigationChange, onRouteListChange }) {
  const router = useGraniteRouter();
  const routeInfo = useGraniteRouteInfo();
  const previousRouteInfo = useRef();

  // React Navigation state change detection (App → RadonIDE sync)
  useReactNavigationStateListener(onNavigationChange);

  const pathname = routeInfo?.pathname;
  const params = routeInfo?.params;

  // Send route list (Granite Router auto-detection)
  useEffect(() => {
    const routes = globalThis.__GRANITE_ROUTES || [];
    const routeList = extractGraniteRouteList(routes);
    onRouteListChange(routeList);
  }, [onRouteListChange]);

  // Navigation change detection (same method as Expo Router)
  useEffect(() => {
    sendNavigationChange(previousRouteInfo, routeInfo, onNavigationChange);
  }, [pathname, params, onNavigationChange]);

  // Navigation request function (same signature as Expo Router)
  function requestNavigationChange({ pathname, params }) {
    if (pathname === '__BACK__') {
      if (router.canGoBack()) {
        router.back();
      }
      return;
    }

    router.navigate(pathname);
    if (params && Object.keys(params).length > 0) {
      router.setParams(params);
    }
  }

  // Same return format as Expo Router
  return {
    getCurrentNavigationDescriptor: () => {
      const snapshot = graniteStore.routeInfoSnapshot();
      return {
        name: snapshot.pathname,
        pathname: snapshot.pathname,
        params: snapshot.params,
        id: computeRouteIdentifier(snapshot.pathname, snapshot.params),
      };
    },
    requestNavigationChange: (navigationDescriptor) => {
      requestNavigationChange(navigationDescriptor);
    },
  };
}

// Same plugin registration method as Expo Router
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
global.__RNIDE_register_navigation_plugin &&
  global.__RNIDE_register_navigation_plugin('granite-router', { mainHook: useGraniteRouterPluginMainHook });

// Export the hook for wrapper to use
export { useGraniteRouterPluginMainHook };
