// Copyright (c) Toss. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from "../../core/i18n/i18n.js";
import * as UI from "../../ui/legacy/legacy.js";
import * as LitHtml from "../../ui/lit-html/lit-html.js";
import * as ReactDevTools from "../../third_party/react-native-devtools-standalone/react-native-devtools-standalone.js";
import reactNativeDevtoolsStandalone from "./reactNativeDevtoolsStandalone.css.js";
const UIStrings = {
    /**
     * @description Title of the React DevTools view
     */
    title: "React DevTools",
};
const { render, html } = LitHtml;
const str_ = i18n.i18n.registerUIStrings("panels/react_native_devtools_standalone/ReactNativeDevToolsStandaloneView.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ReactNativeDevToolsStandaloneViewImpl extends UI.View.SimpleView {
    setup = false;
    constructor() {
        super(i18nString(UIStrings.title));
    }
    wasShown() {
        super.wasShown();
        this.registerCSSFiles([reactNativeDevtoolsStandalone]);
        this.render();
    }
    render() {
        render(html `
        <div class="loading-view">
          <h1>🙄 Device not connected</h1>
          <p>
            If the application is running, try refreshing the React Native view.
          </p>
        </div>
        <div class="devtools-container">
          <!-- DevTools -->
        </div>
      `, this.contentElement);
        this.setupDevTools();
    }
    setupDevTools() {
        // for setup only once
        if (this.setup) {
            return;
        }
        const loading = document.querySelector(".loading-view");
        const devtoolsContainer = document.querySelector(".devtools-container");
        if (devtoolsContainer === null) {
            throw new Error("unable to get devtools container");
        }
        ReactDevTools.setupDevTools({
            element: devtoolsContainer,
            delegate: {
                onConnect: ({ target }) => {
                    if (target === "client") {
                        // 프록시 서버가 아닌 RN 기기와 연결이 맺어졌을 때 로딩 뷰 숨김 처리
                        loading?.classList.add("hide");
                    }
                },
                onClose: () => {
                    loading?.classList.remove("hide");
                },
            },
        });
        this.setup = true;
    }
}
//# sourceMappingURL=ReactNativeDevToolsStandaloneView.js.map