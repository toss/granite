/**
 * Cookies module for Brick framework
 * Provides type-safe cookie management with automatic bridge generation
 *
 * Based on @react-native-cookies/cookies API
 * Supports both NSHTTPCookieStorage and WKHTTPCookieStore on iOS
 * Uses CookieManager on Android
 */

import { type AnyObject, BrickModule, type BrickModuleSpec } from 'brick-module';

/**
 * Cookie object representing a single HTTP cookie
 */
export interface Cookie {
  /** Cookie name (required) */
  name: string;
  /** Cookie value (required) */
  value: string;
  /** Cookie path (optional, defaults to "/") */
  path?: string;
  /** Cookie domain (optional) */
  domain?: string;
  /** Cookie version (optional) */
  version?: string;
  /** Expiration date as ISO string or timestamp (optional) */
  expires?: string;
  /** Whether cookie requires HTTPS (optional) */
  secure?: boolean;
  /** Whether cookie is HTTP-only (optional) */
  httpOnly?: boolean;
}

/**
 * Dictionary of cookies keyed by cookie name
 * Uses AnyObject since TypeScript index signatures map to native dictionaries
 */
export type Cookies = AnyObject;

/**
 * Cookies module specification
 * Manages HTTP cookies for both iOS and Android platforms
 */
export interface CookiesModuleSpec extends BrickModuleSpec {
  readonly moduleName: 'Cookies';

  /**
   * Set a cookie for a given URL
   * @param url - The URL to associate the cookie with
   * @param cookie - The cookie object to set
   * @param useWebKit - Whether to use WebKit cookie store (iOS only)
   * @returns Promise resolving to true on success
   */
  set(url: string, cookie: Cookie, useWebKit: boolean): Promise<boolean>;

  /**
   * Get cookies for a given URL
   * @param url - The URL to get cookies for
   * @param useWebKit - Whether to use WebKit cookie store (iOS only)
   * @returns Promise resolving to a dictionary of cookies
   */
  get(url: string, useWebKit: boolean): Promise<AnyObject>;

  /**
   * Get all cookies (iOS only, Android returns empty object)
   * @param useWebKit - Whether to use WebKit cookie store (iOS only)
   * @returns Promise resolving to a dictionary of all cookies
   */
  getAll(useWebKit: boolean): Promise<AnyObject>;

  /**
   * Clear all cookies
   * @param useWebKit - Whether to use WebKit cookie store (iOS only)
   * @returns Promise resolving to true on success
   */
  clearAll(useWebKit: boolean): Promise<boolean>;

  /**
   * Clear a specific cookie by name (iOS only)
   * @param url - The URL domain to clear the cookie from
   * @param name - The name of the cookie to clear
   * @param useWebKit - Whether to use WebKit cookie store (iOS only)
   * @returns Promise resolving to true on success
   */
  clearByName(url: string, name: string, useWebKit: boolean): Promise<boolean>;

  /**
   * Set cookies from a Set-Cookie response header
   * @param url - The URL the response came from
   * @param cookie - The Set-Cookie header string
   * @returns Promise resolving to true on success
   */
  setFromResponse(url: string, cookie: string): Promise<boolean>;

  /**
   * Get cookies that would be sent with a request to the URL
   * Returns them in Set-Cookie header format
   * @param url - The URL to get cookies for
   * @returns Promise resolving to the cookies as a header string
   */
  getFromResponse(url: string): Promise<AnyObject>;

  /**
   * Flush cookies to persistent storage (Android only)
   * On iOS, this is a no-op that resolves immediately
   * @returns Promise resolving when flush is complete
   */
  flush(): Promise<boolean>;

  /**
   * Remove session cookies (Android only)
   * On iOS, this is a no-op that resolves immediately
   * @returns Promise resolving to true on success
   */
  removeSessionCookies(): Promise<boolean>;
}

export const CookiesNativeModule = BrickModule.get<CookiesModuleSpec>('BrickCookies');
