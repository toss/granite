// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { SDKModel } from './SDKModel.js';
export class ReactNativeApplicationModel extends SDKModel {
    #enabled;
    #agent;
    metadataCached = null;
    constructor(target) {
        super(target);
        this.#enabled = false;
        this.#agent = target.reactNativeApplicationAgent();
        target.registerReactNativeApplicationDispatcher(this);
    }
    ensureEnabled() {
        if (this.#enabled) {
            return;
        }
        void this.#agent.invoke_enable();
        this.#enabled = true;
    }
    metadataUpdated(metadata) {
        this.metadataCached = metadata;
        this.dispatchEventToListeners("MetadataUpdated" /* Events.MetadataUpdated */, metadata);
    }
}
SDKModel.register(ReactNativeApplicationModel, {
    capabilities: 0 /* Capability.None */,
    autostart: true,
});
//# sourceMappingURL=ReactNativeApplicationModel.js.map