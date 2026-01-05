// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../shell/shell.js';
import '../../panels/emulation/emulation-meta.js';
import '../../panels/sensors/sensors-meta.js';
import '../../panels/developer_resources/developer_resources-meta.js';
import '../inspector_main/inspector_main-meta.js';
import '../../panels/issues/issues-meta.js';
import '../../panels/mobile_throttling/mobile_throttling-meta.js';
import '../../panels/network/network-meta.js';
import '../../panels/react_devtools/react_devtools_components-meta.js';
import '../../panels/react_devtools/react_devtools_profiler-meta.js';
import '../../panels/rn_welcome/rn_welcome-meta.js';
import '../../panels/timeline/timeline-meta.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Main from '../main/main.js';
import * as Common from '../../core/common/common.js';
import * as RNExperiments from '../../core/rn_experiments/rn_experiments.js';
/*
 * To ensure accurate timing measurements,
 * please make sure these perf metrics lines are called ahead of everything else
 */
Host.rnPerfMetrics.registerPerfMetricsGlobalPostMessageHandler();
Host.rnPerfMetrics.registerGlobalErrorReporting();
Host.rnPerfMetrics.setLaunchId(Root.Runtime.Runtime.queryParam('launchId'));
Host.rnPerfMetrics.entryPointLoadingStarted('rn_fusebox');
const UIStrings = {
    /**
     *@description Title of the 'React Native' tool in the Network Navigator View, which is part of the Sources tool
     */
    networkTitle: 'React Native',
    /**
     *@description Command for showing the 'React Native' tool in the Network Navigator View, which is part of the Sources tool
     */
    showReactNative: 'Show React Native',
    /**
     *@description Label of the FB-only 'send feedback' action button in the toolbar
     */
    sendFeedback: '[FB-only] Send feedback',
    /**
     *@description Tooltip of the connection status toolbar button while disconnected
     */
    connectionStatusDisconnectedTooltip: 'Debugging connection was closed',
    /**
     *@description Button label of the connection status toolbar button while disconnected
     */
    connectionStatusDisconnectedLabel: 'Reconnect DevTools',
};
const str_ = i18n.i18n.registerUIStrings('entrypoints/rn_fusebox/rn_fusebox.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
// Disable Network-related features
UI.ViewManager.maybeRemoveViewExtension('network.blocked-urls');
UI.ViewManager.maybeRemoveViewExtension('network.config');
// Disable Performance-related features
UI.ViewManager.maybeRemoveViewExtension('coverage');
UI.ViewManager.maybeRemoveViewExtension('linear-memory-inspector');
UI.ViewManager.maybeRemoveViewExtension('rendering');
// Disable additional features
UI.ViewManager.maybeRemoveViewExtension('issues-pane');
UI.ViewManager.maybeRemoveViewExtension('sensors');
// Disable Settings panels
UI.ViewManager.maybeRemoveViewExtension('devices');
UI.ViewManager.maybeRemoveViewExtension('emulation-locations');
UI.ViewManager.maybeRemoveViewExtension('throttling-conditions');
RNExperiments.RNExperimentsImpl.setIsReactNativeEntryPoint(true);
RNExperiments.RNExperimentsImpl.Instance.enableExperimentsByDefault([
    "js-heap-profiler-enable" /* Root.Runtime.ExperimentName.JS_HEAP_PROFILER_ENABLE */,
    "react-native-specific-ui" /* Root.Runtime.ExperimentName.REACT_NATIVE_SPECIFIC_UI */,
]);
document.addEventListener('visibilitychange', () => {
    Host.rnPerfMetrics.browserVisibilityChanged(document.visibilityState);
});
class FuseboxClientMetadataModel extends SDK.SDKModel.SDKModel {
    constructor(target) {
        super(target);
        Host.rnPerfMetrics.fuseboxSetClientMetadataStarted();
        target.fuseboxClientAgent()
            .invoke_setClientMetadata()
            .then(result => {
            const maybeError = result.getError();
            const success = !maybeError;
            Host.rnPerfMetrics.fuseboxSetClientMetadataFinished(success, maybeError);
        })
            .catch(reason => {
            const success = false;
            Host.rnPerfMetrics.fuseboxSetClientMetadataFinished(success, reason);
        });
    }
}
SDK.SDKModel.SDKModel.register(FuseboxClientMetadataModel, {
    capabilities: 0 /* SDK.Target.Capability.None */,
    autostart: true,
    // Ensure FuseboxClient.setClientMetadata is sent before most other CDP domains
    // are initialised. This allows the backend to confidently detect non-Fusebox
    // clients by the fact that they send e.g. Runtime.enable without sending any
    // Fusebox-specific messages first.
    // TODO: Explicitly depend on this model in RuntimeModel and LogModel, and
    // remove the `early` and `autostart` flags.
    early: true,
});
let loadedSourcesModule;
async function loadSourcesModule() {
    if (!loadedSourcesModule) {
        loadedSourcesModule = await import('../../panels/sources/sources.js');
    }
    return loadedSourcesModule;
}
UI.ViewManager.registerViewExtension({
    location: "navigator-view" /* UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW */,
    id: 'navigator-network',
    title: i18nLazyString(UIStrings.networkTitle),
    commandPrompt: i18nLazyString(UIStrings.showReactNative),
    order: 2,
    persistence: "permanent" /* UI.ViewManager.ViewPersistence.PERMANENT */,
    async loadView() {
        const Sources = await loadSourcesModule();
        return Sources.SourcesNavigator.NetworkNavigatorView.instance();
    },
});
// @ts-ignore Exposed for legacy layout tests
self.runtime = Root.Runtime.Runtime.instance({ forceNew: true });
new Main.MainImpl.MainImpl();
if (globalThis.FB_ONLY__reactNativeFeedbackLink) {
    const feedbackLink = globalThis.FB_ONLY__reactNativeFeedbackLink;
    const actionId = 'react-native-send-feedback';
    const sendFeedbackActionDelegate = {
        handleAction(_context, incomingActionId) {
            if (incomingActionId !== actionId) {
                return false;
            }
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(feedbackLink);
            return true;
        },
    };
    UI.ActionRegistration.registerActionExtension({
        category: "GLOBAL" /* UI.ActionRegistration.ActionCategory.GLOBAL */,
        actionId,
        title: i18nLazyString(UIStrings.sendFeedback),
        async loadActionDelegate() {
            return sendFeedbackActionDelegate;
        },
        iconClass: "bug" /* UI.ActionRegistration.IconClass.BUG */,
    });
    UI.Toolbar.registerToolbarItem({
        location: "main-toolbar-right" /* UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_RIGHT */,
        actionId,
        showLabel: true,
    });
}
class ConnectionStatusToolbarItemProvider extends SDK.TargetManager.Observer {
    #button = new UI.Toolbar.ToolbarButton('');
    constructor() {
        super();
        this.#button.setVisible(false);
        this.#button.element.classList.add('fusebox-connection-status');
        this.#button.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.Click */, this.onClick.bind(this));
        SDK.TargetManager.TargetManager.instance().observeTargets(this, { scoped: true });
    }
    targetAdded(target) {
        this.#onTargetChanged(target);
    }
    targetRemoved(target) {
        this.#onTargetChanged(target);
    }
    #onTargetChanged(target) {
        const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
        this.#button.setTitle(i18nLazyString(UIStrings.connectionStatusDisconnectedTooltip)());
        this.#button.setText(i18nLazyString(UIStrings.connectionStatusDisconnectedLabel)());
        this.#button.setVisible(!rootTarget);
        if (!rootTarget) {
            this.#printPreserveLogPrompt(target);
        }
    }
    #printPreserveLogPrompt(target) {
        if (Common.Settings.Settings.instance().moduleSetting('preserve-console-log').get()) {
            return;
        }
        target.model(SDK.ConsoleModel.ConsoleModel)
            ?.addMessage(new SDK.ConsoleModel.ConsoleMessage(target.model(SDK.RuntimeModel.RuntimeModel), "recommendation" /* Protocol.Log.LogEntrySource.Recommendation */, "info" /* Protocol.Log.LogEntryLevel.Info */, '[React Native] Console messages are currently cleared upon DevTools disconnection. You can preserve logs in settings: ', {
            type: SDK.ConsoleModel.FrontendMessageType.System,
            context: 'fusebox_preserve_log_rec',
        }));
    }
    onClick() {
        window.location.reload();
    }
    item() {
        return this.#button;
    }
}
const connectionStatusToolbarItemProvider = new ConnectionStatusToolbarItemProvider();
UI.Toolbar.registerToolbarItem({
    location: "main-toolbar-right" /* UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_RIGHT */,
    loadItem: async () => {
        return connectionStatusToolbarItemProvider;
    },
});
class FuseboxReactNativeApplicationObserver {
    constructor(targetManager) {
        targetManager.observeModels(SDK.ReactNativeApplicationModel.ReactNativeApplicationModel, this);
    }
    modelAdded(model) {
        model.ensureEnabled();
        model.addEventListener("MetadataUpdated" /* SDK.ReactNativeApplicationModel.Events.MetadataUpdated */, this.#handleMetadataUpdated, this);
    }
    modelRemoved(model) {
        model.removeEventListener("MetadataUpdated" /* SDK.ReactNativeApplicationModel.Events.MetadataUpdated */, this.#handleMetadataUpdated, this);
    }
    #handleMetadataUpdated(event) {
        const { appDisplayName, deviceName } = event.data;
        // Update window title
        if (appDisplayName !== null && appDisplayName !== undefined) {
            document.title = `${appDisplayName}${deviceName !== null && deviceName !== undefined ? ` (${deviceName})` : ''} - React Native DevTools`;
        }
    }
}
new FuseboxReactNativeApplicationObserver(SDK.TargetManager.TargetManager.instance());
Host.rnPerfMetrics.entryPointLoadingFinished('rn_fusebox');
//# sourceMappingURL=rn_fusebox.js.map