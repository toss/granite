// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import { assertNotNullOrUndefined } from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import { createTarget, stubNoopSettings, } from '../../testing/EnvironmentHelpers.js';
import { describeWithMockConnection } from '../../testing/MockConnection.js';
import * as Elements from '../elements/elements.js';
import * as Animation from './animation.js';
const { assert } = chai;
class ManualPromise {
    #waitPromise;
    #resolveFn;
    constructor() {
        this.#waitPromise = new Promise(r => {
            this.#resolveFn = r;
        });
    }
    resolve() {
        this.#resolveFn();
        this.#waitPromise = new Promise(r => {
            this.#resolveFn = r;
        });
    }
    wait() {
        return this.#waitPromise;
    }
}
const cancelAllPendingRaf = () => {
    let rafId = window.requestAnimationFrame(() => { });
    while (rafId--) {
        window.cancelAnimationFrame(rafId);
    }
};
const stubAnimationGroup = () => {
    sinon.stub(Animation.AnimationModel.AnimationGroup.prototype, 'scrollNode')
        .resolves(new Animation.AnimationDOMNode.AnimationDOMNode(null));
};
const stubAnimationDOMNode = () => {
    sinon.stub(Animation.AnimationDOMNode.AnimationDOMNode.prototype, 'verticalScrollRange').resolves(100);
    sinon.stub(Animation.AnimationDOMNode.AnimationDOMNode.prototype, 'horizontalScrollRange').resolves(100);
    sinon.stub(Animation.AnimationDOMNode.AnimationDOMNode.prototype, 'scrollLeft').resolves(10);
    sinon.stub(Animation.AnimationDOMNode.AnimationDOMNode.prototype, 'scrollTop').resolves(10);
    sinon.stub(Animation.AnimationDOMNode.AnimationDOMNode.prototype, 'addScrollEventListener').resolves();
    sinon.stub(Animation.AnimationDOMNode.AnimationDOMNode.prototype, 'removeScrollEventListener').resolves();
};
describeWithMockConnection('AnimationTimeline', () => {
    let target;
    let view;
    beforeEach(() => {
        Common.Linkifier.registerLinkifier({
            contextTypes() {
                return [SDK.DOMModel.DOMNode];
            },
            async loadLinkifier() {
                return Elements.DOMLinkifier.Linkifier.instance();
            },
        });
        stubNoopSettings();
        target = createTarget();
        const runtimeAgent = target.model(SDK.RuntimeModel.RuntimeModel)?.agent;
        const stub = sinon.stub(runtimeAgent, 'invoke_evaluate');
        stub.callsFake(params => {
            if (params.expression === 'window.devicePixelRatio') {
                return Promise.resolve({
                    result: {
                        type: 'number',
                        value: 1,
                    },
                    getError: () => undefined,
                });
            }
            return stub.wrappedMethod(params);
        });
    });
    afterEach(() => {
        cancelAllPendingRaf();
        view.detach();
    });
    const updatesUiOnEvent = (inScope) => async () => {
        SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
        const model = target.model(Animation.AnimationModel.AnimationModel);
        assertNotNullOrUndefined(model);
        view = Animation.AnimationTimeline.AnimationTimeline.instance({ forceNew: true });
        view.markAsRoot();
        view.show(document.body);
        await new Promise(resolve => setTimeout(resolve, 0));
        const previewContainer = view.contentElement.querySelector('.animation-timeline-buffer');
        await model.animationStarted({
            id: 'id',
            name: 'name',
            pausedState: false,
            playState: 'playState',
            playbackRate: 1,
            startTime: 42,
            currentTime: 43,
            type: "CSSAnimation" /* Protocol.Animation.AnimationType.CSSAnimation */,
            source: {
                delay: 0,
                duration: 1001,
                backendNodeId: 42,
            },
        });
        if (inScope) {
            await new Promise(r => sinon.stub(view, 'previewsCreatedForTest').callsFake(r));
        }
        assert.strictEqual(previewContainer.querySelectorAll('.animation-buffer-preview').length, inScope ? 1 : 0);
    };
    it('updates UI on in scope animation group start', updatesUiOnEvent(true));
    it('does not update UI on out of scope animation group start', updatesUiOnEvent(false));
    describe('resizing time controls', () => {
        it('updates --timeline-controls-width and calls onResize', async () => {
            view = Animation.AnimationTimeline.AnimationTimeline.instance({ forceNew: true });
            view.markAsRoot();
            view.show(document.body);
            const onResizeStub = sinon.stub(view, 'onResize');
            await new Promise(resolve => setTimeout(resolve, 0));
            const resizer = view.contentElement.querySelector('.timeline-controls-resizer');
            assertNotNullOrUndefined(resizer);
            const initialWidth = view.element.style.getPropertyValue('--timeline-controls-width');
            assert.strictEqual(initialWidth, '150px');
            const resizerRect = resizer.getBoundingClientRect();
            resizer.dispatchEvent(new PointerEvent('pointerdown', {
                clientX: resizerRect.x + resizerRect.width / 2,
                clientY: resizerRect.y + resizerRect.height / 2,
            }));
            resizer.ownerDocument.dispatchEvent(new PointerEvent('pointermove', {
                buttons: 1,
                clientX: (resizerRect.x + resizerRect.width / 2) + 20,
                clientY: resizerRect.y + resizerRect.height / 2,
            }));
            resizer.ownerDocument.dispatchEvent(new PointerEvent('pointerup'));
            const afterResizeWidth = view.element.style.getPropertyValue('--timeline-controls-width');
            assert.notStrictEqual(initialWidth, afterResizeWidth);
            assert.isTrue(onResizeStub.calledOnce);
        });
    });
    describe('Animation group nodes are removed', () => {
        const waitForPreviewsManualPromise = new ManualPromise();
        const waitForAnimationGroupSelectedPromise = new ManualPromise();
        let domModel;
        let animationModel;
        let contentDocument;
        beforeEach(async () => {
            view = Animation.AnimationTimeline.AnimationTimeline.instance({ forceNew: true });
            view.markAsRoot();
            view.show(document.body);
            sinon.stub(view, 'animationGroupSelectedForTest').callsFake(() => {
                waitForAnimationGroupSelectedPromise.resolve();
            });
            sinon.stub(view, 'previewsCreatedForTest').callsFake(() => {
                waitForPreviewsManualPromise.resolve();
            });
            const model = target.model(Animation.AnimationModel.AnimationModel);
            assertNotNullOrUndefined(model);
            animationModel = model;
            const modelForDom = target.model(SDK.DOMModel.DOMModel);
            assertNotNullOrUndefined(modelForDom);
            domModel = modelForDom;
            contentDocument = SDK.DOMModel.DOMDocument.create(domModel, null, false, {
                nodeId: 0,
                backendNodeId: 0,
                nodeType: Node.DOCUMENT_NODE,
                nodeName: '#document',
                localName: 'document',
                nodeValue: '',
            });
            void animationModel.animationStarted({
                id: 'animation-id',
                name: 'animation-name',
                pausedState: false,
                playState: 'running',
                playbackRate: 1,
                startTime: 42,
                currentTime: 0,
                type: "CSSAnimation" /* Protocol.Animation.AnimationType.CSSAnimation */,
                source: {
                    delay: 0,
                    endDelay: 0,
                    duration: 10000,
                    backendNodeId: 42,
                },
            });
            await waitForPreviewsManualPromise.wait();
        });
        describe('when the animation group is already selected', () => {
            it('should hide scrubber, disable control button and make current time empty', async () => {
                const domNode = SDK.DOMModel.DOMNode.create(domModel, contentDocument, false, {
                    nodeId: 1,
                    backendNodeId: 1,
                    nodeType: Node.ELEMENT_NODE,
                    nodeName: 'div',
                    localName: 'div',
                    nodeValue: '',
                });
                sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(domNode);
                const preview = view.element.shadowRoot?.querySelector('.animation-buffer-preview');
                assertNotNullOrUndefined(preview);
                preview.click();
                await waitForAnimationGroupSelectedPromise.wait();
                const gridHeader = view.element.shadowRoot?.querySelector('.animation-grid-header');
                assertNotNullOrUndefined(gridHeader);
                assert.isTrue(gridHeader.classList.contains('scrubber-enabled'));
                const scrubber = view.element.shadowRoot?.querySelector('.animation-scrubber');
                assertNotNullOrUndefined(scrubber);
                assert.isFalse(scrubber.classList.contains('hidden'));
                const controlButton = view.element.shadowRoot?.querySelector('.animation-controls-toolbar')
                    ?.shadowRoot?.querySelector('.toolbar-button');
                assertNotNullOrUndefined(controlButton);
                assert.isFalse(controlButton.disabled);
                const currentTime = view.element.shadowRoot?.querySelector('.animation-timeline-current-time');
                assertNotNullOrUndefined(currentTime);
                domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, { node: domNode, parent: contentDocument });
                assert.isFalse(gridHeader.classList.contains('scrubber-enabled'));
                assert.isTrue(scrubber.classList.contains('hidden'));
                assert.isTrue(controlButton.disabled);
                assert.isTrue(currentTime.textContent === '');
            });
            it('should mark the animation node as removed in the NodeUI', async () => {
                const domNode = SDK.DOMModel.DOMNode.create(domModel, contentDocument, false, {
                    nodeId: 1,
                    backendNodeId: 1,
                    nodeType: Node.ELEMENT_NODE,
                    nodeName: 'div',
                    localName: 'div',
                    nodeValue: '',
                });
                sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(domNode);
                const preview = view.element.shadowRoot?.querySelector('.animation-buffer-preview');
                assertNotNullOrUndefined(preview);
                preview.click();
                await waitForAnimationGroupSelectedPromise.wait();
                // Wait for the animation group to be fully selected and scrubber enabled.
                const gridHeader = view.element.shadowRoot?.querySelector('.animation-grid-header');
                assertNotNullOrUndefined(gridHeader);
                assert.isTrue(gridHeader.classList.contains('scrubber-enabled'));
                const animationNodeRow = view.element.shadowRoot?.querySelector('.animation-node-row');
                assertNotNullOrUndefined(animationNodeRow);
                assert.isFalse(animationNodeRow.classList.contains('animation-node-removed'));
                domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, { node: domNode, parent: contentDocument });
                assert.isTrue(animationNodeRow.classList.contains('animation-node-removed'));
            });
        });
        describe('when the animation group is not selected and the nodes are removed', () => {
            it('should scrubber be hidden, control button be disabled and current time be empty', async () => {
                // Owner document is null for the resolved deferred nodes that are already removed from the DOM.
                const domNode = SDK.DOMModel.DOMNode.create(domModel, null, false, {
                    nodeId: 1,
                    backendNodeId: 1,
                    nodeType: Node.ELEMENT_NODE,
                    nodeName: 'div',
                    localName: 'div',
                    nodeValue: '',
                });
                sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(domNode);
                const preview = view.element.shadowRoot?.querySelector('.animation-buffer-preview');
                assertNotNullOrUndefined(preview);
                preview.click();
                await waitForAnimationGroupSelectedPromise.wait();
                const gridHeader = view.element.shadowRoot?.querySelector('.animation-grid-header');
                assertNotNullOrUndefined(gridHeader);
                assert.isFalse(gridHeader.classList.contains('scrubber-enabled'));
                const scrubber = view.element.shadowRoot?.querySelector('.animation-scrubber');
                assertNotNullOrUndefined(scrubber);
                assert.isTrue(scrubber.classList.contains('hidden'));
                const controlButton = view.element.shadowRoot?.querySelector('.animation-controls-toolbar')
                    ?.shadowRoot?.querySelector('.toolbar-button');
                assertNotNullOrUndefined(controlButton);
                assert.isTrue(controlButton.disabled);
                const currentTime = view.element.shadowRoot?.querySelector('.animation-timeline-current-time');
                assertNotNullOrUndefined(currentTime);
                assert.isTrue(currentTime.textContent === '');
            });
        });
    });
    describe('scroll driven animations', () => {
        const waitForPreviewsManualPromise = new ManualPromise();
        const waitForAnimationGroupSelectedPromise = new ManualPromise();
        let domModel;
        let animationModel;
        let contentDocument;
        beforeEach(async () => {
            stubAnimationDOMNode();
            stubAnimationGroup();
            view = Animation.AnimationTimeline.AnimationTimeline.instance({ forceNew: true });
            view.markAsRoot();
            view.show(document.body);
            sinon.stub(view, 'animationGroupSelectedForTest').callsFake(() => {
                waitForAnimationGroupSelectedPromise.resolve();
            });
            sinon.stub(view, 'previewsCreatedForTest').callsFake(() => {
                waitForPreviewsManualPromise.resolve();
            });
            const model = target.model(Animation.AnimationModel.AnimationModel);
            assertNotNullOrUndefined(model);
            animationModel = model;
            const modelForDom = target.model(SDK.DOMModel.DOMModel);
            assertNotNullOrUndefined(modelForDom);
            domModel = modelForDom;
            contentDocument = SDK.DOMModel.DOMDocument.create(domModel, null, false, {
                nodeId: 0,
                backendNodeId: 0,
                nodeType: Node.DOCUMENT_NODE,
                nodeName: '#document',
                localName: 'document',
                nodeValue: '',
            });
            const domNode = SDK.DOMModel.DOMNode.create(domModel, contentDocument, false, {
                nodeId: 1,
                backendNodeId: 1,
                nodeType: Node.ELEMENT_NODE,
                nodeName: 'div',
                localName: 'div',
                nodeValue: '',
            });
            sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(domNode);
            void animationModel.animationStarted({
                id: 'animation-id',
                name: 'animation-name',
                pausedState: false,
                playState: 'running',
                playbackRate: 1,
                startTime: 42,
                currentTime: 0,
                type: "CSSAnimation" /* Protocol.Animation.AnimationType.CSSAnimation */,
                source: {
                    delay: 0,
                    endDelay: 0,
                    duration: 10000,
                    backendNodeId: 42,
                },
                viewOrScrollTimeline: {
                    axis: "vertical" /* Protocol.DOM.ScrollOrientation.Vertical */,
                    sourceNodeId: 42,
                    startOffset: 42,
                    endOffset: 142,
                },
            });
            await waitForPreviewsManualPromise.wait();
        });
        it('should disable global controls after a scroll driven animation is selected', async () => {
            const preview = view.element.shadowRoot?.querySelector('.animation-buffer-preview');
            assertNotNullOrUndefined(preview);
            preview.click();
            await waitForAnimationGroupSelectedPromise.wait();
            const playbackRateButtons = [...view.element.shadowRoot?.querySelectorAll('.animation-playback-rate-button')];
            assert.isTrue(playbackRateButtons.every(button => button.getAttribute('disabled')), 'All the playback rate buttons are disabled');
            const timelineToolbar = view.element.shadowRoot?.querySelector('.animation-timeline-toolbar');
            const pauseAllButton = timelineToolbar.shadowRoot?.querySelector('[aria-label=\'Pause all\']');
            assertNotNullOrUndefined(pauseAllButton?.getAttribute('disabled'), 'Pause all button is disabled');
            const controlsToolbar = view.element.shadowRoot?.querySelector('.animation-controls-toolbar');
            const replayButton = controlsToolbar.shadowRoot?.querySelector('[aria-label=\'Replay timeline\']');
            assertNotNullOrUndefined(replayButton?.getAttribute('disabled'), 'Replay button is disabled');
        });
        it('should show current time text in pixels', async () => {
            const preview = view.element.shadowRoot?.querySelector('.animation-buffer-preview');
            assertNotNullOrUndefined(preview);
            preview.click();
            await waitForAnimationGroupSelectedPromise.wait();
            const currentTimeElement = view.element.shadowRoot?.querySelector('.animation-timeline-current-time');
            assert.isTrue(currentTimeElement.textContent?.includes('px'));
        });
        it('should show timeline grid values in percentages', async () => {
            const preview = view.element.shadowRoot?.querySelector('.animation-buffer-preview');
            assertNotNullOrUndefined(preview);
            preview.click();
            await waitForAnimationGroupSelectedPromise.wait();
            const labelElements = [...view.element.shadowRoot?.querySelectorAll('.animation-timeline-grid-label')];
            assert.isTrue(labelElements.every(el => el.textContent?.includes('%')), 'Label doesnt include a percentage');
        });
    });
});
//# sourceMappingURL=AnimationTimeline.test.js.map