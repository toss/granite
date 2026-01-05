// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
const UIStrings = {
    /**
     * @description React DevTools panel title
     */
    title: 'Profiler ⚛',
    /**
     * @description Command for showing the React DevTools panel
     */
    command: 'Show React DevTools Profiler panel',
};
const str_ = i18n.i18n.registerUIStrings('panels/react_devtools/react_devtools_profiler-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedModule;
async function loadModule() {
    if (!loadedModule) {
        loadedModule = await import('./react_devtools.js');
    }
    return loadedModule;
}
UI.ViewManager.registerViewExtension({
    location: "panel" /* UI.ViewManager.ViewLocationValues.PANEL */,
    id: 'react-devtools-profiler',
    title: i18nLazyString(UIStrings.title),
    commandPrompt: i18nLazyString(UIStrings.command),
    persistence: "permanent" /* UI.ViewManager.ViewPersistence.PERMANENT */,
    order: 1000,
    async loadView() {
        const Module = await loadModule();
        return new Module.ReactDevToolsProfilerView.ReactDevToolsProfilerViewImpl();
    },
});
//# sourceMappingURL=react_devtools_profiler-meta.js.map