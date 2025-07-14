import { useEffect, useRef, useState } from "react";
import { 
  computeRouteIdentifier,
  extractGraniteRouteList,
  sendNavigationChange
} from "./granite_router_helpers.js";

// Granite Router 전역 상태 관리 (Expo Router의 store와 유사)
const graniteStore = {
  currentRoute: { pathname: "/", params: {} },
  routes: [],
  listeners: [],
  
  // Expo Router의 subscribeToRootState와 유사
  subscribeToStateChange: (callback) => {
    graniteStore.listeners.push(callback);
    return () => {
      const index = graniteStore.listeners.indexOf(callback);
      if (index > -1) {
        graniteStore.listeners.splice(index, 1);
      }
    };
  },
  
  // Expo Router의 routeInfoSnapshot과 유사
  routeInfoSnapshot: () => {
    return graniteStore.currentRoute;
  },
  
  // 상태 변경 알림
  notifyStateChange: () => {
    graniteStore.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error("🔥 Radon Runtime: Error in state change listener:", error);
      }
    });
  },
  
  // 라우트 업데이트
  updateRoute: (newRoute) => {
    graniteStore.currentRoute = newRoute;
    graniteStore.notifyStateChange();
  }
};

const getNavigationObject = () => {
  return globalThis.__granite_real_navigation;
};

// 실제 Granite Router와 연결하기 위한 유틸리티
const connectToGraniteRouter = () => {
  try {
    const navigation = getNavigationObject()
    
    if (navigation) {
      return {
        navigate: (pathname, params) => {
          try {
            // React Navigation의 navigate 메소드 사용
            navigation.navigate(pathname, params);
          } catch (error) {
            console.error("🔥 Radon Runtime: Navigation error:", error);
            // Fallback: dispatch 방식 시도
            try {
              navigation.dispatch({
                type: 'NAVIGATE',
                payload: { name: pathname, params }
              });
            } catch (dispatchError) {
              console.error("🔥 Radon Runtime: Dispatch navigation error:", dispatchError);
            }
          }
        },
        back: () => {
          try {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              console.warn("🔥 Radon Runtime: Cannot go back");
            }
          } catch (error) {
            console.error("🔥 Radon Runtime: Back navigation error:", error);
          }
        },
        canGoBack: () => {
          try {
            return navigation.canGoBack();
          } catch (error) {
            return false;
          }
        }
      };
    }
  } catch (error) {
    console.log("🔥 Radon Runtime: Real navigation not found, using fallback",error);
  }
  
  return null;
};

// Granite Router API 초기화 (실제 라우터와 연결 시도)
if (!globalThis.__granite) {
  globalThis.__granite = {};
}

if (!globalThis.__granite.router) {
  globalThis.__granite.router = {
    current: graniteStore.currentRoute,
    navigate: (pathname, params) => {
      const newRoute = { 
        pathname: pathname.startsWith('/') ? pathname : `/${pathname}`, 
        params: params || {} 
      };
      
      // 매번 실제 네비게이션 연결 시도 (dynamic retry)
      const realRouter = connectToGraniteRouter();
      if (realRouter) {
        realRouter.navigate(pathname, params);
      } else {
        console.log("🔥 Radon Runtime: Real navigation not available, updating internal state only");
      }
      
      graniteStore.updateRoute(newRoute);
      globalThis.__granite.router.current = newRoute;
    },
    back: () => {
      const realRouter = connectToGraniteRouter();
      if (realRouter) {
        realRouter.back();
      } else {
        console.log("🔥 Radon Runtime: Real navigation not available for back action");
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
        params: { ...graniteStore.currentRoute.params, ...params }
      };
      graniteStore.updateRoute(newRoute);
      globalThis.__granite.router.current = newRoute;
    },
    
    // RadonIDE용 수동 라우트 등록 함수 (fallback용)
    registerRoute: (route) => {
      if (!globalThis.__GRANITE_MANUAL_ROUTES) {
        globalThis.__GRANITE_MANUAL_ROUTES = [];
      }
      
      // 중복 제거
      const existingIndex = globalThis.__GRANITE_MANUAL_ROUTES.findIndex(r => r.path === route.path);
      if (existingIndex >= 0) {
        globalThis.__GRANITE_MANUAL_ROUTES[existingIndex] = route;
      } else {
        globalThis.__GRANITE_MANUAL_ROUTES.push(route);
      }
    },
    
    // 등록된 라우트 목록 조회
    getRoutes: () => {
      return globalThis.__GRANITE_ROUTES || globalThis.__GRANITE_MANUAL_ROUTES || [];
    }
  };
}

// Granite Router용 useRouter 훅 시뮬레이션
const useGraniteRouter = () => {
  return {
    navigate: globalThis.__granite.router.navigate,
    back: globalThis.__granite.router.back,
    canGoBack: globalThis.__granite.router.canGoBack,
    setParams: globalThis.__granite.router.setParams
  };
};

// 실제 navigation 객체를 전역에 등록하는 헬퍼
globalThis.__granite_register_navigation = (navigation) => {
  globalThis.__granite_real_navigation = navigation;
  
  // 등록 즉시 현재 상태를 Granite store에 동기화
  try {
    const state = navigation.getState();
    if (state && state.routes && state.routes.length > 0) {
      const currentRoute = state.routes[state.index];
      const routeInfo = {
        pathname: currentRoute.name,
        params: currentRoute.params || {}
      };
      
      graniteStore.updateRoute(routeInfo);
    }
  } catch (error) {
    console.log("🔥 Radon Runtime: Could not sync initial state:", error.message);
  }
};

// Granite Router용 useSyncExternalStore 시뮬레이션
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

// 실제 React Navigation state 변경 감지 시스템
const useReactNavigationStateListener = (onNavigationChange) => {
  useEffect(() => {
    let isListenerAdded = false;
    
    const addNavigationListener = () => {
      const navigation = globalThis.__granite_real_navigation;
      if (navigation && navigation.addListener && !isListenerAdded) {
        
        const unsubscribe = navigation.addListener('state', (e) => {
          const state = navigation.getState();
          
          if (state && state.routes && state.routes.length > 0) {
            const currentRoute = state.routes[state.index];
            const routeInfo = {
              pathname: currentRoute.name,
              params: currentRoute.params || {}
            };
            
            graniteStore.updateRoute(routeInfo);
          }
        });
        
        isListenerAdded = true;
        return unsubscribe;
      }
      return null;
    };
    
    // 즉시 시도
    let unsubscribe = addNavigationListener();
    
    // navigation이 나중에 등록될 수 있으므로 주기적으로 재시도
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

// Expo Router 구조와 동일한 main hook
function useGraniteRouterPluginMainHook({ onNavigationChange, onRouteListChange }) {
  
  const router = useGraniteRouter();
  const routeInfo = useGraniteRouteInfo();
  const previousRouteInfo = useRef();
  
  // React Navigation state 변경 감지 (앱 → RadonIDE 동기화)
  useReactNavigationStateListener(onNavigationChange);

  const pathname = routeInfo?.pathname;
  const params = routeInfo?.params;

  // 라우트 리스트 전송 (Granite Router 자동 감지)
  useEffect(() => {
    const routes = globalThis.__GRANITE_ROUTES || [];
    const routeList = extractGraniteRouteList(routes);
    onRouteListChange(routeList);
    
  }, [onRouteListChange]);

  // 네비게이션 변경 감지 (Expo Router와 동일한 방식)
  useEffect(() => {
    sendNavigationChange(previousRouteInfo, routeInfo, onNavigationChange);
  }, [pathname, params, onNavigationChange]);

  // 네비게이션 요청 함수 (Expo Router와 동일한 시그니처)
  function requestNavigationChange({ pathname, params }) {
    
    if (pathname === "__BACK__") {
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

  // Expo Router와 동일한 return 형식
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

// Expo Router와 동일한 플러그인 등록 방식
global.__RNIDE_register_navigation_plugin &&
  global.__RNIDE_register_navigation_plugin("granite-router", { mainHook: useGraniteRouterPluginMainHook });

// Export the hook for wrapper to use
export { useGraniteRouterPluginMainHook };