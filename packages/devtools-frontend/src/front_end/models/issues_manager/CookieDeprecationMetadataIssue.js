// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import { Issue } from './Issue.js';
const UIStrings = {
    /**
     * @description Label for a link for third-party cookie Issues.
     */
    thirdPartyPhaseoutExplained: 'Prepare for phasing out third-party cookies',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/CookieDeprecationMetadataIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
// TODO(b/305738703): Move this issue into a warning on CookieIssue.
export class CookieDeprecationMetadataIssue extends Issue {
    #issueDetails;
    constructor(issueDetails, issuesModel) {
        super("CookieDeprecationMetadataIssue" /* Protocol.Audits.InspectorIssueCode.CookieDeprecationMetadataIssue */, issuesModel);
        this.#issueDetails = issueDetails;
    }
    getCategory() {
        return "Other" /* IssueCategory.Other */;
    }
    getDescription() {
        return {
            file: 'cookieWarnMetadataGrantRead.md',
            links: [
                {
                    link: 'https://developer.chrome.com/docs/privacy-sandbox/third-party-cookie-phase-out/',
                    linkTitle: i18nString(UIStrings.thirdPartyPhaseoutExplained),
                },
            ],
        };
    }
    details() {
        return this.#issueDetails;
    }
    getKind() {
        return "BreakingChange" /* IssueKind.BreakingChange */;
    }
    primaryKey() {
        return JSON.stringify(this.#issueDetails);
    }
    metadataAllowedSites() {
        if (this.#issueDetails.allowedSites) {
            return this.#issueDetails.allowedSites;
        }
        return [];
    }
    static fromInspectorIssue(issuesModel, inspectorIssue) {
        const details = inspectorIssue.details.cookieDeprecationMetadataIssueDetails;
        if (!details) {
            console.warn('Cookie deprecation metadata issue without details received.');
            return [];
        }
        return [new CookieDeprecationMetadataIssue(details, issuesModel)];
    }
}
//# sourceMappingURL=CookieDeprecationMetadataIssue.js.map