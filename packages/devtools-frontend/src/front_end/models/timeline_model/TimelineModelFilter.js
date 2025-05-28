// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as TraceEngine from '../../models/trace/trace.js';
import { RecordType, TimelineModelImpl } from './TimelineModel.js';
export class TimelineModelFilter {
}
export class TimelineVisibleEventsFilter extends TimelineModelFilter {
    visibleTypes;
    constructor(visibleTypes) {
        super();
        this.visibleTypes = new Set(visibleTypes);
    }
    accept(event) {
        return this.visibleTypes.has(TimelineVisibleEventsFilter.eventType(event));
    }
    static eventType(event) {
        if (TraceEngine.Legacy.eventHasCategory(event, TimelineModelImpl.Category.Console)) {
            return RecordType.ConsoleTime;
        }
        if (TraceEngine.Legacy.eventHasCategory(event, TimelineModelImpl.Category.UserTiming)) {
            return RecordType.UserTiming;
        }
        if (TraceEngine.Legacy.eventIsFromNewEngine(event) && TraceEngine.Types.TraceEvents.isProfileCall(event)) {
            // ProfileCalls from the new engine are broadly equivalent to JSFrames in
            // the old engine, so map them as such, as we do not have a RecordType to
            // represent ProfileCalls.
            return RecordType.JSFrame;
        }
        return event.name;
    }
}
export class TimelineInvisibleEventsFilter extends TimelineModelFilter {
    invisibleTypes;
    constructor(invisibleTypes) {
        super();
        this.invisibleTypes = new Set(invisibleTypes);
    }
    accept(event) {
        return !this.invisibleTypes.has(TimelineVisibleEventsFilter.eventType(event));
    }
}
export class ExclusiveNameFilter extends TimelineModelFilter {
    excludeNames;
    constructor(excludeNames) {
        super();
        this.excludeNames = new Set(excludeNames);
    }
    accept(event) {
        return !this.excludeNames.has(event.name);
    }
}
//# sourceMappingURL=TimelineModelFilter.js.map