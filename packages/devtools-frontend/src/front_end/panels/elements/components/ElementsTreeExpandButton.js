// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import elementsTreeExpandButtonStyles from './elementsTreeExpandButton.css.js';
export class ElementsTreeExpandButton extends HTMLElement {
    static litTagName = LitHtml.literal `devtools-elements-tree-expand-button`;
    #shadow = this.attachShadow({ mode: 'open' });
    #clickHandler = () => { };
    set data(data) {
        this.#clickHandler = data.clickHandler;
        this.#update();
    }
    #update() {
        this.#render();
    }
    connectedCallback() {
        this.#shadow.adoptedStyleSheets = [elementsTreeExpandButtonStyles];
    }
    #render() {
        // clang-format off
        // This button's innerText will be tested by e2e test and blink layout tests.
        // It can't have any other characters like '\n' or space, otherwise it will break tests.
        LitHtml.render(LitHtml.html `<span
        class="expand-button"
        @click=${this.#clickHandler}><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>`, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-elements-tree-expand-button', ElementsTreeExpandButton);
//# sourceMappingURL=ElementsTreeExpandButton.js.map