// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { ContentData } from './ContentData.js';
import { performSearchInContent, performSearchInContentData } from './TextUtils.js';
export class StaticContentProvider {
    contentURLInternal;
    contentTypeInternal;
    lazyContent;
    constructor(contentURL, contentType, lazyContent) {
        this.contentURLInternal = contentURL;
        this.contentTypeInternal = contentType;
        this.lazyContent = lazyContent;
    }
    static fromString(contentURL, contentType, content) {
        const lazyContent = () => Promise.resolve({ content, isEncoded: false });
        return new StaticContentProvider(contentURL, contentType, lazyContent);
    }
    contentURL() {
        return this.contentURLInternal;
    }
    contentType() {
        return this.contentTypeInternal;
    }
    requestContent() {
        return this.lazyContent();
    }
    async searchInContent(query, caseSensitive, isRegex) {
        const { content } = await this.lazyContent();
        return content ? performSearchInContent(content, query, caseSensitive, isRegex) : [];
    }
}
export class SafeStaticContentProvider {
    #contentURL;
    #contentType;
    #lazyContent;
    constructor(contentURL, contentType, lazyContent) {
        this.#contentURL = contentURL;
        this.#contentType = contentType;
        this.#lazyContent = lazyContent;
    }
    contentURL() {
        return this.#contentURL;
    }
    contentType() {
        return this.#contentType;
    }
    requestContent() {
        return this.#lazyContent().then(ContentData.asDeferredContent.bind(undefined));
    }
    requestContentData() {
        return this.#lazyContent();
    }
    async searchInContent(query, caseSensitive, isRegex) {
        const contentData = await this.requestContentData();
        return performSearchInContentData(contentData, query, caseSensitive, isRegex);
    }
}
//# sourceMappingURL=StaticContentProvider.js.map