// Copyright (c) Toss. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from "../../core/i18n/i18n.js";
import * as UI from "../../ui/legacy/legacy.js";
const UIStrings = {
    /**
     * @description Device Manager panel title
     */
    title: "📱 Device Manager",
    /**
     * @description Command for showing the Device Manager panel
     */
    command: "Show Device Manager panel",
};
const str_ = i18n.i18n.registerUIStrings("panels/device_manager/device_manager-meta.ts", UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedModule;
async function loadModule() {
    if (!loadedModule) {
        loadedModule = await import("./device_manager.js");
    }
    return loadedModule;
}
UI.ViewManager.registerViewExtension({
    location: "panel" /* UI.ViewManager.ViewLocationValues.PANEL */,
    id: "device-manager",
    title: i18nLazyString(UIStrings.title),
    commandPrompt: i18nLazyString(UIStrings.command),
    persistence: "permanent" /* UI.ViewManager.ViewPersistence.PERMANENT */,
    order: 2000,
    async loadView() {
        const Module = await loadModule();
        return new Module.DeviceManagerPanelModule.DeviceManagerViewImpl();
    },
});
//# sourceMappingURL=device_manager-meta.js.map