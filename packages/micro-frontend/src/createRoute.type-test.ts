import { expectTypeOf } from 'vitest';
import { createRoute } from './createRoute';
import type { StandardSchemaV1Like } from './hostSkeletonStore';

interface ProductParams {
  productId: string;
  thumbnailUrl?: string;
}

interface ProductSchemaInput {
  productId: string | number;
  thumbnailUrl?: string;
}

declare module '@granite-js/react-native' {
  interface RegisterScreenInput {
    '/product': ProductParams;
  }

  interface RegisterScreen {
    '/product': ProductParams;
  }
}

function ProductPage() {
  return null;
}

const Route = createRoute('/product', {
  component: ProductPage,
  validateParams: params => params as ProductParams,
  skeletonComponent: params => {
    expectTypeOf(params).toEqualTypeOf<ProductParams>();

    return null;
  },
});

expectTypeOf(Route.useParams()).toEqualTypeOf<ProductParams>();

const productSchema: StandardSchemaV1Like<ProductSchemaInput, ProductParams> = {
  '~standard': {
    validate(value) {
      return {
        value: {
          productId: String(value.productId),
          thumbnailUrl: value.thumbnailUrl,
        },
      };
    },
  },
};

const SchemaRoute = createRoute('/product', {
  component: ProductPage,
  validateParams: productSchema,
  skeletonComponent: params => {
    expectTypeOf(params).toEqualTypeOf<ProductParams>();

    return null;
  },
});

expectTypeOf(SchemaRoute.useParams()).toEqualTypeOf<ProductParams>();
expectTypeOf(SchemaRoute._inputType).toEqualTypeOf<ProductSchemaInput>();
