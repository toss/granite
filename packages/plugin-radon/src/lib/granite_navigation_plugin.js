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
    console.log("🔥 Radon Runtime: Added state change listener");
    return () => {
      const index = graniteStore.listeners.indexOf(callback);
      if (index > -1) {
        graniteStore.listeners.splice(index, 1);
        console.log("🔥 Radon Runtime: Removed state change listener");
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
    console.log("🔥 Radon Runtime: Updating route:", newRoute);
    graniteStore.currentRoute = newRoute;
    graniteStore.notifyStateChange();
  }
};

// React Navigation 객체를 찾기 위한 유틸리티
const findNavigationObject = () => {
  try {
    // 직접 등록된 navigation 객체 확인 (가장 우선순위)
    if (globalThis.__granite_real_navigation) {
      console.log("🔥 Radon Runtime: Found registered real navigation object");
      return globalThis.__granite_real_navigation;
    }
    
    // React Navigation의 NavigationContainer ref를 찾기
    if (globalThis.__react_navigation_ref && globalThis.__react_navigation_ref.current) {
      console.log("🔥 Radon Runtime: Found React Navigation ref (global)");
      return globalThis.__react_navigation_ref.current;
    }
    
    // Granite Router의 navigation container ref 확인
    if (globalThis.__granite_navigation_container_ref && globalThis.__granite_navigation_container_ref.current) {
      console.log("🔥 Radon Runtime: Found Granite navigation container ref");
      return globalThis.__granite_navigation_container_ref.current;
    }
    
    // React Native의 네비게이션 레퍼런스 확인
    if (globalThis._reactNavigationNavigationContainer) {
      console.log("🔥 Radon Runtime: Found React Navigation container");
      return globalThis._reactNavigationNavigationContainer;
    }
    
    return null;
  } catch (error) {
    console.error("🔥 Radon Runtime: Error finding navigation object:", error);
    return null;
  }
};

// 실제 Granite Router와 연결하기 위한 유틸리티
const connectToGraniteRouter = () => {
  try {
    const navigation = findNavigationObject();
    
    if (navigation) {
      console.log("🔥 Radon Runtime: Found real navigation object");
      return {
        navigate: (pathname, params) => {
          console.log("🔥 Radon Runtime: Real navigation navigate:", pathname, params);
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
          console.log("🔥 Radon Runtime: Real navigation back");
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
    console.log("🔥 Radon Runtime: Real navigation not found, using fallback");
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
      console.log("🔥 Radon Runtime: Granite Router navigate:", pathname, params);
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
      console.log("🔥 Radon Runtime: Granite Router back navigation");
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
      console.log("🔥 Radon Runtime: Granite Router setParams:", params);
      const newRoute = { 
        ...graniteStore.currentRoute, 
        params: { ...graniteStore.currentRoute.params, ...params }
      };
      graniteStore.updateRoute(newRoute);
      globalThis.__granite.router.current = newRoute;
    },
    
    // RadonIDE용 수동 라우트 등록 함수 (fallback용)
    registerRoute: (route) => {
      console.log("🔥 Radon Runtime: Manually registering route:", route);
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
  console.log("🔥 Radon Runtime: Registering real navigation object");
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
      
      console.log("🔥 Radon Runtime: Initial sync from React Navigation:", routeInfo);
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
      console.log("🔥 Radon Runtime: Granite route info updated:", newRouteInfo);
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
        console.log("🔥 Radon Runtime: Adding React Navigation state listener");
        
        const unsubscribe = navigation.addListener('state', (e) => {
          const state = navigation.getState();
          console.log("🔥 Radon Runtime: React Navigation state changed:", state);
          
          if (state && state.routes && state.routes.length > 0) {
            const currentRoute = state.routes[state.index];
            const routeInfo = {
              pathname: currentRoute.name,
              params: currentRoute.params || {}
            };
            
            console.log("🔥 Radon Runtime: Updating Granite store from React Navigation:", routeInfo);
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
  console.log("🔥 Radon Runtime: useGraniteRouterPluginMainHook initialized");
  
  const router = useGraniteRouter();
  const routeInfo = useGraniteRouteInfo();
  const previousRouteInfo = useRef();
  
  // React Navigation state 변경 감지 (앱 → RadonIDE 동기화)
  useReactNavigationStateListener(onNavigationChange);

  const pathname = routeInfo?.pathname;
  const params = routeInfo?.params;

  // 라우트 리스트 전송 (Granite Router 자동 감지)
  useEffect(() => {
    console.log("🔥 Radon Runtime: Checking for Granite route list changes");
    const routes = globalThis.__GRANITE_ROUTES || [];
    
    if (routes.length > 0) {
      const routeList = extractGraniteRouteList(routes);
      console.log("🔥 Radon Runtime: Sending auto-detected route list:", routeList);
      onRouteListChange(routeList);
    } else {
      console.log("🔥 Radon Runtime: No auto-detected routes found, checking for manual routes");
      
      // Fallback: 수동 등록된 라우트도 확인
      const manualRoutes = globalThis.__GRANITE_MANUAL_ROUTES || [];
      if (manualRoutes.length > 0) {
        const routeList = extractGraniteRouteList(manualRoutes);
        console.log("🔥 Radon Runtime: Sending manual route list:", routeList);
        onRouteListChange(routeList);
      } else {
        console.log("🔥 Radon Runtime: No routes found, will retry in 1 second");
        const timeout = setTimeout(() => {
          const retryRoutes = globalThis.__GRANITE_ROUTES || globalThis.__GRANITE_MANUAL_ROUTES || [];
          if (retryRoutes.length > 0) {
            const routeList = extractGraniteRouteList(retryRoutes);
            console.log("🔥 Radon Runtime: Sending route list (retry):", routeList);
            onRouteListChange(routeList);
          }
        }, 1000);
        return () => clearTimeout(timeout);
      }
    }
  }, [onRouteListChange]);

  // 네비게이션 변경 감지 (Expo Router와 동일한 방식)
  useEffect(() => {
    console.log("🔥 Radon Runtime: Route info changed:", routeInfo);
    sendNavigationChange(previousRouteInfo, routeInfo, onNavigationChange);
  }, [pathname, params, onNavigationChange]);

  // 네비게이션 요청 함수 (Expo Router와 동일한 시그니처)
  function requestNavigationChange({ pathname, params }) {
    console.log("🔥 Radon Runtime: requestNavigationChange called:", { pathname, params });
    
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
      console.log("🔥 Radon Runtime: requestNavigationChange wrapper:", navigationDescriptor);
      // Granite Router는 항상 ready 상태로 가정
      requestNavigationChange(navigationDescriptor);
    },
  };
}

// Expo Router와 동일한 플러그인 등록 방식
global.__RNIDE_register_navigation_plugin &&
  global.__RNIDE_register_navigation_plugin("granite-router", { mainHook: useGraniteRouterPluginMainHook });

// Export the hook for wrapper to use
export { useGraniteRouterPluginMainHook };