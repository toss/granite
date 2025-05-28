// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../common/common.js';
import * as Root from '../root/root.js';
import { Cookie } from './Cookie.js';
import { Events as ResourceTreeModelEvents, ResourceTreeModel } from './ResourceTreeModel.js';
import { SDKModel } from './SDKModel.js';
import { TargetManager } from './TargetManager.js';
export class CookieModel extends SDKModel {
    #blockedCookies;
    #cookieToBlockedReasons;
    constructor(target) {
        super(target);
        this.#blockedCookies = new Map();
        this.#cookieToBlockedReasons = new Map();
        TargetManager.instance().addModelListener(ResourceTreeModel, ResourceTreeModelEvents.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
    }
    addBlockedCookie(cookie, blockedReasons) {
        const key = cookie.key();
        const previousCookie = this.#blockedCookies.get(key);
        this.#blockedCookies.set(key, cookie);
        if (blockedReasons) {
            this.#cookieToBlockedReasons.set(cookie, blockedReasons);
        }
        else {
            this.#cookieToBlockedReasons.delete(cookie);
        }
        if (previousCookie) {
            this.#cookieToBlockedReasons.delete(previousCookie);
        }
    }
    removeBlockedCookie(cookie) {
        this.#blockedCookies.delete(cookie.key());
    }
    #onPrimaryPageChanged() {
        this.#blockedCookies.clear();
        this.#cookieToBlockedReasons.clear();
    }
    getCookieToBlockedReasonsMap() {
        return this.#cookieToBlockedReasons;
    }
    async getCookies(urls) {
        const response = await this.target().networkAgent().invoke_getCookies({ urls });
        if (response.getError()) {
            return [];
        }
        const normalCookies = response.cookies.map(Cookie.fromProtocolCookie);
        const blockedCookieArray = Array.from(this.#blockedCookies.values());
        const matchesBlockedCookie = (cookie) => {
            return blockedCookieArray.some(blockedCookie => cookie.isEqual(blockedCookie));
        };
        return normalCookies.filter(cookie => !matchesBlockedCookie(cookie)).concat(blockedCookieArray);
    }
    async deleteCookie(cookie) {
        await this.deleteCookies([cookie]);
    }
    async clear(domain, securityOrigin) {
        const cookies = await this.getCookiesForDomain(domain || null);
        if (securityOrigin) {
            const cookiesToDelete = cookies.filter(cookie => {
                return cookie.matchesSecurityOrigin(securityOrigin);
            });
            await this.deleteCookies(cookiesToDelete);
        }
        else {
            await this.deleteCookies(cookies);
        }
    }
    async saveCookie(cookie) {
        let domain = cookie.domain();
        if (!domain.startsWith('.')) {
            domain = '';
        }
        let expires = undefined;
        if (cookie.expires()) {
            expires = Math.floor(Date.parse(`${cookie.expires()}`) / 1000);
        }
        const enabled = Root.Runtime.experiments.isEnabled('experimental-cookie-features');
        const preserveUnset = (scheme) => scheme === "Unset" /* Protocol.Network.CookieSourceScheme.Unset */ ? scheme : undefined;
        const protocolCookie = {
            name: cookie.name(),
            value: cookie.value(),
            url: cookie.url() || undefined,
            domain,
            path: cookie.path(),
            secure: cookie.secure(),
            httpOnly: cookie.httpOnly(),
            sameSite: cookie.sameSite(),
            expires,
            priority: cookie.priority(),
            partitionKey: cookie.partitionKey(),
            sourceScheme: enabled ? cookie.sourceScheme() : preserveUnset(cookie.sourceScheme()),
            sourcePort: enabled ? cookie.sourcePort() : undefined,
        };
        const response = await this.target().networkAgent().invoke_setCookie(protocolCookie);
        const error = response.getError();
        if (error || !response.success) {
            return false;
        }
        return response.success;
    }
    /**
     * Returns cookies needed by current page's frames whose security origins are |domain|.
     */
    getCookiesForDomain(domain) {
        const resourceURLs = [];
        function populateResourceURLs(resource) {
            const documentURL = Common.ParsedURL.ParsedURL.fromString(resource.documentURL);
            if (documentURL && (!domain || documentURL.securityOrigin() === domain)) {
                resourceURLs.push(resource.url);
            }
            return false;
        }
        const resourceTreeModel = this.target().model(ResourceTreeModel);
        if (resourceTreeModel) {
            // In case the current frame was unreachable, add it's cookies
            // because they might help to debug why the frame was unreachable.
            if (resourceTreeModel.mainFrame && resourceTreeModel.mainFrame.unreachableUrl()) {
                resourceURLs.push(resourceTreeModel.mainFrame.unreachableUrl());
            }
            resourceTreeModel.forAllResources(populateResourceURLs);
        }
        return this.getCookies(resourceURLs);
    }
    async deleteCookies(cookies) {
        const networkAgent = this.target().networkAgent();
        this.#blockedCookies.clear();
        this.#cookieToBlockedReasons.clear();
        await Promise.all(cookies.map(cookie => networkAgent.invoke_deleteCookies({
            name: cookie.name(),
            url: undefined,
            domain: cookie.domain(),
            path: cookie.path(),
            partitionKey: cookie.partitionKey(),
        })));
    }
}
SDKModel.register(CookieModel, { capabilities: 16 /* Capability.Network */, autostart: false });
//# sourceMappingURL=CookieModel.js.map