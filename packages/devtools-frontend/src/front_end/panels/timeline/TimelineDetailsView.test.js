// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { describeWithEnvironment } from '../../testing/EnvironmentHelpers.js';
import { TraceLoader } from '../../testing/TraceLoader.js';
import * as Timeline from './timeline.js';
const { assert } = chai;
class MockViewDelegate {
    select(_selection) {
    }
    selectEntryAtTime(_events, _time) {
    }
    highlightEvent(_event) {
    }
}
function getRowDataForDetailsElement(details) {
    return Array.from(details.querySelectorAll('.timeline-details-view-row')).map(row => {
        const title = row.querySelector('.timeline-details-view-row-title')?.innerText;
        const value = row.querySelector('.timeline-details-view-row-value')?.innerText;
        return { title, value };
    });
}
describeWithEnvironment('TimelineDetailsView', function () {
    const mockViewDelegate = new MockViewDelegate();
    it('displays the details of a network request event correctly', async function () {
        const data = await TraceLoader.allModels(this, 'lcp-web-font.json.gz');
        const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsView(mockViewDelegate);
        const networkRequests = data.traceParsedData.NetworkRequests.byTime;
        const cssRequest = networkRequests.find(request => {
            return request.args.data.url === 'http://localhost:3000/app.css';
        });
        if (!cssRequest) {
            throw new Error('Could not find expected network request.');
        }
        const selection = Timeline.TimelineSelection.TimelineSelection.fromTraceEvent(cssRequest);
        await detailsView.setModel(data.performanceModel, data.traceParsedData, null);
        await detailsView.setSelection(selection);
        const detailsContentElement = detailsView.getDetailsContentElementForTest();
        assert.strictEqual(detailsContentElement.childNodes.length, 1);
        const rowData = getRowDataForDetailsElement(detailsContentElement);
        assert.deepEqual(rowData, [
            { title: 'URL', value: 'localhost:3000/app.css' },
            { title: 'Duration', value: '4.075ms (3.08ms network transfer + 995μs resource loading)' },
            { title: 'Request Method', value: 'GET' },
            { title: 'Initial Priority', value: 'Highest' },
            { title: 'Priority', value: 'Highest' },
            { title: 'Mime Type', value: 'text/css' },
            { title: 'Encoded Data', value: '402 B' },
            { title: 'Decoded Body', value: '96 B' },
        ]);
    });
});
//# sourceMappingURL=TimelineDetailsView.test.js.map