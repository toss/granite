import type { RouteOptions } from '@granite-js/react-native';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { expectTypeOf } from 'vitest';
import { createRoute, type MicroFrontendRouteOptions } from './createRoute';

interface ProductParams {
  readonly productId: string;
  readonly thumbnailUrl?: string;
}

interface ProductSchemaInput {
  readonly productId: string | number;
  readonly thumbnailUrl?: string;
}

type OfficialRouteHasHostPendingComponent = 'hostPendingComponent' extends keyof RouteOptions<ProductParams>
  ? true
  : false;
type MicroFrontendRouteHasHostPendingComponent =
  'hostPendingComponent' extends keyof MicroFrontendRouteOptions<ProductParams> ? true : false;
type MicroFrontendRouteHasSkeletonComponent =
  'skeletonComponent' extends keyof MicroFrontendRouteOptions<ProductParams> ? true : false;

expectTypeOf<OfficialRouteHasHostPendingComponent>().toEqualTypeOf<false>();
expectTypeOf<MicroFrontendRouteHasHostPendingComponent>().toEqualTypeOf<true>();
expectTypeOf<MicroFrontendRouteHasSkeletonComponent>().toEqualTypeOf<false>();

declare module '@granite-js/react-native' {
  interface RegisterScreenInput {
    readonly '/product': ProductParams;
  }

  interface RegisterScreen {
    readonly '/product': ProductParams;
  }
}

function ProductPage() {
  return null;
}

const Route = createRoute('/product', {
  component: ProductPage,
  validateParams: (params): ProductParams => {
    const productId = params == null || !('productId' in params) ? '' : String(params.productId);
    const thumbnailUrl = params == null || !('thumbnailUrl' in params) ? undefined : String(params.thumbnailUrl);

    return thumbnailUrl == null ? { productId } : { productId, thumbnailUrl };
  },
  hostPendingComponent: params => {
    expectTypeOf(params).toEqualTypeOf<ProductParams>();
    return null;
  },
});

expectTypeOf(Route).toMatchTypeOf<{ readonly useParams: () => ProductParams }>();

function createProductSchema(): StandardSchemaV1<ProductSchemaInput, ProductParams> {
  return {
    '~standard': {
      version: 1,
      vendor: 'granite-test',
      validate(value) {
        if (typeof value !== 'object' || value == null || !('productId' in value)) {
          return { issues: [{ message: 'productId is required' }] };
        }

        const productId = String(value.productId);
        const thumbnailUrl = 'thumbnailUrl' in value ? String(value.thumbnailUrl) : undefined;

        return {
          value: thumbnailUrl == null ? { productId } : { productId, thumbnailUrl },
        };
      },
    },
  };
}

const SchemaRoute = createRoute('/product', {
  component: ProductPage,
  validateParams: createProductSchema(),
  hostPendingComponent: params => {
    expectTypeOf(params).toEqualTypeOf<ProductParams>();
    return null;
  },
});

expectTypeOf<ReturnType<typeof SchemaRoute.useParams>>().toEqualTypeOf<ProductParams>();
expectTypeOf(SchemaRoute._inputType).toEqualTypeOf<ProductSchemaInput>();
