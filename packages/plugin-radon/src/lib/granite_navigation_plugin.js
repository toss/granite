// Granite Navigation Plugin for Radon IDE
// 단순히 전역 객체 노출용

console.log("🧭 GRANITE NAVIGATION PLUGIN: Starting initialization...");

// Granite Route Map이 전역에 노출되어 있는지 확인
setTimeout(() => {
  console.log("🧭 GRANITE ROUTE MAP 확인:", Boolean(globalThis.__GRANITE_ROUTE_MAP__));
  
  if (globalThis.__GRANITE_ROUTE_MAP__) {
    console.log("🧭 GRANITE ROUTES COUNT:", globalThis.__GRANITE_ROUTE_MAP__.size);
    
    const routes = Array.from(globalThis.__GRANITE_ROUTE_MAP__.keys());
    console.log("🧭 GRANITE AVAILABLE ROUTES:", routes);
    
    // 라우트 정보를 다른 형태로도 노출
    globalThis.__GRANITE_ROUTES_ARRAY__ = routes;
    console.log("✅ GRANITE: 라우트 배열을 __GRANITE_ROUTES_ARRAY__로 노출완료");
  } else {
    console.warn("⚠️ GRANITE: Route Map이 아직 로드되지 않음");
  }
}, 1000);

console.log('🧭 GRANITE NAVIGATION PLUGIN: 전역 객체 노출 완료'); 