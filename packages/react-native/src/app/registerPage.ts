import type { ComponentType } from 'react';

const globalThis = new Function('return this')();

/**
 * @kind function
 * @name registerPage
 * @description
 * Function to register a page component.
 *
 * @param {ComponentType<any>} Page - The page component to register
 * @returns {ComponentType<any>} Returns the registered page component
 *
 * @example
 * ```typescript
 * import { registerPage } from './path/to/module';
 *
 * const MyPage: React.FC = () => <div>My Page</div>;
 *
 * registerPage(MyPage);
 * ```
 */
export function registerPage(Page: ComponentType<any>): ComponentType<any> {
  globalThis.Page = Page;

  return Page;
}
