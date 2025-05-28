// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { assertNotNullOrUndefined } from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import { createTarget, stubNoopSettings, } from '../../testing/EnvironmentHelpers.js';
import { describeWithMockConnection } from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Application from './application.js';
const { assert } = chai;
describeWithMockConnection('SharedStorageListTreeElement', function () {
    const tests = (targetFactory) => {
        let target;
        let sharedStorageModel;
        let resourceTreeModel;
        let treeElement;
        const TEST_ORIGIN_A = 'http://a.test';
        const TEST_ORIGIN_B = 'http://b.test';
        const TEST_ORIGIN_C = 'http://c.test';
        const ID = 'AA';
        const EVENTS = [
            {
                accessTime: 0,
                type: "documentAppend" /* Protocol.Storage.SharedStorageAccessType.DocumentAppend */,
                mainFrameId: ID,
                ownerOrigin: TEST_ORIGIN_A,
                params: { key: 'key0', value: 'value0' },
            },
            {
                accessTime: 10,
                type: "workletGet" /* Protocol.Storage.SharedStorageAccessType.WorkletGet */,
                mainFrameId: ID,
                ownerOrigin: TEST_ORIGIN_A,
                params: { key: 'key0' },
            },
            {
                accessTime: 15,
                type: "workletLength" /* Protocol.Storage.SharedStorageAccessType.WorkletLength */,
                mainFrameId: ID,
                ownerOrigin: TEST_ORIGIN_B,
                params: {},
            },
            {
                accessTime: 20,
                type: "documentClear" /* Protocol.Storage.SharedStorageAccessType.DocumentClear */,
                mainFrameId: ID,
                ownerOrigin: TEST_ORIGIN_B,
                params: {},
            },
            {
                accessTime: 100,
                type: "workletSet" /* Protocol.Storage.SharedStorageAccessType.WorkletSet */,
                mainFrameId: ID,
                ownerOrigin: TEST_ORIGIN_C,
                params: { key: 'key0', value: 'value1', ignoreIfPresent: true },
            },
            {
                accessTime: 150,
                type: "workletRemainingBudget" /* Protocol.Storage.SharedStorageAccessType.WorkletRemainingBudget */,
                mainFrameId: ID,
                ownerOrigin: TEST_ORIGIN_C,
                params: {},
            },
        ];
        const MOCK_MAIN_FRAME = {
            get id() {
                return ID;
            },
            isMainFrame() {
                return true;
            },
            isOutermostFrame() {
                return true;
            },
        };
        beforeEach(async () => {
            stubNoopSettings();
            target = targetFactory();
            Root.Runtime.experiments.register("preloading-status-panel" /* Root.Runtime.ExperimentName.PRELOADING_STATUS_PANEL */, '', false);
            Root.Runtime.experiments.register("storage-buckets-tree" /* Root.Runtime.ExperimentName.STORAGE_BUCKETS_TREE */, '', false);
            sharedStorageModel = target.model(Application.SharedStorageModel.SharedStorageModel);
            resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
        });
        it('shows view on select', async () => {
            assertNotNullOrUndefined(sharedStorageModel);
            sinon.stub(sharedStorageModel, 'enable').resolves();
            const panel = Application.ResourcesPanel.ResourcesPanel.instance({ forceNew: true });
            panel.markAsRoot();
            panel.show(document.body);
            treeElement = new Application.SharedStorageListTreeElement.SharedStorageListTreeElement(panel);
            const view = treeElement.view;
            const wasShownSpy = sinon.spy(view, 'wasShown');
            document.body.appendChild(treeElement.listItemNode);
            treeElement.treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
            treeElement.selectable = true;
            treeElement.select();
            assert.isTrue(wasShownSpy.calledOnce);
            panel.detach();
        });
        it('adds events', async () => {
            assertNotNullOrUndefined(sharedStorageModel);
            sinon.stub(sharedStorageModel, 'enable').resolves();
            const panel = Application.ResourcesPanel.ResourcesPanel.instance({ forceNew: true });
            treeElement = new Application.SharedStorageListTreeElement.SharedStorageListTreeElement(panel);
            const view = treeElement.view;
            view.setDefaultIdForTesting(ID);
            for (const event of EVENTS) {
                treeElement.addEvent(event);
            }
            assert.deepEqual(view.getEventsForTesting(), EVENTS);
            panel.detach();
        });
        it('clears events upon main frame navigation', async () => {
            assertNotNullOrUndefined(sharedStorageModel);
            sinon.stub(sharedStorageModel, 'enable').resolves();
            const panel = Application.ResourcesPanel.ResourcesPanel.instance({ forceNew: true });
            treeElement = new Application.SharedStorageListTreeElement.SharedStorageListTreeElement(panel);
            const view = treeElement.view;
            view.setDefaultIdForTesting(ID);
            for (const event of EVENTS) {
                treeElement.addEvent(event);
            }
            assert.deepEqual(view.getEventsForTesting(), EVENTS);
            // Events are cleared on main frame navigation.
            assertNotNullOrUndefined(resourceTreeModel);
            resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, { frame: MOCK_MAIN_FRAME, type: "Navigation" /* SDK.ResourceTreeModel.PrimaryPageChangeType.Navigation */ });
            assert.deepEqual(view.getEventsForTesting(), []);
            panel.detach();
        });
    };
    describe('without tab target', () => tests(() => createTarget()));
    describe('with tab target', () => tests(() => {
        const tabTarget = createTarget({ type: SDK.Target.Type.Tab });
        createTarget({ parentTarget: tabTarget, subtype: 'prerender' });
        return createTarget({ parentTarget: tabTarget });
    }));
});
//# sourceMappingURL=SharedStorageListTreeElement.test.js.map