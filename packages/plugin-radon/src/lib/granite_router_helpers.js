/**
 * Granite Router Helper Functions
 * 
 * Helper functions for Granite Router navigation plugin
 * Similar to expo_router_helpers.js but adapted for Granite Router
 */

// Compute a unique identifier for a route based on pathname and params
export function computeRouteIdentifier(pathname, params) {
  if (!params || Object.keys(params).length === 0) {
    return pathname;
  }
  const query = new URLSearchParams(params).toString();
  return query ? `${pathname}?${query}` : pathname;
}

// Check if two navigation descriptors are equal
export function checkNavigationDescriptorsEqual(a, b) {
  if (!a || !b) {
    return false;
  }
  if (a.pathname !== b.pathname) {
    return false;
  }
  if (Object.keys(a.params || {}).length !== Object.keys(b.params || {}).length) {
    return false;
  }
  return Object.keys(a).every(key => deepEqual(a[key], b[key]));
}

// Send navigation change event if the route has actually changed
export function sendNavigationChange(previousRouteInfo, routeInfo, onNavigationChange) {
  console.log("🔥 Radon Runtime: sendNavigationChange called");
  console.log("🔥 Radon Runtime: Previous route:", previousRouteInfo.current);
  console.log("🔥 Radon Runtime: Current route:", routeInfo);
  
  const pathname = routeInfo?.pathname || routeInfo?.name;
  const params = routeInfo?.params || {};
  
  // Create display name with query params
  const displayParams = new URLSearchParams(params).toString();
  const displayName = `${pathname}${displayParams ? `?${displayParams}` : ""}`;
  
  const hasChanged = pathname &&
    (!previousRouteInfo.current ||
     !checkNavigationDescriptorsEqual(previousRouteInfo.current, routeInfo));
  
  console.log("🔥 Radon Runtime: Route changed:", hasChanged);
  
  if (hasChanged) {
    const navigationDescriptor = {
      name: displayName,
      pathname,
      params,
      id: computeRouteIdentifier(pathname, params),
    };
    console.log("🔥 Radon Runtime: Sending navigation descriptor:", navigationDescriptor);
    onNavigationChange(navigationDescriptor);
  }
  previousRouteInfo.current = routeInfo;
}

// Extract route list from Granite Router's routes array (Expo Router style)
export function extractGraniteRouteList(routes) {
  console.log("🔥 Radon Runtime: Extracting Granite route list from:", routes);
  
  if (!routes || !Array.isArray(routes)) {
    console.log("🔥 Radon Runtime: Invalid routes input");
    return [];
  }
  
  const routeList = routes.map(route => {
    return {
      path: route.path,
      filePath: route.filePath || route.path,
      children: route.children || [],
      dynamic: route.dynamic || null,
      type: route.type || "route"
    };
  });
  
  // Expo Router와 동일한 정렬 방식
  const sortedRoutes = routeList.sort((a, b) => {
    const aPath = a.path.split("/");
    const bPath = b.path.split("/");
    if (aPath.length === bPath.length) {
      return a.path.localeCompare(b.path);
    }
    return aPath.length - bPath.length;
  });
  
  console.log("🔥 Radon Runtime: Sorted route list:", sortedRoutes);
  return sortedRoutes;
}

// Parse route information from React Navigation state
export function parseNavigationState(state) {
  if (!state || !state.routes || state.routes.length === 0) {
    return null;
  }
  
  const currentRoute = state.routes[state.index];
  return {
    name: currentRoute.name,
    pathname: currentRoute.name, // Granite Router uses paths like '/', '/about', '/page'
    params: currentRoute.params || {},
    key: currentRoute.key,
    routeNames: state.routeNames || [], // Available route names
    canGoBack: state.index > 0, // Can go back if not at the first route
  };
}

// Deep equality check for comparing navigation descriptors
function deepEqual(x, y) {
  if (x === y) {
    return true;
  }
  if (typeof x !== typeof y) {
    return false;
  }
  if (x && y && typeof x === 'object') {
    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length) {
        return false;
      }
      return x.every((item, i) => deepEqual(item, y[i]));
    }
    if (Array.isArray(x) !== Array.isArray(y)) {
      return false;
    }
    const keysX = Object.keys(x);
    const keysY = Object.keys(y);
    if (keysX.length !== keysY.length) {
      return false;
    }
    return keysX.every(key => deepEqual(x[key], y[key]));
  }
  return false;
} 