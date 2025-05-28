// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const { assert } = chai;
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { assertNotNullOrUndefined } from '../../core/platform/platform.js';
import * as Resources from './application.js';
import { createTarget } from '../../testing/EnvironmentHelpers.js';
import { describeWithMockConnection } from '../../testing/MockConnection.js';
describeWithMockConnection('BackgroundServiceView', () => {
    const testKey = 'test-storage-key';
    const serviceName = "backgroundFetch" /* Protocol.BackgroundService.ServiceName.BackgroundFetch */;
    let target;
    let backgroundServiceModel;
    let manager;
    let view;
    beforeEach(() => {
        target = createTarget();
        backgroundServiceModel = target.model(Resources.BackgroundServiceModel.BackgroundServiceModel);
        manager = target.model(SDK.StorageKeyManager.StorageKeyManager);
        UI.ActionRegistration.maybeRemoveActionExtension('background-service.toggle-recording');
        UI.ActionRegistration.registerActionExtension({
            actionId: 'background-service.toggle-recording',
            category: "BACKGROUND_SERVICES" /* UI.ActionRegistration.ActionCategory.BACKGROUND_SERVICES */,
            title: () => 'mock',
            toggleable: true,
        });
        sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
            shortcutTitleForAction: () => { },
            shortcutsForAction: () => [new UI.KeyboardShortcut.KeyboardShortcut([{ key: 0, name: '' }], '', "DefaultShortcut" /* UI.KeyboardShortcut.Type.DefaultShortcut */)],
        });
        assertNotNullOrUndefined(backgroundServiceModel);
        view = new Resources.BackgroundServiceView.BackgroundServiceView(serviceName, backgroundServiceModel);
    });
    afterEach(() => {
        UI.ActionRegistration.maybeRemoveActionExtension('background-service.toggle-recording');
    });
    it('updates event list when main storage key changes', () => {
        assertNotNullOrUndefined(backgroundServiceModel);
        assertNotNullOrUndefined(manager);
        backgroundServiceModel.backgroundServiceEventReceived({
            backgroundServiceEvent: {
                timestamp: 1556889085,
                origin: '',
                storageKey: testKey,
                serviceWorkerRegistrationId: 42,
                service: serviceName,
                eventName: 'Event1',
                instanceId: 'Instance1',
                eventMetadata: [],
            },
        });
        manager.updateStorageKeys(new Set([testKey]));
        manager.setMainStorageKey(testKey);
        const dataRow = view.getDataGrid().dataTableBody.getElementsByClassName('data-grid-data-grid-node')[0];
        const expectedData = ['Event1', testKey, 'Instance1'];
        const actualData = [
            dataRow.getElementsByClassName('event-name-column')[0].textContent,
            dataRow.getElementsByClassName('storage-key-column')[0].textContent,
            dataRow.getElementsByClassName('instance-id-column')[0].textContent,
        ];
        assert.deepEqual(actualData, expectedData);
    });
});
//# sourceMappingURL=BackgroundServiceView.test.js.map