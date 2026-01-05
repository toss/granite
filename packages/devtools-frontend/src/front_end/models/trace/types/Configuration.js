// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export const DEFAULT = {
    settings: {},
    experiments: {
        timelineV8RuntimeCallStats: false,
        timelineShowAllEvents: false,
    },
    processing: {
        eventsPerChunk: 15_000,
        pauseDuration: 1,
    },
};
/**
 * Generates a key that can be used to represent this config in a cache. This is
 * used mainly in tests, where we want to avoid re-parsing a file if we have
 * already processed it with the same configuration. This cache key purposefully
 * does not include all settings in the configuration; the processing settings
 * do not impact the actual resulting data. Only new flags in the config that
 * alter parsing should be added to this cache key.
 */
export function configToCacheKey(config) {
    return [
        `experiments.timelineShowAllEvents:${config.experiments.timelineShowAllEvents}`,
        `experiments.timelineV8RuntimeCallStats:${config.experiments.timelineV8RuntimeCallStats}`,
    ].join('-');
}
//# sourceMappingURL=Configuration.js.map