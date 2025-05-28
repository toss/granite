import * as i18n from '../../core/i18n/i18n.js';
import * as TraceEngine from '../../models/trace/trace.js';
import { buildGroupStyle, buildTrackHeader, getFormattedTime } from './AppenderUtils.js';
import { TimelineFlameChartMarker } from './TimelineFlameChartView.js';
const UIStrings = {
    /**
     *@description Text in Timeline Flame Chart Data Provider of the Performance panel
     */
    timings: 'Timings',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimingsTrackAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimingsTrackAppender {
    appenderName = 'Timings';
    #colorGenerator;
    #compatibilityBuilder;
    #traceParsedData;
    constructor(compatibilityBuilder, traceParsedData, colorGenerator) {
        this.#compatibilityBuilder = compatibilityBuilder;
        this.#colorGenerator = colorGenerator;
        this.#traceParsedData = traceParsedData;
    }
    /**
     * Appends into the flame chart data the data corresponding to the
     * timings track.
     * @param trackStartLevel the horizontal level of the flame chart events where
     * the track's events will start being appended.
     * @param expanded wether the track should be rendered expanded.
     * @returns the first available level to append more data after having
     * appended the track's events.
     */
    appendTrackAtLevel(trackStartLevel, expanded) {
        const allMarkerEvents = this.#traceParsedData.PageLoadMetrics.allMarkerEvents;
        const performanceMarks = this.#traceParsedData.UserTimings.performanceMarks;
        const performanceMeasures = this.#traceParsedData.UserTimings.performanceMeasures;
        const timestampEvents = this.#traceParsedData.UserTimings.timestampEvents;
        const consoleTimings = this.#traceParsedData.UserTimings.consoleTimings;
        if (allMarkerEvents.length === 0 && performanceMarks.length === 0 && performanceMeasures.length === 0 &&
            timestampEvents.length === 0 && consoleTimings.length === 0) {
            return trackStartLevel;
        }
        this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
        let newLevel = this.#appendMarkersAtLevel(trackStartLevel);
        newLevel = this.#compatibilityBuilder.appendEventsAtLevel(performanceMarks, newLevel, this);
        newLevel = this.#compatibilityBuilder.appendEventsAtLevel(performanceMeasures, newLevel, this);
        newLevel = this.#compatibilityBuilder.appendEventsAtLevel(timestampEvents, newLevel, this);
        return this.#compatibilityBuilder.appendEventsAtLevel(consoleTimings, newLevel, this);
    }
    /**
     * Adds into the flame chart data the header corresponding to the
     * timings track. A header is added in the shape of a group in the
     * flame chart data. A group has a predefined style and a reference
     * to the definition of the legacy track (which should be removed
     * in the future).
     * @param currentLevel the flame chart level at which the header is
     * appended.
     */
    #appendTrackHeaderAtLevel(currentLevel, expanded) {
        const trackIsCollapsible = this.#traceParsedData.UserTimings.performanceMeasures.length > 0;
        const style = buildGroupStyle({ shareHeaderLine: true, useFirstLineForOverview: true, collapsible: trackIsCollapsible });
        const group = buildTrackHeader(currentLevel, i18nString(UIStrings.timings), style, /* selectable= */ true, expanded);
        this.#compatibilityBuilder.registerTrackForGroup(group, this);
    }
    /**
     * Adds into the flame chart data the trace events corresponding
     * to page load markers (LCP, FCP, L, etc.). These are taken straight
     * from the PageLoadMetrics handler.
     * @param currentLevel the flame chart level from which markers will
     * be appended.
     * @returns the next level after the last occupied by the appended
     * page load markers (the first available level to append more data).
     */
    #appendMarkersAtLevel(currentLevel) {
        const markers = this.#traceParsedData.PageLoadMetrics.allMarkerEvents;
        markers.forEach(marker => {
            const index = this.#compatibilityBuilder.appendEventAtLevel(marker, currentLevel, this);
            this.#compatibilityBuilder.getFlameChartTimelineData().entryTotalTimes[index] = Number.NaN;
        });
        const minTimeMs = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(this.#traceParsedData.Meta.traceBounds.min);
        const flameChartMarkers = markers.map(marker => {
            const startTimeMs = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(marker.ts);
            return new TimelineFlameChartMarker(startTimeMs, startTimeMs - minTimeMs, this.markerStyleForEvent(marker));
        });
        this.#compatibilityBuilder.getFlameChartTimelineData().markers.push(...flameChartMarkers);
        return ++currentLevel;
    }
    /*
      ------------------------------------------------------------------------------------
       The following methods  are invoked by the flame chart renderer to query features about
       events on rendering.
      ------------------------------------------------------------------------------------
    */
    /**
     * Gets the style for a page load marker event.
     */
    markerStyleForEvent(markerEvent) {
        const tallMarkerDashStyle = [6, 4];
        let title = '';
        let color = 'grey';
        if (TraceEngine.Types.TraceEvents.isTraceEventMarkDOMContent(markerEvent)) {
            color = '#0867CB';
            title = "DCL" /* TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.MetricName.DCL */;
        }
        if (TraceEngine.Types.TraceEvents.isTraceEventMarkLoad(markerEvent)) {
            color = '#B31412';
            title = "L" /* TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.MetricName.L */;
        }
        if (TraceEngine.Types.TraceEvents.isTraceEventFirstPaint(markerEvent)) {
            color = '#228847';
            title = "FP" /* TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FP */;
        }
        if (TraceEngine.Types.TraceEvents.isTraceEventFirstContentfulPaint(markerEvent)) {
            color = '#1A6937';
            title = "FCP" /* TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP */;
        }
        if (TraceEngine.Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(markerEvent)) {
            color = '#1A3422';
            title = "LCP" /* TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP */;
        }
        if (TraceEngine.Types.TraceEvents.isTraceEventNavigationStart(markerEvent)) {
            color = '#FF9800';
            title = '';
        }
        return {
            title: title,
            dashStyle: tallMarkerDashStyle,
            lineWidth: 0.5,
            color: color,
            tall: true,
            lowPriority: false,
        };
    }
    /**
     * Gets the color an event added by this appender should be rendered with.
     */
    colorForEvent(event) {
        if (TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.eventIsPageLoadEvent(event)) {
            return this.markerStyleForEvent(event).color;
        }
        // Performance and console timings.
        return this.#colorGenerator.colorForID(event.name);
    }
    /**
     * Gets the title an event added by this appender should be rendered with.
     */
    titleForEvent(event) {
        const metricsHandler = TraceEngine.Handlers.ModelHandlers.PageLoadMetrics;
        if (metricsHandler.eventIsPageLoadEvent(event)) {
            switch (event.name) {
                case 'MarkDOMContent':
                    return "DCL" /* metricsHandler.MetricName.DCL */;
                case 'MarkLoad':
                    return "L" /* metricsHandler.MetricName.L */;
                case 'firstContentfulPaint':
                    return "FCP" /* metricsHandler.MetricName.FCP */;
                case 'firstPaint':
                    return "FP" /* metricsHandler.MetricName.FP */;
                case 'largestContentfulPaint::Candidate':
                    return "LCP" /* metricsHandler.MetricName.LCP */;
                case 'navigationStart':
                    return '';
                default:
                    return event.name;
            }
        }
        if (TraceEngine.Types.TraceEvents.isTraceEventTimeStamp(event)) {
            return `${event.name}: ${event.args.data.message}`;
        }
        if (TraceEngine.Types.TraceEvents.isTraceEventPerformanceMark(event)) {
            return `[mark]: ${event.name}`;
        }
        return event.name;
    }
    /**
     * Returns the info shown when an event added by this appender
     * is hovered in the timeline.
     */
    highlightedEntryInfo(event) {
        const title = this.titleForEvent(event);
        // If an event is a marker event, rather than show a duration of 0, we can instead show the time that the event happened, which is much more useful. We do this currently for:
        // Page load events: DCL, FCP and LCP
        // performance.mark() events
        // console.timestamp() events
        if (TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.isTraceEventMarkerEvent(event) ||
            TraceEngine.Types.TraceEvents.isTraceEventPerformanceMark(event) ||
            TraceEngine.Types.TraceEvents.isTraceEventTimeStamp(event)) {
            const timeOfEvent = TraceEngine.Helpers.Timing.timeStampForEventAdjustedByClosestNavigation(event, this.#traceParsedData.Meta.traceBounds, this.#traceParsedData.Meta.navigationsByNavigationId, this.#traceParsedData.Meta.navigationsByFrameId);
            return { title, formattedTime: getFormattedTime(timeOfEvent) };
        }
        return { title, formattedTime: getFormattedTime(event.dur) };
    }
}
//# sourceMappingURL=TimingsTrackAppender.js.map