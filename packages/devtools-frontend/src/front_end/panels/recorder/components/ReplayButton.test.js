// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const { assert } = chai;
import * as RecorderComponents from './components.js';
import * as Models from '../models/models.js';
import { describeWithEnvironment, setupActionRegistry, } from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import { renderElementIntoDOM } from '../../../testing/DOMHelpers.js';
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
describeWithEnvironment('ReplayButton', () => {
    setupActionRegistry();
    let settings;
    async function createReplayButton() {
        settings = new Models.RecorderSettings.RecorderSettings();
        const component = new RecorderComponents.ReplayButton.ReplayButton();
        component.data = { settings, replayExtensions: [] };
        renderElementIntoDOM(component);
        await coordinator.done();
        return component;
    }
    afterEach(() => {
        settings.speed = "normal" /* Models.RecordingPlayer.PlayRecordingSpeed.Normal */;
    });
    it('should change the button value when another option is selected in select menu', async () => {
        const component = await createReplayButton();
        const selectButton = component.shadowRoot?.querySelector('devtools-select-button');
        assert.strictEqual(selectButton?.value, "normal" /* Models.RecordingPlayer.PlayRecordingSpeed.Normal */);
        selectButton?.dispatchEvent(new RecorderComponents.SelectButton.SelectButtonClickEvent("slow" /* Models.RecordingPlayer.PlayRecordingSpeed.Slow */));
        await coordinator.done();
        assert.strictEqual(selectButton?.value, "slow" /* Models.RecordingPlayer.PlayRecordingSpeed.Slow */);
    });
    it('should emit startreplayevent on selectbuttonclick event', async () => {
        const component = await createReplayButton();
        const onceClicked = new Promise(resolve => {
            component.addEventListener('startreplay', resolve, { once: true });
        });
        const selectButton = component.shadowRoot?.querySelector('devtools-select-button');
        selectButton?.dispatchEvent(new RecorderComponents.SelectButton.SelectButtonClickEvent("slow" /* Models.RecordingPlayer.PlayRecordingSpeed.Slow */));
        const event = await onceClicked;
        assert.deepEqual(event.speed, "slow" /* Models.RecordingPlayer.PlayRecordingSpeed.Slow */);
    });
    it('should save the changed button when option is selected in select menu', async () => {
        const component = await createReplayButton();
        const selectButton = component.shadowRoot?.querySelector('devtools-select-button');
        selectButton?.dispatchEvent(new RecorderComponents.SelectButton.SelectButtonClickEvent("slow" /* Models.RecordingPlayer.PlayRecordingSpeed.Slow */));
        assert.strictEqual(settings.speed, "slow" /* Models.RecordingPlayer.PlayRecordingSpeed.Slow */);
    });
    it('should load the saved button on initial render', async () => {
        settings.speed = "slow" /* Models.RecordingPlayer.PlayRecordingSpeed.Slow */;
        const component = await createReplayButton();
        const selectButton = component.shadowRoot?.querySelector('devtools-select-button');
        assert.strictEqual(selectButton?.value, "slow" /* Models.RecordingPlayer.PlayRecordingSpeed.Slow */);
    });
});
//# sourceMappingURL=ReplayButton.test.js.map