// Copyright (c) Toss. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from "../../core/i18n/i18n.js";
import * as UI from "../../ui/legacy/legacy.js";
import deviceManagerStyles from "./deviceManager.css.js";
import * as LitHtml from "../../ui/lit-html/lit-html.js";
const UIStrings = {
    /**
     * @description Title of the Device Manager view
     */
    title: "Device Manager",
};
const { render, html } = LitHtml;
const str_ = i18n.i18n.registerUIStrings("panels/device_manager/DeviceManagerView.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class DeviceManagerViewImpl extends UI.View.SimpleView {
    constructor() {
        super(i18nString(UIStrings.title));
    }
    wasShown() {
        super.wasShown();
        this.registerCSSFiles([deviceManagerStyles]);
        this.render();
    }
    render() {
        render(html `
        <div class="device-manager">
          <header>
            <h1>📱 Device Manager</h1>
            <p>A convenient unified device management tool</p>
          </header>
          <main>
            <section>
              <div class="item">
                <span class="icon">❓</span> Check device info
              </div>
              <div class="item">
                <span class="icon">🎨</span> Change theme
              </div>
              <div class="item">
                <span class="icon">♻️</span> Runtime refresh
              </div>
              <div class="item">
                <span class="icon">🔎</span> Adjust font size
              </div>
              <div class="item">
                <span class="icon">✨</span> More features
              </div>
            </section>
          </main>
          <footer>Coming Soon!</footer>
        </div>
      `, this.contentElement, { host: this });
    }
}
//# sourceMappingURL=DeviceManagerView.js.map