// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
import { TestPlugin } from '../../testing/LanguagePluginHelpers.js';
import * as Bindings from './bindings.js';
describe('DebuggerLanguagePlugins', () => {
    describe('ExtensionRemoteObject', () => {
        describe('isLinearMemoryInspectable', () => {
            it('yields false when the extension object has no linear memory address', () => {
                const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
                const extensionObject = {
                    type: 'object',
                    hasChildren: false,
                };
                const plugin = new TestPlugin('TestPlugin');
                const remoteObject = new Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject(callFrame, extensionObject, plugin);
                assert.isFalse(remoteObject.isLinearMemoryInspectable());
            });
            it('yields true when the extension object has a linear memory address', () => {
                const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
                const extensionObject = {
                    type: 'object',
                    linearMemoryAddress: 42,
                    hasChildren: false,
                };
                const plugin = new TestPlugin('TestPlugin');
                const remoteObject = new Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject(callFrame, extensionObject, plugin);
                assert.isTrue(remoteObject.isLinearMemoryInspectable());
            });
        });
    });
});
//# sourceMappingURL=DebuggerLanguagePlugins.test.js.map