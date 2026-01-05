// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';
const UIStrings = {
    /**
     *@description Text in Timeline Loader of the Performance panel
     */
    malformedTimelineDataUnknownJson: 'Malformed timeline data: Unknown JSON format',
    /**
     *@description Text in Timeline Loader of the Performance panel
     */
    malformedTimelineInputWrongJson: 'Malformed timeline input, wrong JSON brackets balance',
    /**
     *@description Text in Timeline Loader of the Performance panel
     *@example {Unknown JSON format} PH1
     */
    malformedTimelineDataS: 'Malformed timeline data: {PH1}',
    /**
     *@description Text in Timeline Loader of the Performance panel
     */
    legacyTimelineFormatIsNot: 'Legacy Timeline format is not supported.',
    /**
     *@description Text in Timeline Loader of the Performance panel
     */
    malformedCpuProfileFormat: 'Malformed CPU profile format',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineLoader.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * This class handles loading traces from file and URL, and from the Lighthouse panel
 * It also handles loading cpuprofiles from file, url and console.profileEnd()
 *
 * Meanwhile, the normal trace recording flow bypasses TimelineLoader entirely,
 * as it's handled from TracingManager => TimelineController.
 */
export class TimelineLoader {
    client;
    tracingModel;
    canceledCallback;
    state;
    buffer;
    firstRawChunk;
    firstChunk;
    loadedBytes;
    totalSize;
    jsonTokenizer;
    filter;
    #collectedEvents = [];
    #traceFinalizedCallbackForTest;
    #traceFinalizedPromiseForTest;
    constructor(client, title) {
        this.client = client;
        this.tracingModel = new TraceEngine.Legacy.TracingModel(title);
        this.canceledCallback = null;
        this.state = "Initial" /* State.Initial */;
        this.buffer = '';
        this.firstRawChunk = true;
        this.firstChunk = true;
        this.loadedBytes = 0;
        this.jsonTokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(this.writeBalancedJSON.bind(this), true);
        this.filter = null;
        this.#traceFinalizedPromiseForTest = new Promise(resolve => {
            this.#traceFinalizedCallbackForTest = resolve;
        });
    }
    static async loadFromFile(file, client) {
        const loader = new TimelineLoader(client);
        const fileReader = new Bindings.FileUtils.ChunkedFileReader(file, TransferChunkLengthBytes);
        loader.canceledCallback = fileReader.cancel.bind(fileReader);
        loader.totalSize = file.size;
        // We'll resolve and return the loader instance before finalizing the trace.
        setTimeout(async () => {
            const success = await fileReader.read(loader);
            if (!success && fileReader.error()) {
                // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                loader.reportErrorAndCancelLoading(fileReader.error().message);
            }
        });
        return loader;
    }
    static loadFromEvents(events, client) {
        const loader = new TimelineLoader(client);
        window.setTimeout(async () => {
            void loader.addEvents(events);
        });
        return loader;
    }
    static getCpuProfileFilter() {
        const visibleTypes = [];
        visibleTypes.push(TimelineModel.TimelineModel.RecordType.JSFrame);
        visibleTypes.push(TimelineModel.TimelineModel.RecordType.JSIdleFrame);
        visibleTypes.push(TimelineModel.TimelineModel.RecordType.JSSystemFrame);
        return new TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter(visibleTypes);
    }
    static loadFromCpuProfile(profile, client, title) {
        const loader = new TimelineLoader(client, title);
        loader.state = "LoadingCPUProfileFromRecording" /* State.LoadingCPUProfileFromRecording */;
        try {
            const events = TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.createFakeTraceFromCpuProfile(profile, /* tid */ 1, /* injectPageEvent */ true);
            loader.filter = TimelineLoader.getCpuProfileFilter();
            window.setTimeout(async () => {
                void loader.addEvents(events);
            });
        }
        catch (e) {
            console.error(e.stack);
        }
        return loader;
    }
    static async loadFromURL(url, client) {
        const loader = new TimelineLoader(client);
        const stream = new Common.StringOutputStream.StringOutputStream();
        await client.loadingStarted();
        const allowRemoteFilePaths = Common.Settings.Settings.instance().moduleSetting('network.enable-remote-file-loading').get();
        Host.ResourceLoader.loadAsStream(url, null, stream, finishedCallback, allowRemoteFilePaths);
        async function finishedCallback(success, _headers, errorDescription) {
            if (!success) {
                return loader.reportErrorAndCancelLoading(errorDescription.message);
            }
            const txt = stream.data();
            const trace = JSON.parse(txt);
            if (Array.isArray(trace.nodes)) {
                loader.state = "LoadingCPUProfileFromFile" /* State.LoadingCPUProfileFromFile */;
                loader.buffer = txt;
                await loader.close();
                return;
            }
            const events = Array.isArray(trace.traceEvents) ? trace.traceEvents : trace;
            void loader.addEvents(events);
        }
        return loader;
    }
    async addEvents(events) {
        await this.client?.loadingStarted();
        const eventsPerChunk = 15_000;
        for (let i = 0; i < events.length; i += eventsPerChunk) {
            const chunk = events.slice(i, i + eventsPerChunk);
            this.#collectEvents(chunk);
            this.tracingModel.addEvents(chunk);
            await this.client?.loadingProgress((i + chunk.length) / events.length);
            await new Promise(r => window.setTimeout(r)); // Yield event loop to paint.
        }
        void this.close();
    }
    async cancel() {
        this.tracingModel = null;
        if (this.client) {
            await this.client.loadingComplete(
            /* collectedEvents */ [], /* tracingModel= */ null, /* exclusiveFilter= */ null, /* isCpuProfile= */ false, 
            /* recordingStartTime= */ null);
            this.client = null;
        }
        if (this.canceledCallback) {
            this.canceledCallback();
        }
    }
    async write(chunk) {
        if (!this.client) {
            return Promise.resolve();
        }
        this.loadedBytes += chunk.length;
        if (this.firstRawChunk) {
            await this.client.loadingStarted();
            // Ensure we paint the loading dialog before continuing
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        else {
            let progress = undefined;
            if (this.totalSize) {
                progress = this.loadedBytes / this.totalSize;
                // For compressed traces, we can't provide a definite progress percentage. So, just keep it moving.
                progress = progress > 1 ? progress - Math.floor(progress) : progress;
            }
            await this.client.loadingProgress(progress);
        }
        this.firstRawChunk = false;
        if (this.state === "Initial" /* State.Initial */) {
            if (chunk.match(/^{(\s)*"nodes":(\s)*\[/)) {
                this.state = "LoadingCPUProfileFromFile" /* State.LoadingCPUProfileFromFile */;
            }
            else if (chunk[0] === '{') {
                this.state = "LookingForEvents" /* State.LookingForEvents */;
            }
            else if (chunk[0] === '[') {
                this.state = "ReadingEvents" /* State.ReadingEvents */;
            }
            else {
                this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineDataUnknownJson));
                return Promise.resolve();
            }
        }
        if (this.state === "LoadingCPUProfileFromFile" /* State.LoadingCPUProfileFromFile */) {
            this.buffer += chunk;
            return Promise.resolve();
        }
        if (this.state === "LookingForEvents" /* State.LookingForEvents */) {
            const objectName = '"traceEvents":';
            const startPos = this.buffer.length - objectName.length;
            this.buffer += chunk;
            const pos = this.buffer.indexOf(objectName, startPos);
            if (pos === -1) {
                return Promise.resolve();
            }
            chunk = this.buffer.slice(pos + objectName.length);
            this.state = "ReadingEvents" /* State.ReadingEvents */;
        }
        if (this.state !== "ReadingEvents" /* State.ReadingEvents */) {
            return Promise.resolve();
        }
        // This is where we actually do the loading of events from JSON: the JSON
        // Tokenizer writes the JSON to a buffer, and then as a callback the
        // writeBalancedJSON method below is invoked. It then parses this chunk
        // of JSON as a set of events, and adds them to the TracingModel via
        // addEvents()
        if (this.jsonTokenizer.write(chunk)) {
            return Promise.resolve();
        }
        this.state = "SkippingTail" /* State.SkippingTail */;
        if (this.firstChunk) {
            this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineInputWrongJson));
        }
        return Promise.resolve();
    }
    writeBalancedJSON(data) {
        let json = data + ']';
        if (!this.firstChunk) {
            const commaIndex = json.indexOf(',');
            if (commaIndex !== -1) {
                json = json.slice(commaIndex + 1);
            }
            json = '[' + json;
        }
        let items;
        try {
            items = JSON.parse(json);
        }
        catch (e) {
            this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineDataS, { PH1: e.toString() }));
            return;
        }
        if (this.firstChunk) {
            this.firstChunk = false;
            if (this.looksLikeAppVersion(items[0])) {
                this.reportErrorAndCancelLoading(i18nString(UIStrings.legacyTimelineFormatIsNot));
                return;
            }
        }
        try {
            this.tracingModel.addEvents(items);
            this.#collectEvents(items);
        }
        catch (e) {
            this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineDataS, { PH1: e.toString() }));
        }
    }
    reportErrorAndCancelLoading(message) {
        if (message) {
            Common.Console.Console.instance().error(message);
        }
        void this.cancel();
    }
    looksLikeAppVersion(item) {
        return typeof item === 'string' && item.indexOf('Chrome') !== -1;
    }
    async close() {
        if (!this.client) {
            return;
        }
        await this.client.processingStarted();
        await this.finalizeTrace();
    }
    isCpuProfile() {
        return this.state === "LoadingCPUProfileFromFile" /* State.LoadingCPUProfileFromFile */ || this.state === "LoadingCPUProfileFromRecording" /* State.LoadingCPUProfileFromRecording */;
    }
    async finalizeTrace() {
        if (this.state === "LoadingCPUProfileFromFile" /* State.LoadingCPUProfileFromFile */) {
            this.parseCPUProfileFormat(this.buffer);
            this.buffer = '';
        }
        this.tracingModel.tracingComplete();
        await this.client
            .loadingComplete(this.#collectedEvents, this.tracingModel, this.filter, this.isCpuProfile(), /* recordingStartTime=*/ null);
        this.#traceFinalizedCallbackForTest?.();
    }
    traceFinalizedForTest() {
        return this.#traceFinalizedPromiseForTest;
    }
    parseCPUProfileFormat(text) {
        let traceEvents;
        try {
            const profile = JSON.parse(text);
            traceEvents = TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.createFakeTraceFromCpuProfile(profile, /* tid */ 1, /* injectPageEvent */ true);
        }
        catch (e) {
            this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedCpuProfileFormat));
            return;
        }
        this.filter = TimelineLoader.getCpuProfileFilter();
        this.tracingModel.addEvents(traceEvents);
        this.#collectEvents(traceEvents);
    }
    #collectEvents(events) {
        // Once the old engine is removed, this can be updated to use the types from the new engine and avoid the `as unknown`.
        this.#collectedEvents =
            this.#collectedEvents.concat(events);
    }
}
export const TransferChunkLengthBytes = 5000000;
//# sourceMappingURL=TimelineLoader.js.map