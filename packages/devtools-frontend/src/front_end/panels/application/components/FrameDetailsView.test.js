// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { assertNotNullOrUndefined } from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { assertShadowRoot, getCleanTextContentFromElements, getElementsWithinComponent, getElementWithinComponent, renderElementIntoDOM, } from '../../../testing/DOMHelpers.js';
import { describeWithRealConnection } from '../../../testing/RealConnection.js';
import * as ExpandableList from '../../../ui/components/expandable_list/expandable_list.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../ui/components/report_view/report_view.js';
import * as ApplicationComponents from './components.js';
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
const { assert } = chai;
const makeFrame = () => {
    const newFrame = {
        url: 'https://www.example.com/path/page.html',
        securityOrigin: 'https://www.example.com',
        displayName: () => 'TestTitle',
        unreachableUrl: () => '',
        adFrameType: () => "none" /* Protocol.Page.AdFrameType.None */,
        adFrameStatus: () => undefined,
        getAdScriptId: () => '1',
        resourceForURL: () => null,
        isSecureContext: () => true,
        isCrossOriginIsolated: () => true,
        getCrossOriginIsolatedContextType: () => "NotIsolatedFeatureDisabled" /* Protocol.Page.CrossOriginIsolatedContextType.NotIsolatedFeatureDisabled */,
        getSecureContextType: () => "SecureLocalhost" /* Protocol.Page.SecureContextType.SecureLocalhost */,
        getGatedAPIFeatures: () => ["SharedArrayBuffers" /* Protocol.Page.GatedAPIFeatures.SharedArrayBuffers */,
            "SharedArrayBuffersTransferAllowed" /* Protocol.Page.GatedAPIFeatures.SharedArrayBuffersTransferAllowed */],
        getOwnerDOMNodeOrDocument: () => ({
            nodeName: () => 'iframe',
        }),
        resourceTreeModel: () => SDK.TargetManager.TargetManager.instance().primaryPageTarget()?.model(SDK.ResourceTreeModel.ResourceTreeModel),
        getCreationStackTraceData: () => ({
            creationStackTrace: {
                callFrames: [{
                        functionName: 'function1',
                        url: 'http://www.example.com/script.js',
                        lineNumber: 15,
                        columnNumber: 10,
                        scriptId: 'someScriptId',
                    }],
            },
            creationStackTraceTarget: null,
        }),
        getOriginTrials: async () => ([
            {
                trialName: 'AppCache',
                status: 'Enabled',
                tokensWithStatus: [{
                        status: 'Success',
                        rawTokenText: 'Text',
                        parsedToken: {
                            trialName: 'AppCache',
                            origin: 'https://foo.com',
                            expiryTime: 1000,
                            usageRestriction: 'None',
                            isThirdParty: false,
                            matchSubDomains: false,
                        },
                    }],
            },
        ]),
        getPermissionsPolicyState: () => null,
        parentFrame: () => null,
    };
    return newFrame;
};
describeWithRealConnection('FrameDetailsView', () => {
    it('renders with a title', async () => {
        const frame = makeFrame();
        const component = new ApplicationComponents.FrameDetailsView.FrameDetailsReportView(frame);
        renderElementIntoDOM(component);
        assertShadowRoot(component.shadowRoot);
        void component.render();
        await coordinator.done({ waitForWork: true });
        const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
        const titleElement = report.shadowRoot.querySelector('.report-title');
        assert.strictEqual(titleElement?.textContent, frame.displayName());
    });
    it('renders report keys and values', async () => {
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const target = targetManager.rootTarget();
        assertNotNullOrUndefined(target);
        const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
        assertNotNullOrUndefined(debuggerModel);
        const debuggerId = debuggerModel.debuggerId();
        const frame = makeFrame();
        frame.adFrameType = () => "root" /* Protocol.Page.AdFrameType.Root */;
        frame.parentFrame = () => ({
            getAdScriptId: () => ({
                scriptId: 'scriptId',
                debuggerId: debuggerId,
            }),
        });
        const networkManager = target.model(SDK.NetworkManager.NetworkManager);
        assertNotNullOrUndefined(networkManager);
        sinon.stub(networkManager, 'getSecurityIsolationStatus').resolves({
            coep: {
                value: "None" /* Protocol.Network.CrossOriginEmbedderPolicyValue.None */,
                reportOnlyValue: "None" /* Protocol.Network.CrossOriginEmbedderPolicyValue.None */,
            },
            coop: {
                value: "SameOrigin" /* Protocol.Network.CrossOriginOpenerPolicyValue.SameOrigin */,
                reportOnlyValue: "SameOrigin" /* Protocol.Network.CrossOriginOpenerPolicyValue.SameOrigin */,
            },
            csp: [{
                    source: "HTTP" /* Protocol.Network.ContentSecurityPolicySource.HTTP */,
                    isEnforced: true,
                    effectiveDirectives: 'base-uri \'self\'; object-src \'none\'; script-src \'strict-dynamic\' \'unsafe-inline\' https: http: \'nonce-GsVjHiIoejpPhMPOHDQZ90yc9eJn1s\' \'unsafe-eval\'; report-uri https://www.example.com/csp',
                }],
        });
        const component = new ApplicationComponents.FrameDetailsView.FrameDetailsReportView(frame);
        renderElementIntoDOM(component);
        assertShadowRoot(component.shadowRoot);
        void component.render();
        await coordinator.done({ waitForWork: true });
        const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
        assert.deepEqual(keys, [
            'URL',
            'Origin',
            'Owner Element',
            'Frame Creation Stack Trace',
            'Ad Status',
            'Creator Ad Script',
            'Secure Context',
            'Cross-Origin Isolated',
            'Cross-Origin Embedder Policy (COEP)',
            'Cross-Origin Opener Policy (COOP)',
            'Content-Security-Policy',
            'SharedArrayBuffers',
            'Measure Memory',
        ]);
        const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
        assert.deepEqual(values, [
            'https://www.example.com/path/page.html',
            'https://www.example.com',
            '<iframe>',
            '',
            '',
            '',
            'Yes\xA0Localhost is always a secure context',
            'Yes',
            'None',
            'SameOrigin',
            'HTTP headerbase-uri: \'self\'object-src: \'none\'script-src: \'strict-dynamic\', \'unsafe-inline\', https:, http:, \'nonce-GsVjHiIoejpPhMPOHDQZ90yc9eJn1s\', \'unsafe-eval\'report-uri: https://www.example.com/csp',
            'available, transferable',
            'available\xA0Learn more',
        ]);
        const stackTrace = getElementWithinComponent(component, 'devtools-resources-stack-trace', ApplicationComponents.StackTrace.StackTrace);
        assertShadowRoot(stackTrace.shadowRoot);
        const expandableList = getElementWithinComponent(stackTrace, 'devtools-expandable-list', ExpandableList.ExpandableList.ExpandableList);
        assertShadowRoot(expandableList.shadowRoot);
        const stackTraceRows = getElementsWithinComponent(expandableList, 'devtools-stack-trace-row', ApplicationComponents.StackTrace.StackTraceRow);
        let stackTraceText = [];
        stackTraceRows.forEach(row => {
            assertShadowRoot(row.shadowRoot);
            stackTraceText = stackTraceText.concat(getCleanTextContentFromElements(row.shadowRoot, '.stack-trace-row'));
        });
        assert.deepEqual(stackTraceText[0], 'function1\xA0@\xA0http://www.example.com/script.js:16');
        const adScriptLink = component.shadowRoot.querySelector('devtools-report-value.ad-script-link');
        assertNotNullOrUndefined(adScriptLink);
        assert.strictEqual(adScriptLink.textContent, '');
    });
});
//# sourceMappingURL=FrameDetailsView.test.js.map