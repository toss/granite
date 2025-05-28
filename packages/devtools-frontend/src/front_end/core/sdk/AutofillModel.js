// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../host/host.js';
import { SDKModel } from './SDKModel.js';
export class AutofillModel extends SDKModel {
    agent;
    #enabled;
    constructor(target) {
        super(target);
        this.agent = target.autofillAgent();
        target.registerAutofillDispatcher(this);
        this.enable();
    }
    enable() {
        if (this.#enabled || Host.InspectorFrontendHost.isUnderTest()) {
            return;
        }
        void this.agent.invoke_enable();
        this.#enabled = true;
    }
    disable() {
        if (!this.#enabled || Host.InspectorFrontendHost.isUnderTest()) {
            return;
        }
        this.#enabled = false;
        void this.agent.invoke_disable();
    }
    addressFormFilled(addressFormFilledEvent) {
        this.dispatchEventToListeners("AddressFormFilled" /* Events.AddressFormFilled */, { autofillModel: this, event: addressFormFilledEvent });
    }
}
SDKModel.register(AutofillModel, { capabilities: 2 /* Capability.DOM */, autostart: true });
//# sourceMappingURL=AutofillModel.js.map