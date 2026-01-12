import { type Cookie, CookiesNativeModule } from "./spec/cookies.brick";

/**
 * Type-safe cookie dictionary
 */
export type CookieDict = { [name: string]: Cookie };

/**
 * Cookie Manager API
 * Provides a convenient wrapper around the native Cookies module
 */
export const CookieManager = {
  /**
   * Set a cookie for a given URL
   * @param url - The URL to associate the cookie with
   * @param cookie - The cookie object to set
   * @param useWebKit - Whether to use WebKit cookie store (iOS only, default: false)
   */
  set(url: string, cookie: Cookie, useWebKit = false): Promise<boolean> {
    return CookiesNativeModule.set(url, cookie, useWebKit);
  },

  /**
   * Get cookies for a given URL
   * @param url - The URL to get cookies for
   * @param useWebKit - Whether to use WebKit cookie store (iOS only, default: false)
   */
  get(url: string, useWebKit = false): Promise<CookieDict> {
    return CookiesNativeModule.get(url, useWebKit) as Promise<CookieDict>;
  },

  /**
   * Get all cookies (iOS only, Android returns empty object)
   * @param useWebKit - Whether to use WebKit cookie store (iOS only, default: false)
   */
  getAll(useWebKit = false): Promise<CookieDict> {
    return CookiesNativeModule.getAll(useWebKit) as Promise<CookieDict>;
  },

  /**
   * Clear all cookies
   * @param useWebKit - Whether to use WebKit cookie store (iOS only, default: false)
   */
  clearAll(useWebKit = false): Promise<boolean> {
    return CookiesNativeModule.clearAll(useWebKit);
  },

  /**
   * Clear a specific cookie by name (iOS only)
   * @param url - The URL domain to clear the cookie from
   * @param name - The name of the cookie to clear
   * @param useWebKit - Whether to use WebKit cookie store (iOS only, default: false)
   */
  clearByName(url: string, name: string, useWebKit = false): Promise<boolean> {
    return CookiesNativeModule.clearByName(url, name, useWebKit);
  },

  /**
   * Set cookies from a Set-Cookie response header
   * @param url - The URL the response came from
   * @param cookie - The Set-Cookie header string
   */
  setFromResponse(url: string, cookie: string): Promise<boolean> {
    return CookiesNativeModule.setFromResponse(url, cookie);
  },

  /**
   * Get cookies that would be sent with a request to the URL
   * @param url - The URL to get cookies for
   */
  getFromResponse(url: string): Promise<CookieDict> {
    return CookiesNativeModule.getFromResponse(url) as Promise<CookieDict>;
  },

  /**
   * Flush cookies to persistent storage (Android only)
   * On iOS, this is a no-op that resolves immediately
   */
  flush(): Promise<boolean> {
    return CookiesNativeModule.flush();
  },

  /**
   * Remove session cookies (Android only)
   * On iOS, this is a no-op that resolves immediately
   */
  removeSessionCookies(): Promise<boolean> {
    return CookiesNativeModule.removeSessionCookies();
  },
};

export default CookieManager;
