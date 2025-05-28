// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// This is what was SDK.TracingModel moved into models/trace to avoid circular dependency issues. Our ultimate goal is to remove this model entirely once the migration to the new model is done
import * as Common from '../../core/common/common.js';
import * as Helpers from './helpers/helpers.js';
import * as Types from './types/types.js';
export class TracingModel {
    #title;
    #processById;
    #processByName;
    #minimumRecordTimeInternal;
    #maximumRecordTimeInternal;
    #devToolsMetadataEventsInternal;
    #asyncEvents;
    #openAsyncEvents;
    #openNestableAsyncEvents;
    #profileGroups;
    #parsedCategories;
    #allEventsPayload = [];
    constructor(title) {
        this.#title = title;
        this.#processById = new Map();
        this.#processByName = new Map();
        this.#minimumRecordTimeInternal = Number(Infinity);
        this.#maximumRecordTimeInternal = Number(-Infinity);
        this.#devToolsMetadataEventsInternal = [];
        this.#asyncEvents = [];
        this.#openAsyncEvents = new Map();
        this.#openNestableAsyncEvents = new Map();
        this.#profileGroups = new Map();
        this.#parsedCategories = new Map();
    }
    static isTopLevelEvent(event) {
        return eventHasCategory(event, DevToolsTimelineEventCategory) && event.name === 'RunTask' ||
            eventHasCategory(event, LegacyTopLevelEventCategory) ||
            eventHasCategory(event, DevToolsMetadataEventCategory) &&
                event.name === 'Program'; // Older timelines may have this instead of toplevel.
    }
    static extractId(payload) {
        const scope = payload.scope || '';
        if (typeof payload.id2 === 'undefined') {
            return scope && payload.id ? `${scope}@${payload.id}` : payload.id;
        }
        const id2 = payload.id2;
        if (typeof id2 === 'object' && ('global' in id2) !== ('local' in id2)) {
            return typeof id2['global'] !== 'undefined' ? `:${scope}:${id2['global']}` :
                `:${scope}:${payload.pid}:${id2['local']}`;
        }
        console.error(`Unexpected id2 field at ${payload.ts / 1000}, one and only one of 'local' and 'global' should be present.`);
        return undefined;
    }
    static browserMainThread(tracingModel) {
        const processes = tracingModel.sortedProcesses();
        // Avoid warning for an empty #model.
        if (!processes.length) {
            return null;
        }
        const browserMainThreadName = 'CrBrowserMain';
        const browserProcesses = [];
        const browserMainThreads = [];
        for (const process of processes) {
            if (process.name().toLowerCase().endsWith('browser')) {
                browserProcesses.push(process);
            }
            browserMainThreads.push(...process.sortedThreads().filter(t => t.name() === browserMainThreadName));
        }
        if (browserMainThreads.length === 1) {
            return browserMainThreads[0];
        }
        if (browserProcesses.length === 1) {
            return browserProcesses[0].threadByName(browserMainThreadName);
        }
        const tracingStartedInBrowser = tracingModel.devToolsMetadataEvents().filter(e => e.name === 'TracingStartedInBrowser');
        if (tracingStartedInBrowser.length === 1) {
            return tracingStartedInBrowser[0].thread;
        }
        Common.Console.Console.instance().error('Failed to find browser main thread in trace, some timeline features may be unavailable');
        return null;
    }
    allRawEvents() {
        return this.#allEventsPayload;
    }
    devToolsMetadataEvents() {
        return this.#devToolsMetadataEventsInternal;
    }
    addEvents(events) {
        for (let i = 0; i < events.length; ++i) {
            this.addEvent(events[i]);
        }
    }
    tracingComplete() {
        this.processPendingAsyncEvents();
        for (const process of this.#processById.values()) {
            for (const thread of process.threads.values()) {
                thread.tracingComplete();
            }
        }
    }
    addEvent(payload) {
        this.#allEventsPayload.push(payload);
        let process = this.#processById.get(payload.pid);
        if (!process) {
            process = new Process(this, payload.pid);
            this.#processById.set(payload.pid, process);
        }
        const timestamp = payload.ts / 1000;
        // We do allow records for unrelated threads to arrive out-of-order,
        // so there's a chance we're getting records from the past.
        if (timestamp && timestamp < this.#minimumRecordTimeInternal &&
            eventPhasesOfInterestForTraceBounds.has(payload.ph) &&
            // UMA related events are ignored when calculating the minimumRecordTime because they might
            // be related to previous navigations that happened before the current trace started and
            // will currently not be displayed anyways.
            // See crbug.com/1201198
            (!payload.name.endsWith('::UMA'))) {
            this.#minimumRecordTimeInternal = timestamp;
        }
        if (payload.name === 'TracingStartedInBrowser') {
            // If we received a timestamp for tracing start, use that for minimumRecordTime.
            this.#minimumRecordTimeInternal = timestamp;
        }
        if (eventPhasesOfInterestForTraceBounds.has(payload.ph)) {
            const endTimeStamp = (payload.ts + (payload.dur || 0)) / 1000;
            this.#maximumRecordTimeInternal = Math.max(this.#maximumRecordTimeInternal, endTimeStamp);
        }
        const event = process.addEvent(payload);
        if (!event) {
            return;
        }
        if (payload.ph === "P" /* Types.TraceEvents.Phase.SAMPLE */) {
            this.addSampleEvent(event);
            return;
        }
        // Build async event when we've got events from all threads & processes, so we can sort them and process in the
        // chronological order. However, also add individual async events to the thread flow (above), so we can easily
        // display them on the same chart as other events, should we choose so.
        if (Types.TraceEvents.isAsyncPhase(payload.ph)) {
            this.#asyncEvents.push(event);
        }
        if (event.hasCategory(DevToolsMetadataEventCategory)) {
            this.#devToolsMetadataEventsInternal.push(event);
        }
        if (payload.ph !== "M" /* Types.TraceEvents.Phase.METADATA */) {
            return;
        }
        switch (payload.name) {
            case MetadataEvent.ProcessSortIndex: {
                process.setSortIndex(payload.args['sort_index']);
                break;
            }
            case MetadataEvent.ProcessName: {
                const processName = payload.args['name'];
                process.setName(processName);
                this.#processByName.set(processName, process);
                break;
            }
            case MetadataEvent.ThreadSortIndex: {
                process.threadById(payload.tid).setSortIndex(payload.args['sort_index']);
                break;
            }
            case MetadataEvent.ThreadName: {
                process.threadById(payload.tid).setName(payload.args['name']);
                break;
            }
        }
    }
    addSampleEvent(event) {
        const id = `${event.thread.process().id()}:${event.id}`;
        const group = this.#profileGroups.get(id);
        if (group) {
            group.addChild(event);
        }
        else {
            this.#profileGroups.set(id, new ProfileEventsGroup(event));
        }
    }
    profileGroup(event) {
        return this.#profileGroups.get(`${event.thread.process().id()}:${event.id}`) || null;
    }
    minimumRecordTime() {
        return this.#minimumRecordTimeInternal;
    }
    maximumRecordTime() {
        return this.#maximumRecordTimeInternal;
    }
    sortedProcesses() {
        return NamedObject.sort([...this.#processById.values()]);
    }
    getProcessByName(name) {
        return this.#processByName.get(name) ?? null;
    }
    getProcessById(pid) {
        return this.#processById.get(pid) || null;
    }
    getThreadByName(processName, threadName) {
        const process = this.getProcessByName(processName);
        return process && process.threadByName(threadName);
    }
    processPendingAsyncEvents() {
        this.#asyncEvents.sort(Event.compareStartTime);
        for (let i = 0; i < this.#asyncEvents.length; ++i) {
            const event = this.#asyncEvents[i];
            if (Types.TraceEvents.isNestableAsyncPhase(event.phase)) {
                this.addNestableAsyncEvent(event);
            }
            else {
                this.addAsyncEvent(event);
            }
        }
        this.#asyncEvents = [];
        this.closeOpenAsyncEvents();
    }
    closeOpenAsyncEvents() {
        for (const event of this.#openAsyncEvents.values()) {
            event.setEndTime(this.#maximumRecordTimeInternal);
            // FIXME: remove this once we figure a better way to convert async console
            // events to sync [waterfall] timeline records.
            event.steps[0].setEndTime(this.#maximumRecordTimeInternal);
        }
        this.#openAsyncEvents.clear();
        for (const eventStack of this.#openNestableAsyncEvents.values()) {
            while (eventStack.length) {
                const event = eventStack.pop();
                if (!event) {
                    continue;
                }
                event.setEndTime(this.#maximumRecordTimeInternal);
            }
        }
        this.#openNestableAsyncEvents.clear();
    }
    addNestableAsyncEvent(event) {
        const key = event.categoriesString + '.' + event.id;
        let openEventsStack = this.#openNestableAsyncEvents.get(key);
        switch (event.phase) {
            case "b" /* Types.TraceEvents.Phase.ASYNC_NESTABLE_START */: {
                if (!openEventsStack) {
                    openEventsStack = [];
                    this.#openNestableAsyncEvents.set(key, openEventsStack);
                }
                const asyncEvent = new AsyncEvent(event);
                openEventsStack.push(asyncEvent);
                event.thread.addAsyncEvent(asyncEvent);
                break;
            }
            case "n" /* Types.TraceEvents.Phase.ASYNC_NESTABLE_INSTANT */: {
                if (openEventsStack && openEventsStack.length) {
                    const event = openEventsStack[openEventsStack.length - 1];
                    if (event) {
                        event.addStep(event);
                    }
                }
                break;
            }
            case "e" /* Types.TraceEvents.Phase.ASYNC_NESTABLE_END */: {
                if (!openEventsStack || !openEventsStack.length) {
                    break;
                }
                const top = openEventsStack.pop();
                if (!top) {
                    break;
                }
                if (top.name !== event.name) {
                    console.error(`Begin/end event mismatch for nestable async event, ${top.name} vs. ${event.name}, key: ${key}`);
                    break;
                }
                top.addStep(event);
            }
        }
    }
    addAsyncEvent(event) {
        const key = event.categoriesString + '.' + event.name + '.' + event.id;
        let asyncEvent = this.#openAsyncEvents.get(key);
        if (event.phase === "S" /* Types.TraceEvents.Phase.ASYNC_BEGIN */) {
            if (asyncEvent) {
                console.error(`Event ${event.name} has already been started`);
                return;
            }
            asyncEvent = new AsyncEvent(event);
            this.#openAsyncEvents.set(key, asyncEvent);
            event.thread.addAsyncEvent(asyncEvent);
            return;
        }
        if (!asyncEvent) {
            // Quietly ignore stray async events, we're probably too late for the start.
            return;
        }
        if (event.phase === "F" /* Types.TraceEvents.Phase.ASYNC_END */) {
            asyncEvent.addStep(event);
            this.#openAsyncEvents.delete(key);
            return;
        }
        if (event.phase === "T" /* Types.TraceEvents.Phase.ASYNC_STEP_INTO */ ||
            event.phase === "p" /* Types.TraceEvents.Phase.ASYNC_STEP_PAST */) {
            const lastStep = asyncEvent.steps[asyncEvent.steps.length - 1];
            if (lastStep && lastStep.phase !== "S" /* Types.TraceEvents.Phase.ASYNC_BEGIN */ && lastStep.phase !== event.phase) {
                console.assert(false, 'Async event step phase mismatch: ' + lastStep.phase + ' at ' + lastStep.startTime + ' vs. ' + event.phase +
                    ' at ' + event.startTime);
                return;
            }
            asyncEvent.addStep(event);
            return;
        }
        console.assert(false, 'Invalid async event phase');
    }
    title() {
        return this.#title;
    }
    parsedCategoriesForString(str) {
        let parsedCategories = this.#parsedCategories.get(str);
        if (!parsedCategories) {
            parsedCategories = new Set(str ? str.split(',') : []);
            this.#parsedCategories.set(str, parsedCategories);
        }
        return parsedCategories;
    }
}
export const eventPhasesOfInterestForTraceBounds = new Set([
    "B" /* Types.TraceEvents.Phase.BEGIN */,
    "E" /* Types.TraceEvents.Phase.END */,
    "X" /* Types.TraceEvents.Phase.COMPLETE */,
    "I" /* Types.TraceEvents.Phase.INSTANT */,
]);
export const MetadataEvent = {
    ProcessSortIndex: 'process_sort_index',
    ProcessName: 'process_name',
    ThreadSortIndex: 'thread_sort_index',
    ThreadName: 'thread_name',
};
// TODO(alph): LegacyTopLevelEventCategory is not recorded since M74 and used for loading
// legacy profiles. Drop at some point.
export const LegacyTopLevelEventCategory = 'toplevel';
export const DevToolsMetadataEventCategory = 'disabled-by-default-devtools.timeline';
export const DevToolsTimelineEventCategory = 'disabled-by-default-devtools.timeline';
export function eventHasPayload(event) {
    return 'rawPayload' in event;
}
export class Event {
    categoriesString;
    #parsedCategories;
    name;
    phase;
    startTime;
    thread;
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args;
    id;
    ordinal;
    selfTime;
    endTime;
    duration;
    // The constructor is protected so that we ensure that only classes or
    // subclasses can directly instantiate events. All other callers should
    // either create ConstructedEvent instances, which have a public constructor,
    // or use the static fromPayload method which can create an event instance
    // from the trace payload.
    constructor(categories, name, phase, startTime, thread) {
        this.categoriesString = categories || '';
        this.#parsedCategories = thread.getModel().parsedCategoriesForString(this.categoriesString);
        this.name = name;
        this.phase = phase;
        this.startTime = startTime;
        this.thread = thread;
        this.args = {};
        this.ordinal = 0;
        this.selfTime = 0;
    }
    static compareStartTime(a, b) {
        if (!a || !b) {
            return 0;
        }
        return a.startTime - b.startTime;
    }
    static orderedCompareStartTime(a, b) {
        // Array.mergeOrdered coalesces objects if comparator returns 0.
        // To change this behavior this comparator return -1 in the case events
        // startTime's are equal, so both events got placed into the result array.
        return a.startTime - b.startTime || a.ordinal - b.ordinal || -1;
    }
    hasCategory(categoryName) {
        return this.#parsedCategories.has(categoryName);
    }
    setEndTime(endTime) {
        if (endTime < this.startTime) {
            console.assert(false, 'Event out of order: ' + this.name);
            return;
        }
        this.endTime = endTime;
        this.duration = endTime - this.startTime;
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addArgs(args) {
        // Shallow copy args to avoid modifying original #payload which may be saved to file.
        for (const name in args) {
            if (name in this.args) {
                console.error('Same argument name (' + name + ') is used for begin and end phases of ' + this.name);
            }
            this.args[name] = args[name];
        }
    }
    complete(endEvent) {
        if (endEvent.args) {
            this.addArgs(endEvent.args);
        }
        else {
            console.error('Missing mandatory event argument \'args\' at ' + endEvent.startTime);
        }
        this.setEndTime(endEvent.startTime);
    }
}
/**
 * Represents a tracing event that is not directly linked to an individual
 * object in the trace. We construct these events at times, particularly when
 * building up the CPU profile data for JS Profiling.
 **/
export class ConstructedEvent extends Event {
    // Because the constructor of Event is marked as protected, but we want
    // people to be able to create constructed events, we override the
    // constructor here, even though we are only calling super, in order to mark
    // it as public.
    constructor(categories, name, phase, startTime, thread) {
        super(categories, name, phase, startTime, thread);
    }
}
/**
 * Represents a tracing event that has been created directly from an object in
 * the trace file and therefore is guaranteed to have a payload associated with
 * it. The only way to create these events is to use the static fromPayload
 * method, which you must call with a payload.
 **/
export class PayloadEvent extends Event {
    #rawPayload;
    /**
     * Returns the raw payload that was used to create this event instance.
     **/
    rawLegacyPayload() {
        return this.#rawPayload;
    }
    /**
     * Returns the raw payload that was used to create this event instance, but
     * returns it typed as the new engine's TraceEventArgs option.
     **/
    rawPayload() {
        return this.#rawPayload;
    }
    constructor(categories, name, phase, startTime, thread, rawPayload) {
        super(categories, name, phase, startTime, thread);
        this.#rawPayload = rawPayload;
    }
    static fromPayload(payload, thread) {
        const event = new PayloadEvent(payload.cat, payload.name, payload.ph, payload.ts / 1000, thread, payload);
        event.#rawPayload = payload;
        if (payload.args) {
            event.addArgs(payload.args);
        }
        if (typeof payload.dur === 'number') {
            event.setEndTime((payload.ts + payload.dur) / 1000);
        }
        const id = TracingModel.extractId(payload);
        if (typeof id !== 'undefined') {
            event.id = id;
        }
        return event;
    }
}
export class ObjectSnapshot extends PayloadEvent {
    constructor(category, name, startTime, thread, rawPayload) {
        super(category, name, "O" /* Types.TraceEvents.Phase.OBJECT_SNAPSHOT */, startTime, thread, rawPayload);
    }
    static fromPayload(payload, thread) {
        const snapshot = new ObjectSnapshot(payload.cat, payload.name, payload.ts / 1000, thread, payload);
        const id = TracingModel.extractId(payload);
        if (typeof id !== 'undefined') {
            snapshot.id = id;
        }
        if (!payload.args || !payload.args['snapshot']) {
            console.error('Missing mandatory \'snapshot\' argument at ' + payload.ts / 1000);
            return snapshot;
        }
        if (payload.args) {
            snapshot.addArgs(payload.args);
        }
        return snapshot;
    }
    getSnapshot() {
        const snapshot = this.args['snapshot'];
        if (!snapshot) {
            throw new Error('ObjectSnapshot has no snapshot argument.');
        }
        return snapshot;
    }
}
export class AsyncEvent extends ConstructedEvent {
    steps;
    causedFrame;
    constructor(startEvent) {
        super(startEvent.categoriesString, startEvent.name, startEvent.phase, startEvent.startTime, startEvent.thread);
        this.addArgs(startEvent.args);
        this.steps = [startEvent];
        this.causedFrame = false;
    }
    addStep(event) {
        this.steps.push(event);
        if (event.phase === "F" /* Types.TraceEvents.Phase.ASYNC_END */ ||
            event.phase === "e" /* Types.TraceEvents.Phase.ASYNC_NESTABLE_END */) {
            this.setEndTime(event.startTime);
            // FIXME: ideally, we shouldn't do this, but this makes the logic of converting
            // async console events to sync ones much simpler.
            this.steps[0].setEndTime(event.startTime);
        }
    }
}
class ProfileEventsGroup {
    children;
    constructor(event) {
        this.children = [event];
    }
    addChild(event) {
        this.children.push(event);
    }
}
class NamedObject {
    model;
    idInternal;
    #nameInternal;
    #sortIndex;
    constructor(model, id) {
        this.model = model;
        this.idInternal = id;
        this.#nameInternal = '';
        this.#sortIndex = 0;
    }
    static sort(array) {
        return array.sort((a, b) => {
            return a.#sortIndex !== b.#sortIndex ? a.#sortIndex - b.#sortIndex : a.name().localeCompare(b.name());
        });
    }
    setName(name) {
        this.#nameInternal = name;
    }
    name() {
        return this.#nameInternal;
    }
    id() {
        return this.idInternal;
    }
    setSortIndex(sortIndex) {
        this.#sortIndex = sortIndex;
    }
    getModel() {
        return this.model;
    }
}
export class Process extends NamedObject {
    threads;
    #threadByNameInternal;
    constructor(model, id) {
        super(model, id);
        this.threads = new Map();
        this.#threadByNameInternal = new Map();
    }
    threadById(id) {
        let thread = this.threads.get(id);
        if (!thread) {
            thread = new Thread(this, id);
            this.threads.set(id, thread);
        }
        return thread;
    }
    threadByName(name) {
        return this.#threadByNameInternal.get(name) || null;
    }
    setThreadByName(name, thread) {
        this.#threadByNameInternal.set(name, thread);
    }
    addEvent(payload) {
        return this.threadById(payload.tid).addEvent(payload);
    }
    sortedThreads() {
        return NamedObject.sort([...this.threads.values()]);
    }
}
export class Thread extends NamedObject {
    #processInternal;
    #eventsInternal;
    #asyncEventsInternal;
    #lastTopLevelEvent;
    constructor(process, id) {
        super(process.getModel(), id);
        this.#processInternal = process;
        this.#eventsInternal = [];
        this.#asyncEventsInternal = [];
        this.#lastTopLevelEvent = null;
    }
    /**
     * Whilst we are in the middle of migrating to the new Phase enum, we need to
     * be able to compare events with the legacy phase to the new enum. This method
     * does this by casting the event phase to a string, ensuring we can compare it
     * against either enum. Once the migration is complete (crbug.com/1417587), we
     * will be able to use === to compare with no TS errors and this method can be
     * removed.
     */
    #eventMatchesPhase(event, phase) {
        return event.phase === phase;
    }
    tracingComplete() {
        this.#asyncEventsInternal.sort(Event.compareStartTime);
        this.#eventsInternal.sort(Event.compareStartTime);
        const stack = [];
        const toDelete = new Set();
        for (let i = 0; i < this.#eventsInternal.length; ++i) {
            const e = this.#eventsInternal[i];
            e.ordinal = i;
            if (this.#eventMatchesPhase(e, "E" /* Types.TraceEvents.Phase.END */)) {
                toDelete.add(i); // Mark for removal.
                // Quietly ignore unbalanced close events, they're legit (we could have missed start one).
                if (!stack.length) {
                    continue;
                }
                const top = stack.pop();
                if (!top) {
                    continue;
                }
                if (top.name !== e.name || top.categoriesString !== e.categoriesString) {
                    console.error('B/E events mismatch at ' + top.startTime + ' (' + top.name + ') vs. ' + e.startTime + ' (' + e.name +
                        ')');
                }
                else {
                    top.complete(e);
                }
            }
            else if (this.#eventMatchesPhase(e, "B" /* Types.TraceEvents.Phase.BEGIN */)) {
                stack.push(e);
            }
        }
        // Handle Begin events with no matching End.
        // This commonly happens due to a bug in the trace machinery. See crbug.com/982252
        while (stack.length) {
            const event = stack.pop();
            if (event) {
                // Masquerade the event as Instant, so it's rendered to the user.
                // The ideal fix is resolving crbug.com/1021571, but handling that without a perfetto migration appears prohibitive
                event.phase = "I" /* Types.TraceEvents.Phase.INSTANT */;
            }
        }
        this.#eventsInternal = this.#eventsInternal.filter((_, idx) => !toDelete.has(idx));
    }
    addEvent(payload) {
        const event = payload.ph === "O" /* Types.TraceEvents.Phase.OBJECT_SNAPSHOT */ ? ObjectSnapshot.fromPayload(payload, this) :
            PayloadEvent.fromPayload(payload, this);
        if (TracingModel.isTopLevelEvent(event)) {
            // Discard nested "top-level" events.
            const lastTopLevelEvent = this.#lastTopLevelEvent;
            if (lastTopLevelEvent && (lastTopLevelEvent.endTime || 0) > event.startTime) {
                return null;
            }
            this.#lastTopLevelEvent = event;
        }
        this.#eventsInternal.push(event);
        return event;
    }
    addAsyncEvent(asyncEvent) {
        this.#asyncEventsInternal.push(asyncEvent);
    }
    setName(name) {
        super.setName(name);
        this.#processInternal.setThreadByName(name, this);
    }
    process() {
        return this.#processInternal;
    }
    events() {
        return this.#eventsInternal;
    }
    asyncEvents() {
        return this.#asyncEventsInternal;
    }
    removeEventsByName(name) {
        const extracted = [];
        this.#eventsInternal = this.#eventsInternal.filter(e => {
            if (!e) {
                return false;
            }
            if (e.name !== name) {
                return true;
            }
            extracted.push(e);
            return false;
        });
        return extracted;
    }
}
export function timesForEventInMilliseconds(event) {
    if (event instanceof Event) {
        return {
            startTime: Types.Timing.MilliSeconds(event.startTime),
            endTime: event.endTime ? Types.Timing.MilliSeconds(event.endTime) : undefined,
            duration: Types.Timing.MilliSeconds(event.duration || 0),
            selfTime: Types.Timing.MilliSeconds(event.selfTime),
        };
    }
    return Helpers.Timing.eventTimingsMilliSeconds(event);
}
// Parsed categories are cached to prevent calling cat.split() multiple
// times on the same categories string.
const parsedCategories = new Map();
export function eventHasCategory(event, category) {
    if (event instanceof Event) {
        return event.hasCategory(category);
    }
    let parsedCategoriesForEvent = parsedCategories.get(event.cat);
    if (!parsedCategoriesForEvent) {
        parsedCategoriesForEvent = new Set(event.cat.split(',') || []);
    }
    return parsedCategoriesForEvent.has(category);
}
export function phaseForEvent(event) {
    if (event instanceof Event) {
        return event.phase;
    }
    return event.ph;
}
export function threadIDForEvent(event) {
    if (event instanceof Event) {
        return event.thread.idInternal;
    }
    return event.tid;
}
export function eventIsFromNewEngine(event) {
    return event !== null && !(event instanceof Event);
}
//# sourceMappingURL=LegacyTracingModel.js.map