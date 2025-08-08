/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-var */
import type { ComponentType } from 'react';

export interface GraniteGlobal {
  app: {
    name: string;
    scheme: string;
    host: string;
  };
}

declare global {
  // @internal
  var __granite: GraniteGlobal;

  // @internal
  var Page: ComponentType<any>;
}
