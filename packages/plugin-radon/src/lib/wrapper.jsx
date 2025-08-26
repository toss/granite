const { useContext, useState, useEffect, useRef, useCallback } = require('react');
const { LogBox, AppRegistry, Dimensions, RootTagContext, View, Linking, findNodeHandle } = require('react-native');

const inspectorBridge = globalThis.__RADON_INSPECTOR_BRIDGE__;
const RNInternals = require('./vendor/rn-internals/rn-internals-0.72.js');

const OffscreenComponentReactTag = 22;

const navigationPlugins = [];
export function registerNavigationPlugin(name, plugin) {
  navigationPlugins.push({ name, plugin });
}

let graniteNavigationPlugin = null;
if (globalThis.__GRANITE_ROUTER_DETECTED__) {
  try {
    graniteNavigationPlugin = require('./granite_router/granite_navigation_plugin.js');

    // Register plugin immediately
    if (graniteNavigationPlugin && graniteNavigationPlugin.useGraniteRouterPluginMainHook) {
      console.log('🔥 Radon Runtime: Registering Granite navigation plugin immediately');
      registerNavigationPlugin('granite-router', {
        mainHook: graniteNavigationPlugin.useGraniteRouterPluginMainHook,
      });
    }
  } catch (error) {
    console.log('⚠️ Radon Runtime: Could not load Granite navigation plugin:', error.message);
  }
}

const devtoolPlugins = new Set(['network']);
let devtoolPluginsChanged = undefined;
export function registerDevtoolPlugin(name) {
  devtoolPlugins.add(name);
  devtoolPluginsChanged?.();
}

let navigationHistory = new Map();

const InternalImports = {
  get PREVIEW_APP_KEY() {
    return require('./preview').PREVIEW_APP_KEY;
  },
  get setupNetworkPlugin() {
    return require('./network').setup;
  },
  get reduxDevtoolsExtensionCompose() {
    return require('./vendor/plugins/redux-devtools').compose;
  },
  get setupRenderOutlinesPlugin() {
    return require('./render_outlines').setup;
  },
};

window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = function (...args) {
  return InternalImports.reduxDevtoolsExtensionCompose(...args);
};

function getCurrentScene() {
  return RNInternals.SceneTracker.getActiveScene().name;
}

function emptyNavigationHook() {
  return {
    getCurrentNavigationDescriptor: () => undefined,
    requestNavigationChange: () => {},
  };
}

function getRendererConfig() {
  const renderers = Array.from(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.values());
  if (!renderers) {
    return undefined;
  }
  for (const renderer of renderers) {
    if (renderer.rendererConfig?.getInspectorDataForInstance) {
      return renderer.rendererConfig;
    }
  }
  return undefined;
}

function extractComponentStack(startNode, viewDataHierarchy) {
  const componentStack = [];

  // Detect React Native version
  let rnVersion = '0.72';
  try {
    const rnPackage = require('react-native/package.json');
    rnVersion = rnPackage.version;
  } catch (e) {}

  const majorMinor = rnVersion.split('.').slice(0, 2).join('.');
  const versionNumber = parseFloat(majorMinor);

  // Internal component filtering function
  const isInternalComponent = (fileName) => {
    return (
      fileName.includes('node_modules/react-native/') ||
      fileName.includes('node_modules/@react-navigation/') ||
      fileName.includes('/react-native/Libraries/') ||
      fileName.includes('react-native/index.js') ||
      fileName.includes('react-native/Libraries/')
    );
  };

  // RN 0.72 specific measure function generator
  const createMeasureFunction = (fiberNode) => {
    return (callback) => {
      try {
        const stateNode = fiberNode.stateNode;
        if (stateNode && stateNode.measure) {
          stateNode.measure(callback);
        } else if (stateNode && stateNode._nativeTag) {
          const UIManager = require('react-native').UIManager;
          UIManager.measure(stateNode._nativeTag, callback);
        } else {
          callback(0, 0, 0, 0, 0, 0);
        }
      } catch (e) {
        callback(0, 0, 0, 0, 0, 0);
      }
    };
  };

  switch (true) {
    case versionNumber <= 0.72:
      let fiberNode = startNode;

      if (startNode && !startNode.tag && startNode._reactInternalFiber) {
        fiberNode = startNode._reactInternalFiber;
      } else if (startNode && !startNode.tag && startNode._reactInternalInstance) {
        fiberNode = startNode._reactInternalInstance;
      }

      if (fiberNode && typeof fiberNode.tag === 'number') {
        let node = fiberNode;
        while (node && node.tag !== OffscreenComponentReactTag) {
          if (node.memoizedProps && node.memoizedProps._source) {
            const source = node.memoizedProps._source;

            if (!isInternalComponent(source.fileName)) {
              // Collect only user components
              componentStack.push({
                name: node.type?.displayName || node.type?.name || 'Unknown',
                source: source,
                measure: createMeasureFunction(node),
              });
            }
          }

          node = node.return;
        }
      }
      break;

    default:
      // RN 0.73+: instanceCache available, use React DevTools method
      const rendererConfig = getRendererConfig();
      let stackItems = [];

      if (rendererConfig) {
        let node = startNode;
        while (node && node.tag !== OffscreenComponentReactTag) {
          try {
            const data = rendererConfig.getInspectorDataForInstance(node);
            const item = data.hierarchy[data.hierarchy.length - 1];
            stackItems.push(item);
          } catch (e) {
            // Skip nodes that can't be inspected
          }
          node = node.return;
        }
      } else if (viewDataHierarchy && viewDataHierarchy.length > 0) {
        stackItems = viewDataHierarchy.reverse();
      }

      stackItems.forEach((item) => {
        try {
          const inspectorData = item.getInspectorData(findNodeHandle);
          if (inspectorData.props._source) {
            const source = inspectorData.props._source;

            if (!isInternalComponent(source.fileName)) {
              componentStack.push({
                name: item.name,
                source: source,
                measure: inspectorData.measure,
              });
            }
          }
        } catch (e) {
          console.error(e);
        }
      });
      break;
  }

  return componentStack;
}

function getInspectorDataForCoordinates(mainContainerRef, x, y, requestStack, callback) {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

  // Detect React Native version
  let rnVersion = '0.72';
  try {
    const rnPackage = require('react-native/package.json');
    rnVersion = rnPackage.version;
  } catch (e) {
    console.error(e);
  }

  try {
    const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    const renderer = hook?.renderers?.get(1);

    if (renderer && renderer.rendererConfig && renderer.rendererConfig.getInspectorDataForViewAtPoint) {
      try {
        renderer.rendererConfig.getInspectorDataForViewAtPoint(
          mainContainerRef.current,
          x * screenWidth,
          y * screenHeight,
          (viewData) => {
            const frame = viewData.frame;
            const scaledFrame = {
              x: frame.left / screenWidth,
              y: frame.top / screenHeight,
              width: frame.width / screenWidth,
              height: frame.height / screenHeight,
            };

            if (!requestStack) {
              callback({ frame: scaledFrame });
              return;
            }

            const inspectorDataStack = extractComponentStack(viewData.closestInstance, viewData.hierarchy);
            Promise.all(
              inspectorDataStack.map(
                (inspectorData) =>
                  new Promise((res, rej) => {
                    try {
                      inspectorData.measure((_x, _y, viewWidth, viewHeight, pageX, pageY) => {
                        const source = inspectorData.source;
                        res({
                          componentName: inspectorData.name,
                          source: {
                            fileName: source.fileName,
                            line0Based: source.lineNumber - 1,
                            column0Based: source.columnNumber - 1,
                          },
                          frame: {
                            x: pageX / screenWidth,
                            y: pageY / screenHeight,
                            width: viewWidth / screenWidth,
                            height: viewHeight / screenHeight,
                          },
                          hide: false,
                        });
                      });
                    } catch (e) {
                      rej(e);
                    }
                  })
              )
            ).then((componentDataStack) => {
              callback({
                frame: scaledFrame,
                stack: componentDataStack,
              });
            });
          }
        );
      } catch (error) {
        console.error('🔥 Radon Runtime: getInspectorDataForViewAtPoint failed:', error);
        callback({ frame: { x: 0, y: 0, width: 0, height: 0 } });
      }
    } else {
      callback({ frame: { x: 0, y: 0, width: 0, height: 0 } });
    }
  } catch (error) {
    console.error('🔥 Radon Runtime: getInspectorDataForCoordinates error:', error);
    callback({ frame: { x: 0, y: 0, width: 0, height: 0 } });
  }
}

export function AppWrapper({ children, initialProps, fabric }) {
  const rootTag = useContext(RootTagContext);
  const [hasLayout, setHasLayout] = useState(false);
  const mainContainerRef = useRef();

  const mountCallback = initialProps?.__RNIDE_onMount;
  useEffect(() => {
    mountCallback?.();
  }, [mountCallback]);

  const layoutCallback = initialProps?.__RNIDE_onLayout;

  const handleLayout = useCallback(() => {
    layoutCallback?.();
    setHasLayout(true);
  }, [layoutCallback]);

  const handleNavigationChange = useCallback((navigationDescriptor) => {
    navigationHistory.set(navigationDescriptor.id, navigationDescriptor);

    const message = {
      type: 'navigationChanged',
      data: {
        displayName: navigationDescriptor.name,
        id: navigationDescriptor.id,
      },
    };
    inspectorBridge.sendMessage(message);
  });

  const handleRouteListChange = useCallback((routeList) => {
    const message = {
      type: 'navigationRouteListUpdated',
      data: routeList,
    };
    inspectorBridge.sendMessage(message);
  }, []);

  const useNavigationMainHook = navigationPlugins[0]?.plugin.mainHook || emptyNavigationHook;

  const { requestNavigationChange } = useNavigationMainHook({
    onNavigationChange: handleNavigationChange,
    onRouteListChange: handleRouteListChange,
  });

  const openPreview = useCallback(
    (previewKey) => {
      const preview = global.__RNIDE_previews.get(previewKey);
      if (!preview) {
        throw new Error('Preview not found');
      }
      AppRegistry.runApplication(InternalImports.PREVIEW_APP_KEY, {
        rootTag,
        initialProps: { ...initialProps, previewKey },
        fabric,
      });
      const urlPrefix = previewKey.startsWith('sb://') ? 'sb:' : 'preview:';
      handleNavigationChange({ id: previewKey, name: urlPrefix + preview.name });
    },
    [rootTag, handleNavigationChange, initialProps, fabric]
  );

  const closePreview = useCallback(() => {
    let closePromiseResolve;
    const closePreviewPromise = new Promise((resolve) => {
      closePromiseResolve = resolve;
    });
    if (getCurrentScene() === InternalImports.PREVIEW_APP_KEY) {
      AppRegistry.runApplication('main', {
        rootTag,
        initialProps: {
          __RNIDE_onLayout: closePromiseResolve,
        },
        fabric,
      });
    } else {
      closePromiseResolve();
    }
    return closePreviewPromise;
  }, [rootTag, fabric]);

  const openNavigation = useCallback(
    (message) => {
      const isPreviewUrl = message.id.startsWith('preview://') || message.id.startsWith('sb://');
      if (isPreviewUrl) {
        openPreview(message.id);
        return;
      }

      const navigationDescriptor = navigationHistory.get(message.id) || {
        id: message.id,
        name: message.name || message.id,
        pathname: message.id,
        params: message.params || {},
      };

      closePreview().then(() => {
        navigationDescriptor && requestNavigationChange(navigationDescriptor);
      });
    },
    [openPreview, closePreview, requestNavigationChange]
  );

  useEffect(() => {
    const listener = (message) => {
      const { type, data } = message;
      switch (type) {
        case 'openPreview':
          openPreview(data.previewId);
          break;
        case 'openUrl':
          closePreview().then(() => {
            const url = data.url;
            Linking.openURL(url);
          });
          break;
        case 'openNavigation':
          openNavigation(data);
          break;
        case 'inspect':
          const { id, x, y, requestStack } = data;
          getInspectorDataForCoordinates(mainContainerRef, x, y, requestStack, (inspectorData) => {
            inspectorBridge.sendMessage({
              type: 'inspectData',
              data: {
                id,
                ...inspectorData,
              },
            });
          });
          break;
      }
    };
    inspectorBridge.addMessageListener(listener);
    return () => inspectorBridge.removeMessageListener(listener);
  }, [openPreview, closePreview, openNavigation]);

  useEffect(() => {
    const LoadingView = RNInternals.LoadingView;
    if (LoadingView) {
      LoadingView.showMessage = (message) => {
        inspectorBridge.sendMessage({
          type: 'fastRefreshStarted',
        });
      };
      const originalHide = LoadingView.hide;
      LoadingView.hide = () => {
        originalHide();
        inspectorBridge.sendMessage({
          type: 'fastRefreshComplete',
        });
      };
    }

    InternalImports.setupRenderOutlinesPlugin();
    InternalImports.setupNetworkPlugin();

    const originalErrorHandler = global.ErrorUtils.getGlobalHandler();
    LogBox.ignoreAllLogs(true);

    function wrappedGlobalErrorHandler(error, isFatal) {
      try {
        RNInternals.LogBoxData.clear();
        originalErrorHandler(error, isFatal);
      } catch {}
    }

    global.ErrorUtils.setGlobalHandler(wrappedGlobalErrorHandler);
    return () => {
      global.ErrorUtils.setGlobalHandler(originalErrorHandler);
    };
  }, []);

  useEffect(() => {
    if (hasLayout) {
      const appKey = getCurrentScene();
      inspectorBridge.sendMessage({
        type: 'appReady',
        data: {
          appKey,
          navigationPlugins: navigationPlugins.map((plugin) => plugin.name),
        },
      });

      devtoolPluginsChanged = () => {
        inspectorBridge.sendMessage({
          type: 'devtoolPluginsChanged',
          data: {
            plugins: Array.from(devtoolPlugins.values()),
          },
        });
      };
      devtoolPluginsChanged();
      return () => {
        devtoolPluginsChanged = undefined;
      };
    }
  }, [hasLayout]);

  if (!hasLayout) {
    return <View onLayout={handleLayout} ref={mainContainerRef} style={{ flex: 1 }} />;
  }

  return (
    <View style={{ flex: 1 }} ref={mainContainerRef}>
      {children}
    </View>
  );
}

export function createNestedAppWrapper(InnerWrapperComponent) {
  function WrapperComponent(props) {
    const { children, ...rest } = props;
    return (
      <AppWrapper {...rest}>
        <InnerWrapperComponent {...rest}>{children}</InnerWrapperComponent>
      </AppWrapper>
    );
  }
  return WrapperComponent;
}
