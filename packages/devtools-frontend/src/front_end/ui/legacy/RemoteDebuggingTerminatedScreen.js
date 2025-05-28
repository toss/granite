// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';
import { Dialog } from './Dialog.js';
import remoteDebuggingTerminatedScreenStyles from './remoteDebuggingTerminatedScreen.css.js';
import { createTextButton } from './UIUtils.js';
import { VBox } from './Widget.js';
const UIStrings = {
    /**
     * @description Title of a dialog box that appears when remote debugging has been terminated.
     */
    title: 'DevTools is disconnected',
    /**
     * @description Text in a dialog box in DevTools stating why remote debugging has been terminated.
     * "Remote debugging" here means that DevTools on a PC is inspecting a website running on an actual mobile device
     * (see https://developer.chrome.com/docs/devtools/remote-debugging/).
     */
    debuggingConnectionWasClosed: 'Debugging connection was closed. Reason: ',
    /**
     * @description Text in a dialog box showing how to reconnect to DevTools when remote debugging has been terminated.
     * "Remote debugging" here means that DevTools on a PC is inspecting a website running on an actual mobile device
     * (see https://developer.chrome.com/docs/devtools/remote-debugging/).
     * "Reconnect when ready", refers to the state of the mobile device. The developer first has to put the mobile
     * device back in a state where it can be inspected, before DevTools can reconnect to it.
     */
    reconnectWhenReadyByReopening: 'Reconnect when ready (will reload DevTools)',
    /**
     * @description Text on a button to reconnect Devtools when remote debugging terminated.
     * "Remote debugging" here means that DevTools on a PC is inspecting a website running on an actual mobile device
     * (see https://developer.chrome.com/docs/devtools/remote-debugging/).
     */
    reconnectDevtools: 'Reconnect `DevTools`',
    /**
     * @description Text on a button to dismiss the dialog.
     */
    closeDialog: 'Dismiss',
    /**
     * @description Text in a dialog box to explain `DevTools` can still be used while disconnected.
     */
    closeDialogDetail: 'Dismiss this dialog and continue using `DevTools` while disconnected',
    /**
     * @description Text in a dialog box to prompt for feedback if the disconnection is unexpected.
     */
    sendFeedbackMessage: '[FB-only] Please send feedback if this disconnection is unexpected.',
    /**
     * @description Label of the FB-only 'send feedback' button.
     */
    sendFeedback: 'Send feedback',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/RemoteDebuggingTerminatedScreen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { render, html } = LitHtml;
export class RemoteDebuggingTerminatedScreen extends VBox {
    constructor(reason, onClose) {
        super(true);
        this.registerCSSFiles([remoteDebuggingTerminatedScreenStyles]);
        const handleReconnect = () => {
            window.location.reload();
        };
        const feedbackLink = globalThis.FB_ONLY__reactNativeFeedbackLink;
        render(html `
        <h1 class="remote-debugging-terminated-title">${i18nString(UIStrings.title)}</h1>
        <div class="remote-debugging-terminated-message">
          <span>${i18nString(UIStrings.debuggingConnectionWasClosed)}</span>
          <span class="remote-debugging-terminated-reason">${reason}</span>
        </div>
        <div class="remote-debugging-terminated-options">
          <div class="remote-debugging-terminated-label">
            ${i18nString(UIStrings.reconnectWhenReadyByReopening)}
          </div>
          ${createTextButton(i18nString(UIStrings.reconnectDevtools), handleReconnect, { className: 'primary-button', jslogContext: 'reconnect' })}
          <div class="remote-debugging-terminated-label">
            ${i18nString(UIStrings.closeDialogDetail)}
          </div>
          ${createTextButton(i18nString(UIStrings.closeDialog), onClose, {
            jslogContext: 'dismiss',
        })}
        </div>
        ${feedbackLink !== null && feedbackLink !== undefined ? this.#createFeedbackSection(feedbackLink) : null}
      `, this.contentElement, { host: this });
    }
    static show(reason) {
        const dialog = new Dialog('remote-debnugging-terminated');
        dialog.setSizeBehavior("MeasureContent" /* SizeBehavior.MeasureContent */);
        dialog.setDimmed(true);
        new RemoteDebuggingTerminatedScreen(reason, () => dialog.hide()).show(dialog.contentElement);
        dialog.show();
        Host.rnPerfMetrics.remoteDebuggingTerminated(reason);
    }
    #createFeedbackSection(feedbackLink) {
        const handleSendFeedback = () => {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(feedbackLink);
        };
        return html `
      <div class="remote-debugging-terminated-feedback-container">
        <div class="remote-debugging-terminated-feedback-label">${i18nString(UIStrings.sendFeedbackMessage)}</div>
        ${createTextButton(i18nString(UIStrings.sendFeedback), handleSendFeedback, { jslogContext: 'sendFeedback' })}
      </div>
    `;
    }
}
//# sourceMappingURL=RemoteDebuggingTerminatedScreen.js.map