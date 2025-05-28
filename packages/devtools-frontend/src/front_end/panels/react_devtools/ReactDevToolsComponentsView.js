// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import { ReactDevToolsViewBase } from './ReactDevToolsViewBase.js';
const UIStrings = {
    /**
     *@description Title of the React DevTools view
     */
    title: '⚛️ Components (React DevTools)',
};
const str_ = i18n.i18n.registerUIStrings('panels/react_devtools/ReactDevToolsComponentsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ReactDevToolsComponentsViewImpl extends ReactDevToolsViewBase {
    constructor() {
        super('components', i18nString(UIStrings.title));
    }
}
//# sourceMappingURL=ReactDevToolsComponentsView.js.map