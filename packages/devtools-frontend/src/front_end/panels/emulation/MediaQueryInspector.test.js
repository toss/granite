// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import { assertNotNullOrUndefined } from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import { createTarget } from '../../testing/EnvironmentHelpers.js';
import { describeWithMockConnection } from '../../testing/MockConnection.js';
import * as Emulation from './emulation.js';
describeWithMockConnection('MediaQueryInspector', () => {
    const tests = (targetFactory) => {
        let target;
        let throttler;
        let onScheduled;
        let inspector;
        beforeEach(() => {
            target = targetFactory();
            throttler = new Common.Throttler.Throttler(0);
            onScheduled = () => { };
            sinon.stub(throttler, 'schedule').callsFake(async (work, _) => {
                await work();
                onScheduled();
                return Promise.resolve();
            });
        });
        afterEach(() => {
            inspector.detach();
        });
        it('redners media queries', async () => {
            inspector = new Emulation.MediaQueryInspector.MediaQueryInspector(() => 42, (_) => { }, throttler);
            inspector.markAsRoot();
            inspector.show(document.body);
            assert.strictEqual(inspector.contentElement.querySelectorAll('.media-inspector-marker').length, 0);
            const cssModel = target.model(SDK.CSSModel.CSSModel);
            assertNotNullOrUndefined(cssModel);
            const CSS_MEDIA = {
                text: 'foo',
                source: "mediaRule" /* Protocol.CSS.CSSMediaSource.MediaRule */,
                mediaList: [{ expressions: [{ value: 42, computedLength: 42, unit: 'UNIT', feature: 'max-width' }], active: true }],
            };
            sinon.stub(cssModel, 'getMediaQueries').resolves([new SDK.CSSMedia.CSSMedia(cssModel, CSS_MEDIA)]);
            cssModel.dispatchEventToListeners(SDK.CSSModel.Events.StyleSheetAdded, {});
            await new Promise(resolve => {
                onScheduled = resolve;
            });
            assert.strictEqual(inspector.contentElement.querySelectorAll('.media-inspector-marker').length, 1);
        });
    };
    describe('without tab target', () => tests(createTarget));
    describe('with tab target', () => tests(() => {
        const tabTarget = createTarget({ type: SDK.Target.Type.Tab });
        createTarget({ parentTarget: tabTarget, subtype: 'prerender' });
        return createTarget({ parentTarget: tabTarget });
    }));
});
//# sourceMappingURL=MediaQueryInspector.test.js.map