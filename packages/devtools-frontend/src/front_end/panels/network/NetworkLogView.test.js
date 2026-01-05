// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import { assertNotNullOrUndefined } from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as HAR from '../../models/har/har.js';
import * as Logs from '../../models/logs/logs.js';
import * as Workspace from '../../models/workspace/workspace.js';
import { assertElement, dispatchClickEvent, dispatchMouseUpEvent, raf, } from '../../testing/DOMHelpers.js';
import { createTarget } from '../../testing/EnvironmentHelpers.js';
import { describeWithMockConnection, dispatchEvent } from '../../testing/MockConnection.js';
import * as Coordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Network from './network.js';
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
describeWithMockConnection('NetworkLogView', () => {
    const tests = (targetFactory) => {
        let target;
        let networkLogView;
        let networkLog;
        beforeEach(() => {
            const dummyStorage = new Common.Settings.SettingsStorage({});
            for (const settingName of ['network-color-code-resource-types', 'network.group-by-frame']) {
                Common.Settings.registerSettingExtension({
                    settingName,
                    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
                    defaultValue: false,
                });
            }
            Common.Settings.Settings.instance({
                forceNew: true,
                syncedStorage: dummyStorage,
                globalStorage: dummyStorage,
                localStorage: dummyStorage,
            });
            sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
                shortcutTitleForAction: () => { },
                shortcutsForAction: () => [],
            });
            networkLog = Logs.NetworkLog.NetworkLog.instance();
            target = targetFactory();
        });
        let nextId = 0;
        function createNetworkRequest(url, options) {
            const effectiveTarget = options.target || target;
            const networkManager = effectiveTarget.model(SDK.NetworkManager.NetworkManager);
            assertNotNullOrUndefined(networkManager);
            let request;
            const onRequestStarted = (event) => {
                request = event.data.request;
            };
            networkManager.addEventListener(SDK.NetworkManager.Events.RequestStarted, onRequestStarted);
            dispatchEvent(effectiveTarget, 'Network.requestWillBeSent', { requestId: `request${++nextId}`, loaderId: 'loaderId', request: { url } });
            networkManager.removeEventListener(SDK.NetworkManager.Events.RequestStarted, onRequestStarted);
            assertNotNullOrUndefined(request);
            request.requestMethod = 'GET';
            if (options.requestHeaders) {
                request.setRequestHeaders(options.requestHeaders);
            }
            if (options.finished) {
                request.finished = true;
            }
            return request;
        }
        function createEnvironment() {
            const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
            networkLogView = createNetworkLogView(filterBar);
            networkLogView.markAsRoot();
            networkLogView.show(document.body);
            const rootNode = networkLogView.columns().dataGrid().rootNode();
            return { rootNode, filterBar, networkLogView };
        }
        it('generates a valid curl command when some headers don\'t have values', async () => {
            const request = createNetworkRequest('http://localhost', {
                requestHeaders: [
                    { name: 'header-with-value', value: 'some value' },
                    { name: 'no-value-header', value: '' },
                ],
            });
            const actual = await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'unix');
            const expected = 'curl \'http://localhost\' \\\n  -H \'header-with-value: some value\' \\\n  -H \'no-value-header;\'';
            assert.strictEqual(actual, expected);
        });
        // Note this isn't an ideal test as the internal headers are generated rather than explicitly added,
        // are only added on HTTP/2 and HTTP/3, have a preceeding colon like `:authority` but it still tests
        // the stripping function.
        it('generates a valid curl command while stripping internal headers', async () => {
            const request = createNetworkRequest('http://localhost', {
                requestHeaders: [
                    { name: 'authority', value: 'www.example.com' },
                ],
            });
            const actual = await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'unix');
            const expected = 'curl \'http://localhost\'';
            assert.strictEqual(actual, expected);
        });
        it('generates a valid curl command when header values contain double quotes', async () => {
            const request = createNetworkRequest('http://localhost', {
                requestHeaders: [{ name: 'cookie', value: 'eva="Sg4="' }],
            });
            assert.strictEqual(await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'unix'), 'curl \'http://localhost\' -H \'cookie: eva=\"Sg4=\"\'');
            assert.strictEqual(await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'win'), 'curl "http://localhost" -H ^"cookie: eva=^\\^"Sg4=^\\^"^"');
        });
        it('generates a valid curl command when header values contain percentages', async () => {
            const request = createNetworkRequest('http://localhost', {
                requestHeaders: [{ name: 'cookie', value: 'eva=%22Sg4%3D%22' }],
            });
            assert.strictEqual(await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'unix'), 'curl \'http://localhost\' -H \'cookie: eva=%22Sg4%3D%22\'');
            assert.strictEqual(await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'win'), 'curl "http://localhost" -H ^"cookie: eva=^%^22Sg4^%^3D^%^22^"');
        });
        function createNetworkLogView(filterBar) {
            if (!filterBar) {
                filterBar = { addFilter: () => { }, filterButton: () => ({ addEventListener: () => { } }), addDivider: () => { } };
            }
            return new Network.NetworkLogView.NetworkLogView(filterBar, document.createElement('div'), Common.Settings.Settings.instance().createSetting('network-log-large-rows', false));
        }
        const tests = (inScope) => () => {
            beforeEach(() => {
                networkLogView = createNetworkLogView();
                SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
            });
            it('adds dividers on main frame load events', async () => {
                const addEventDividers = sinon.spy(networkLogView.columns(), 'addEventDividers');
                networkLogView.setRecording(true);
                const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
                assertNotNullOrUndefined(resourceTreeModel);
                resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.Load, { resourceTreeModel, loadTime: 5 });
                resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 6);
                if (inScope) {
                    assert.isTrue(addEventDividers.calledTwice);
                    assert.isTrue(addEventDividers.getCall(0).calledWith([5], 'network-load-divider'));
                    assert.isTrue(addEventDividers.getCall(1).calledWith([6], 'network-dcl-divider'));
                }
                else {
                    assert.isFalse(addEventDividers.called);
                }
            });
            it('can export all as HAR', async () => {
                SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
                const harWriterWrite = sinon.stub(HAR.Writer.Writer, 'write').resolves();
                const URL_HOST = 'example.com';
                target.setInspectedURL(`http://${URL_HOST}/foo`);
                const FILENAME = `${URL_HOST}.har`;
                const fileManager = Workspace.FileManager.FileManager.instance();
                const fileManagerSave = sinon.stub(fileManager, 'save').withArgs(FILENAME, '', true).resolves({ fileSystemPath: FILENAME });
                const fileManagerClose = sinon.stub(fileManager, 'close');
                const FINISHED_REQUEST_1 = createNetworkRequest('http://example.com/', { finished: true });
                const FINISHED_REQUEST_2 = createNetworkRequest('http://example.com/favicon.ico', { finished: true });
                const UNFINISHED_REQUEST = createNetworkRequest('http://example.com/background.bmp', { finished: false });
                sinon.stub(Logs.NetworkLog.NetworkLog.instance(), 'requests').returns([
                    FINISHED_REQUEST_1,
                    FINISHED_REQUEST_2,
                    UNFINISHED_REQUEST,
                ]);
                await networkLogView.exportAll();
                if (inScope) {
                    assert.isTrue(harWriterWrite.calledOnceWith(sinon.match.any, [FINISHED_REQUEST_1, FINISHED_REQUEST_2], sinon.match.any));
                    assert.isTrue(fileManagerSave.calledOnce);
                    assert.isTrue(fileManagerClose.calledOnce);
                }
                else {
                    assert.isFalse(harWriterWrite.called);
                    assert.isFalse(fileManagerSave.called);
                    assert.isFalse(fileManagerClose.called);
                }
            });
            it('can import and filter from HAR', async () => {
                const URL_1 = 'http://example.com/';
                const URL_2 = 'http://example.com/favicon.ico';
                function makeHarEntry(url) {
                    return {
                        request: { method: 'GET', url: url, headersSize: -1, bodySize: 0 },
                        response: { status: 0, content: { 'size': 0, 'mimeType': 'x-unknown' }, headersSize: -1, bodySize: -1 },
                        startedDateTime: null,
                        time: null,
                        timings: { blocked: null, dns: -1, ssl: -1, connect: -1, send: 0, wait: 0, receive: 0 },
                    };
                }
                const har = {
                    log: {
                        version: '1.2',
                        creator: { name: 'WebInspector', version: '537.36' },
                        entries: [makeHarEntry(URL_1), makeHarEntry(URL_2)],
                    },
                };
                networkLogView.markAsRoot();
                networkLogView.show(document.body);
                const blob = new Blob([JSON.stringify(har)], { type: 'text/plain' });
                const file = new File([blob], 'log.har');
                await networkLogView.onLoadFromFile(file);
                await coordinator.done({ waitForWork: true });
                const rootNode = networkLogView.columns().dataGrid().rootNode();
                assert.deepEqual(rootNode.children.map(n => n.request()?.url()), [URL_1, URL_2]);
                networkLogView.setTextFilterValue('favicon');
                assert.deepEqual(rootNode.children.map(n => n.request()?.url()), [URL_2]);
                networkLogView.detach();
            });
            it('shows summary toolbar with content', () => {
                target.setInspectedURL('http://example.com/');
                const request = createNetworkRequest('http://example.com/', { finished: true });
                request.endTime = 0.669414;
                request.setIssueTime(0.435136, 0.435136);
                request.setResourceType(Common.ResourceType.resourceTypes.Document);
                networkLogView.setRecording(true);
                const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
                assertNotNullOrUndefined(resourceTreeModel);
                resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.Load, { resourceTreeModel, loadTime: 0.686191 });
                resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 0.683709);
                networkLogView.markAsRoot();
                networkLogView.show(document.body);
                const toolbar = networkLogView.summaryToolbar();
                const textElements = toolbar.element.shadowRoot?.querySelectorAll('.toolbar-text');
                assertNotNullOrUndefined(textElements);
                const textContents = [...textElements].map(item => item.textContent);
                if (inScope) {
                    assert.deepEqual(textContents, [
                        '1 requests',
                        '0\u00a0B transferred',
                        '0\u00a0B resources',
                        'Finish: 234\u00a0ms',
                        'DOMContentLoaded: 249\u00a0ms',
                        'Load: 251\u00a0ms',
                    ]);
                }
                else {
                    assert.strictEqual(textElements.length, 0);
                }
                networkLogView.detach();
            });
        };
        describe('in scope', tests(true));
        describe('out of scope', tests(false));
        const handlesSwitchingScope = (preserveLog) => async () => {
            Common.Settings.Settings.instance().moduleSetting('network-log.preserve-log').set(preserveLog);
            SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
            const anotherTarget = createTarget();
            const networkManager = target.model(SDK.NetworkManager.NetworkManager);
            assertNotNullOrUndefined(networkManager);
            const request1 = createNetworkRequest('url1', { target });
            const request2 = createNetworkRequest('url2', { target });
            const request3 = createNetworkRequest('url3', { target: anotherTarget });
            networkLogView = createNetworkLogView();
            networkLogView.markAsRoot();
            networkLogView.show(document.body);
            await coordinator.done();
            const rootNode = networkLogView.columns().dataGrid().rootNode();
            assert.deepEqual(rootNode.children.map(n => n.request()), [request1, request2]);
            SDK.TargetManager.TargetManager.instance().setScopeTarget(anotherTarget);
            await coordinator.done();
            assert.deepEqual(rootNode.children.map(n => n.request()), preserveLog ? [request1, request2, request3] : [request3]);
            networkLogView.detach();
        };
        it('replaces requests when switching scope with preserve log off', handlesSwitchingScope(false));
        it('appends requests when switching scope with preserve log on', handlesSwitchingScope(true));
        it('appends requests on prerender activation with preserve log on', async () => {
            Common.Settings.Settings.instance().moduleSetting('network-log.preserve-log').set(true);
            SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
            const anotherTarget = createTarget();
            const networkManager = target.model(SDK.NetworkManager.NetworkManager);
            assertNotNullOrUndefined(networkManager);
            const request1 = createNetworkRequest('url1', { target });
            const request2 = createNetworkRequest('url2', { target });
            const request3 = createNetworkRequest('url3', { target: anotherTarget });
            networkLogView = createNetworkLogView();
            networkLogView.markAsRoot();
            networkLogView.show(document.body);
            await coordinator.done();
            const rootNode = networkLogView.columns().dataGrid().rootNode();
            assert.deepEqual(rootNode.children.map(n => n.request()), [request1, request2]);
            const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
            assertNotNullOrUndefined(resourceTreeModel);
            const frame = {
                url: 'http://example.com/',
                unreachableUrl: () => Platform.DevToolsPath.EmptyUrlString,
                resourceTreeModel: () => resourceTreeModel,
            };
            resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, { frame, type: "Activation" /* SDK.ResourceTreeModel.PrimaryPageChangeType.Activation */ });
            await coordinator.done();
            assert.deepEqual(rootNode.children.map(n => n.request()), [request1, request2, request3]);
            networkLogView.detach();
        });
        it('hide Chrome extension requests from checkbox', async () => {
            createNetworkRequest('chrome-extension://url1', { target });
            createNetworkRequest('url2', { target });
            let rootNode;
            let filterBar;
            ({ rootNode, filterBar, networkLogView } = createEnvironment());
            const hideExtCheckbox = getCheckbox(filterBar, 'Hide \'chrome-extension://\' URLs');
            assert.deepEqual(rootNode.children.map(n => n.request()?.url()), ['chrome-extension://url1', 'url2']);
            clickCheckbox(hideExtCheckbox);
            assert.deepEqual(rootNode.children.map(n => n.request()?.url()), ['url2']);
            networkLogView.detach();
        });
        it('can hide Chrome extension requests from dropdown', async () => {
            Root.Runtime.experiments.enableForTest("network-panel-filter-bar-redesign" /* Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN */);
            createNetworkRequest('chrome-extension://url1', { target });
            createNetworkRequest('url2', { target });
            let rootNode;
            let filterBar;
            ({ rootNode, filterBar, networkLogView } = createEnvironment());
            assert.deepEqual(rootNode.children.map(n => n.request()?.url()), ['chrome-extension://url1', 'url2']);
            const dropdown = await openMoreTypesDropdown(filterBar, networkLogView);
            if (!dropdown) {
                return;
            }
            const softMenu = getSoftMenu();
            const hideExtensionURL = getDropdownItem(softMenu, 'Hide extension URLs');
            assert.isFalse(hideExtensionURL.hasAttribute('checked'));
            dispatchMouseUpEvent(hideExtensionURL);
            await raf();
            assert.isTrue(hideExtensionURL.hasAttribute('checked'));
            assert.deepEqual(rootNode.children.map(n => n.request()?.url()), ['url2']);
            dropdown.discard();
            networkLogView.detach();
        });
        it('displays correct count for more filters', async () => {
            Root.Runtime.experiments.enableForTest("network-panel-filter-bar-redesign" /* Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN */);
            let filterBar;
            ({ filterBar, networkLogView } = createEnvironment());
            const dropdown = await openMoreTypesDropdown(filterBar, networkLogView);
            if (!dropdown) {
                return;
            }
            assert.strictEqual(getMoreFiltersActiveCount(filterBar), '0');
            assert.isTrue(getCountAdorner(filterBar)?.classList.contains('hidden'));
            const softMenu = getSoftMenu();
            await selectMoreFiltersOption(softMenu, 'Hide extension URLs');
            assert.strictEqual(getMoreFiltersActiveCount(filterBar), '1');
            assert.isFalse(getCountAdorner(filterBar)?.classList.contains('hidden'));
            dropdown.discard();
            networkLogView.detach();
        });
        it('can automatically check the `All` option in the `Request Type` when the only type checked becomes unchecked', async () => {
            Root.Runtime.experiments.enableForTest("network-panel-filter-bar-redesign" /* Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN */);
            const dropdown = setupRequestTypesDropdown();
            const button = dropdown.element().querySelector('.toolbar-button');
            assertElement(button, HTMLElement);
            dispatchClickEvent(button, { bubbles: true, composed: true });
            await raf();
            const optionImg = getRequestTypeDropdownOption('Image');
            const optionImgCheckmark = optionImg?.querySelector('.checkmark') || null;
            const optionAll = getRequestTypeDropdownOption('All');
            const optionAllCheckmark = optionAll?.querySelector('.checkmark') || null;
            assertElement(optionImg, HTMLElement);
            assertElement(optionImgCheckmark, HTMLElement);
            assertElement(optionAll, HTMLElement);
            assertElement(optionAllCheckmark, HTMLElement);
            assert.isTrue(optionAll.ariaLabel === 'All, checked');
            assert.isTrue(optionImg.ariaLabel === 'Image, unchecked');
            assert.isTrue(window.getComputedStyle(optionAllCheckmark).getPropertyValue('opacity') === '1');
            assert.isTrue(window.getComputedStyle(optionImgCheckmark).getPropertyValue('opacity') === '0');
            await selectRequestTypesOption('Image');
            assert.isTrue(optionAll.ariaLabel === 'All, unchecked');
            assert.isTrue(optionImg.ariaLabel === 'Image, checked');
            assert.isTrue(window.getComputedStyle(optionAllCheckmark).getPropertyValue('opacity') === '0');
            assert.isTrue(window.getComputedStyle(optionImgCheckmark).getPropertyValue('opacity') === '1');
            await selectRequestTypesOption('Image');
            assert.isTrue(optionAll.ariaLabel === 'All, checked');
            assert.isTrue(optionImg.ariaLabel === 'Image, unchecked');
            assert.isTrue(window.getComputedStyle(optionAllCheckmark).getPropertyValue('opacity') === '1');
            assert.isTrue(window.getComputedStyle(optionImgCheckmark).getPropertyValue('opacity') === '0');
            dropdown.discard();
            await raf();
        });
        it('shows correct selected request types count', async () => {
            Root.Runtime.experiments.enableForTest("network-panel-filter-bar-redesign" /* Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN */);
            const umaCountSpy = sinon.spy(Host.userMetrics, 'resourceTypeFilterNumberOfSelectedChanged');
            const umaTypeSpy = sinon.spy(Host.userMetrics, 'resourceTypeFilterItemSelected');
            const dropdown = setupRequestTypesDropdown();
            const button = dropdown.element().querySelector('.toolbar-button');
            assertElement(button, HTMLElement);
            let countAdorner = button.querySelector('.active-filters-count');
            assert.isTrue(countAdorner?.classList.contains('hidden'));
            dispatchClickEvent(button, { bubbles: true, composed: true });
            await raf();
            await selectRequestTypesOption('Image');
            countAdorner = button.querySelector('.active-filters-count');
            assert.isFalse(countAdorner?.classList.contains('hidden'));
            assert.strictEqual(countAdorner?.querySelector('[slot="content"]')?.textContent, '1');
            dropdown.discard();
            await raf();
            assert.isTrue(umaCountSpy.calledOnceWith(1));
            assert.isTrue(umaTypeSpy.calledOnceWith('Image'));
        });
        it('adjusts request types label dynamically', async () => {
            Root.Runtime.experiments.enableForTest("network-panel-filter-bar-redesign" /* Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN */);
            const dropdown = setupRequestTypesDropdown();
            const button = dropdown.element().querySelector('.toolbar-button');
            assertElement(button, HTMLElement);
            let toolbarText = button.querySelector('.toolbar-text')?.textContent;
            assert.strictEqual(toolbarText, 'Request types');
            dispatchClickEvent(button, { bubbles: true, composed: true });
            await raf();
            await selectRequestTypesOption('Image');
            await selectRequestTypesOption('JavaScript');
            toolbarText = button.querySelector('.toolbar-text')?.textContent;
            assert.strictEqual(toolbarText, 'JS, Img');
            await selectRequestTypesOption('CSS');
            toolbarText = button.querySelector('.toolbar-text')?.textContent;
            assert.strictEqual(toolbarText, 'CSS, JS...');
            dropdown.discard();
            await raf();
        });
        it('lists selected types in requests types tooltip', async () => {
            Root.Runtime.experiments.enableForTest("network-panel-filter-bar-redesign" /* Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN */);
            const umaCountSpy = sinon.spy(Host.userMetrics, 'resourceTypeFilterNumberOfSelectedChanged');
            const umaTypeSpy = sinon.spy(Host.userMetrics, 'resourceTypeFilterItemSelected');
            const dropdown = setupRequestTypesDropdown();
            const button = dropdown.element().querySelector('.toolbar-button');
            assertElement(button, HTMLElement);
            let tooltipText = button.title;
            assert.strictEqual(tooltipText, 'Filter requests by type');
            dispatchClickEvent(button, { bubbles: true, composed: true });
            await raf();
            await selectRequestTypesOption('Image');
            await selectRequestTypesOption('JavaScript');
            tooltipText = button.title;
            assert.strictEqual(tooltipText, 'Show only JavaScript, Image');
            dropdown.discard();
            await raf();
            assert.isTrue(umaCountSpy.calledOnceWith(2));
            assert.isTrue(umaTypeSpy.calledTwice);
            assert.isTrue(umaTypeSpy.calledWith('Image'));
            assert.isTrue(umaTypeSpy.calledWith('JavaScript'));
        });
        it('updates tooltip to default when request type deselected', async () => {
            Root.Runtime.experiments.enableForTest("network-panel-filter-bar-redesign" /* Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN */);
            const dropdown = setupRequestTypesDropdown();
            const button = dropdown.element().querySelector('.toolbar-button');
            assertElement(button, HTMLElement);
            dispatchClickEvent(button, { bubbles: true, composed: true });
            await raf();
            await selectRequestTypesOption('Image');
            let tooltipText = button.title;
            assert.strictEqual(tooltipText, 'Show only Image');
            await selectRequestTypesOption('Image');
            tooltipText = button.title;
            assert.strictEqual(tooltipText, 'Filter requests by type');
            dropdown.discard();
            await raf();
        });
        it('can filter requests with blocked response cookies from checkbox', async () => {
            const request1 = createNetworkRequest('url1', { target });
            request1.blockedResponseCookies = () => [{
                    blockedReasons: ["SameSiteNoneInsecure" /* Protocol.Network.SetCookieBlockedReason.SameSiteNoneInsecure */],
                    cookie: null,
                    cookieLine: 'foo=bar; SameSite=None',
                }];
            createNetworkRequest('url2', { target });
            let rootNode;
            let filterBar;
            ({ rootNode, filterBar, networkLogView } = createEnvironment());
            const blockedCookiesCheckbox = getCheckbox(filterBar, 'Show only requests with blocked response cookies');
            clickCheckbox(blockedCookiesCheckbox);
            assert.deepEqual(rootNode.children.map(n => n.request()?.url()), [
                'url1',
            ]);
            networkLogView.detach();
        });
        it('can filter requests with blocked response cookies from dropdown', async () => {
            Root.Runtime.experiments.enableForTest("network-panel-filter-bar-redesign" /* Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN */);
            const umaCountSpy = sinon.spy(Host.userMetrics, 'networkPanelMoreFiltersNumberOfSelectedChanged');
            const umaItemSpy = sinon.spy(Host.userMetrics, 'networkPanelMoreFiltersItemSelected');
            const request1 = createNetworkRequest('url1', { target });
            request1.blockedResponseCookies = () => [{
                    blockedReasons: ["SameSiteNoneInsecure" /* Protocol.Network.SetCookieBlockedReason.SameSiteNoneInsecure */],
                    cookie: null,
                    cookieLine: 'foo=bar; SameSite=None',
                }];
            createNetworkRequest('url2', { target });
            let rootNode;
            let filterBar;
            ({ rootNode, filterBar, networkLogView } = createEnvironment());
            assert.deepEqual(rootNode.children.map(n => n.request()?.url()), ['url1', 'url2']);
            const dropdown = await openMoreTypesDropdown(filterBar, networkLogView);
            if (!dropdown) {
                return;
            }
            const softMenu = getSoftMenu();
            const blockedResponseCookies = getDropdownItem(softMenu, 'Blocked response cookies');
            assert.isFalse(blockedResponseCookies.hasAttribute('checked'));
            dispatchMouseUpEvent(blockedResponseCookies);
            await raf();
            assert.isTrue(blockedResponseCookies.hasAttribute('checked'));
            assert.deepEqual(rootNode.children.map(n => n.request()?.url()), [
                'url1',
            ]);
            dropdown.discard();
            assert.isTrue(umaCountSpy.calledOnceWith(1));
            assert.isTrue(umaItemSpy.calledOnceWith('Blocked response cookies'));
            networkLogView.detach();
        });
        it('lists selected options in more filters tooltip', async () => {
            Root.Runtime.experiments.enableForTest("network-panel-filter-bar-redesign" /* Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN */);
            const umaCountSpy = sinon.spy(Host.userMetrics, 'networkPanelMoreFiltersNumberOfSelectedChanged');
            const umaItemSpy = sinon.spy(Host.userMetrics, 'networkPanelMoreFiltersItemSelected');
            let filterBar;
            ({ filterBar, networkLogView } = createEnvironment());
            const dropdown = await openMoreTypesDropdown(filterBar, networkLogView);
            assertNotNullOrUndefined(dropdown);
            const button = dropdown.element().querySelector('.toolbar-button');
            assertElement(button, HTMLElement);
            assert.strictEqual(button.title, 'Show only/hide requests');
            const softMenu = getSoftMenu();
            await selectMoreFiltersOption(softMenu, 'Blocked response cookies');
            await selectMoreFiltersOption(softMenu, 'Hide extension URLs');
            assert.strictEqual(button.title, 'Hide extension URLs, Blocked response cookies');
            dropdown.discard();
            assert.isTrue(umaCountSpy.calledOnceWith(2));
            assert.isTrue(umaItemSpy.calledTwice);
            assert.isTrue(umaItemSpy.calledWith('Hide extension URLs'));
            assert.isTrue(umaItemSpy.calledWith('Blocked response cookies'));
            networkLogView.detach();
        });
        it('updates tooltip to default when more filters option deselected', async () => {
            Root.Runtime.experiments.enableForTest("network-panel-filter-bar-redesign" /* Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN */);
            let filterBar;
            ({ filterBar, networkLogView } = createEnvironment());
            const dropdown = await openMoreTypesDropdown(filterBar, networkLogView);
            assertNotNullOrUndefined(dropdown);
            const button = dropdown.element().querySelector('.toolbar-button');
            assertElement(button, HTMLElement);
            assert.strictEqual(button.title, 'Show only/hide requests');
            const softMenu = getSoftMenu();
            await selectMoreFiltersOption(softMenu, 'Blocked response cookies');
            assert.strictEqual(button.title, 'Blocked response cookies');
            await selectMoreFiltersOption(softMenu, 'Blocked response cookies');
            assert.strictEqual(button.title, 'Show only/hide requests');
            dropdown.discard();
            networkLogView.detach();
        });
        it('can remove requests', async () => {
            networkLogView = createNetworkLogView();
            const request = createNetworkRequest('url1', { target });
            networkLogView.markAsRoot();
            networkLogView.show(document.body);
            const rootNode = networkLogView.columns().dataGrid().rootNode();
            assert.strictEqual(rootNode.children.length, 1);
            networkLog.dispatchEventToListeners(Logs.NetworkLog.Events.RequestRemoved, { request });
            assert.strictEqual(rootNode.children.length, 0);
            networkLogView.detach();
        });
        function createOverrideRequests() {
            const urlNotOverridden = 'url-not-overridden';
            const urlHeaderOverridden = 'url-header-overridden';
            const urlContentOverridden = 'url-content-overridden';
            const urlHeaderAndContentOverridden = 'url-header-und-content-overridden';
            createNetworkRequest(urlNotOverridden, { target });
            const r2 = createNetworkRequest(urlHeaderOverridden, { target });
            const r3 = createNetworkRequest(urlContentOverridden, { target });
            const r4 = createNetworkRequest(urlHeaderAndContentOverridden, { target });
            // set up overrides
            r2.originalResponseHeaders = [{ name: 'content-type', value: 'x' }];
            r2.responseHeaders = [{ name: 'content-type', value: 'overriden' }];
            r3.hasOverriddenContent = true;
            r4.originalResponseHeaders = [{ name: 'age', value: 'x' }];
            r4.responseHeaders = [{ name: 'age', value: 'overriden' }];
            r4.hasOverriddenContent = true;
            return { urlNotOverridden, urlHeaderOverridden, urlContentOverridden, urlHeaderAndContentOverridden };
        }
        it('can apply filter - has-overrides:yes', async () => {
            const { urlHeaderOverridden, urlContentOverridden, urlHeaderAndContentOverridden } = createOverrideRequests();
            const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
            networkLogView = createNetworkLogView(filterBar);
            networkLogView.setTextFilterValue('has-overrides:yes');
            networkLogView.markAsRoot();
            networkLogView.show(document.body);
            const rootNode = networkLogView.columns().dataGrid().rootNode();
            assert.deepEqual(rootNode.children.map(n => n.request()?.url()), [
                urlHeaderOverridden,
                urlContentOverridden,
                urlHeaderAndContentOverridden,
            ]);
            networkLogView.detach();
        });
        it('can apply filter - has-overrides:no', async () => {
            const { urlNotOverridden } = createOverrideRequests();
            const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
            networkLogView = createNetworkLogView(filterBar);
            networkLogView.setTextFilterValue('has-overrides:no');
            networkLogView.markAsRoot();
            networkLogView.show(document.body);
            const rootNode = networkLogView.columns().dataGrid().rootNode();
            assert.deepEqual(rootNode.children.map(n => n.request()?.url()), [
                urlNotOverridden,
            ]);
            networkLogView.detach();
        });
        it('can apply filter - has-overrides:headers', async () => {
            const { urlHeaderOverridden, urlHeaderAndContentOverridden } = createOverrideRequests();
            const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
            networkLogView = createNetworkLogView(filterBar);
            networkLogView.setTextFilterValue('has-overrides:headers');
            networkLogView.markAsRoot();
            networkLogView.show(document.body);
            const rootNode = networkLogView.columns().dataGrid().rootNode();
            assert.deepEqual(rootNode.children.map(n => n.request()?.url()), [
                urlHeaderOverridden,
                urlHeaderAndContentOverridden,
            ]);
            networkLogView.detach();
        });
        it('can apply filter - has-overrides:content', async () => {
            const { urlContentOverridden, urlHeaderAndContentOverridden } = createOverrideRequests();
            const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
            networkLogView = createNetworkLogView(filterBar);
            networkLogView.setTextFilterValue('has-overrides:content');
            networkLogView.markAsRoot();
            networkLogView.show(document.body);
            const rootNode = networkLogView.columns().dataGrid().rootNode();
            assert.deepEqual(rootNode.children.map(n => n.request()?.url()), [
                urlContentOverridden,
                urlHeaderAndContentOverridden,
            ]);
            networkLogView.detach();
        });
        it('can apply filter - has-overrides:tent', async () => {
            const { urlHeaderAndContentOverridden, urlContentOverridden } = createOverrideRequests();
            const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
            networkLogView = createNetworkLogView(filterBar);
            networkLogView.setTextFilterValue('has-overrides:tent'); // partial text
            networkLogView.markAsRoot();
            networkLogView.show(document.body);
            const rootNode = networkLogView.columns().dataGrid().rootNode();
            assert.deepEqual(rootNode.children.map(n => n.request()?.url()), [
                urlContentOverridden,
                urlHeaderAndContentOverridden,
            ]);
            networkLogView.detach();
        });
    };
    describe('without tab target', () => tests(createTarget));
    describe('with tab target', () => tests(() => {
        const tabTarget = createTarget({ type: SDK.Target.Type.Tab });
        createTarget({ parentTarget: tabTarget, subtype: 'prerender' });
        return createTarget({ parentTarget: tabTarget });
    }));
});
function clickCheckbox(checkbox) {
    checkbox.checked = true;
    const event = new Event('change');
    checkbox.dispatchEvent(event);
}
function getCheckbox(filterBar, title) {
    const checkbox = filterBar.element.querySelector(`[title="${title}"] span`)?.shadowRoot?.querySelector('input') || null;
    assertElement(checkbox, HTMLInputElement);
    return checkbox;
}
function getRequestTypeDropdownOption(requestType) {
    const dropDownVbox = document.querySelector('.vbox')?.shadowRoot?.querySelectorAll('.soft-context-menu-item') || [];
    const dropdownOptions = Array.from(dropDownVbox);
    return dropdownOptions.find(el => el.textContent?.includes(requestType)) || null;
}
async function selectRequestTypesOption(option) {
    const item = getRequestTypeDropdownOption(option);
    assertElement(item, HTMLElement);
    dispatchMouseUpEvent(item, { bubbles: true, composed: true });
    await raf();
}
async function openMoreTypesDropdown(filterBar, networkLogView) {
    const button = filterBar.element.querySelector('[aria-label="Show only/hide requests dropdown"]')
        ?.querySelector('.toolbar-button');
    button?.dispatchEvent(new Event('click'));
    await raf();
    const dropdown = networkLogView.getMoreFiltersDropdown();
    return dropdown;
}
function setupRequestTypesDropdown() {
    const filterItems = Object.entries(Common.ResourceType.resourceCategories).map(([key, category]) => ({
        name: category.title(),
        label: () => category.shortTitle(),
        title: category.title(),
        jslogContext: key,
    }));
    const setting = Common.Settings.Settings.instance().createSetting('network-resource-type-filters', { all: true });
    const dropdown = new Network.NetworkLogView.DropDownTypesUI(filterItems, setting);
    return dropdown;
}
function getCountAdorner(filterBar) {
    const button = filterBar.element.querySelector('[aria-label="Show only/hide requests dropdown"]')
        ?.querySelector('.toolbar-button');
    return button?.querySelector('.active-filters-count') ?? null;
}
function getMoreFiltersActiveCount(filterBar) {
    const countAdorner = getCountAdorner(filterBar);
    const count = countAdorner?.querySelector('[slot="content"]')?.textContent ?? '';
    return count;
}
function getSoftMenu() {
    const container = document.querySelector('div[data-devtools-glass-pane]');
    const softMenu = container.shadowRoot.querySelector('.soft-context-menu');
    assertElement(softMenu, HTMLElement);
    return softMenu;
}
function getDropdownItem(softMenu, label) {
    const item = softMenu?.querySelector(`[aria-label^="${label}"]`);
    assertElement(item, HTMLElement);
    return item;
}
async function selectMoreFiltersOption(softMenu, option) {
    const item = getDropdownItem(softMenu, option);
    dispatchMouseUpEvent(item);
    await raf();
}
//# sourceMappingURL=NetworkLogView.test.js.map