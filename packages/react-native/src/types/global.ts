/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-var */
import type { ComponentType } from 'react';

export interface GraniteGlobal {
  shared: {
    buildNumber: string;
  };
  app: {
    name: string;
    scheme: string;
    buildNumber: string;
  };
}

declare global {
  // @internal
  var __SPLIT_CHUNK_ENABLED__: boolean;

  // @internal
  var __granite_require__: (id: string) => any;

  // @internal
  var __granite: GraniteGlobal;

  // @internal
  var Page: ComponentType<any>;

  var window: { __granite: GraniteGlobal };
  var global: { __granite: GraniteGlobal };
}
