/* eslint-disable @typescript-eslint/naming-convention */

import type { ComponentType } from 'react';

export interface GraniteGlobal {
  app: {
    name: string;
    scheme: string;
    host: string;
    /** Whether the app was built as a standalone (greenfield) app without a brownfield host. */
    standalone?: boolean;
  };
}

declare global {
  // @internal
  var __granite: GraniteGlobal;

  // @internal
  var Page: ComponentType<any>;
}
