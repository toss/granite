// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
import { createTarget } from '../../testing/EnvironmentHelpers.js';
import { describeWithMockConnection } from '../../testing/MockConnection.js';
import * as PerformanceMonitor from './performance_monitor.js';
describeWithMockConnection('PerformanceMonitor', () => {
    const tests = (targetFactory) => {
        let target;
        let performanceMonitor;
        beforeEach(() => {
            target = targetFactory();
        });
        afterEach(() => {
            performanceMonitor.detach();
        });
        it('updates metrics', async () => {
            let metrics = { metrics: [{ name: 'LayoutCount', value: 42 }] };
            let onGetMetrics = () => { };
            sinon.stub(target.performanceAgent(), 'invoke_getMetrics').callsFake(() => {
                onGetMetrics();
                return Promise.resolve(metrics);
            });
            performanceMonitor = new PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl(0);
            performanceMonitor.markAsRoot();
            performanceMonitor.show(document.body);
            assert.isFalse([...performanceMonitor.contentElement.querySelectorAll('.perfmon-indicator-value')].some(e => e.textContent));
            await new Promise(resolve => {
                onGetMetrics = resolve;
            });
            metrics = { metrics: [{ name: 'LayoutCount', value: 84 }] };
            await new Promise(resolve => {
                onGetMetrics = resolve;
            });
            assert.isTrue([...performanceMonitor.contentElement.querySelectorAll('.perfmon-indicator-value')].some(e => e.textContent));
        });
    };
    describe('without tab target', () => tests(createTarget));
    describe('with tab target', () => tests(() => {
        const tabTarget = createTarget({ type: SDK.Target.Type.Tab });
        createTarget({ parentTarget: tabTarget, subtype: 'prerender' });
        return createTarget({ parentTarget: tabTarget });
    }));
});
//# sourceMappingURL=PerformanceMonitor.test.js.map