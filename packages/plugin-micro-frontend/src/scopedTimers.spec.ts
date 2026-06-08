import { describe, expect, it } from 'vitest';
import { transformScopedTimers } from './scopedTimers';

const options = {
  containerName: 'remote-app',
};

describe('transformScopedTimers', () => {
  it('should scope global timer calls to the remote container', () => {
    const input = `
      const timeoutId = setTimeout(() => run(), 300000);
      clearTimeout(timeoutId);
      const intervalId = setInterval(tick, 1000);
      clearInterval(intervalId);
      const animationFrameId = requestAnimationFrame(render);
      cancelAnimationFrame(animationFrameId);
    `;

    expect(transformScopedTimers('/app/src/query.ts', input, options)).toMatchInlineSnapshot(`
      "var __graniteScopedRemoteScope = globalThis.__GRANITE_MICRO_FRONTEND_REMOTE__.getScopedResourceScope("remote-app");

            const timeoutId = globalThis.__GRANITE_MICRO_FRONTEND_REMOTE__.setScopedTimeout(__graniteScopedRemoteScope,() => run(), 300000);
            globalThis.__GRANITE_MICRO_FRONTEND_REMOTE__.clearScopedTimeout(__graniteScopedRemoteScope,timeoutId);
            const intervalId = globalThis.__GRANITE_MICRO_FRONTEND_REMOTE__.setScopedInterval(__graniteScopedRemoteScope,tick, 1000);
            globalThis.__GRANITE_MICRO_FRONTEND_REMOTE__.clearScopedInterval(__graniteScopedRemoteScope,intervalId);
            const animationFrameId = globalThis.__GRANITE_MICRO_FRONTEND_REMOTE__.requestScopedAnimationFrame(__graniteScopedRemoteScope,render);
            globalThis.__GRANITE_MICRO_FRONTEND_REMOTE__.cancelScopedAnimationFrame(__graniteScopedRemoteScope,animationFrameId);
          "
    `);
  });

  it('should keep import declarations before scope capture', () => {
    const input = `
      import { foo } from './foo';

      setTimeout(foo, 1);
    `;

    expect(transformScopedTimers('/app/src/query.ts', input, options)).toMatchInlineSnapshot(`
      "
            import { foo } from './foo';
      var __graniteScopedRemoteScope = globalThis.__GRANITE_MICRO_FRONTEND_REMOTE__.getScopedResourceScope("remote-app");


            globalThis.__GRANITE_MICRO_FRONTEND_REMOTE__.setScopedTimeout(__graniteScopedRemoteScope,foo, 1);
          "
    `);
  });

  it('should ignore local timer bindings', () => {
    const input = `
      const setTimeout = createTimer();
      setTimeout(callback, delay);
    `;

    expect(transformScopedTimers('/app/src/query.ts', input, options)).toBe(input);
  });

  it('should skip micro frontend runtime files', () => {
    const input = `setTimeout(callback, delay);`;

    expect(transformScopedTimers('/app/.granite/micro-frontend-runtime.js', input, options)).toBe(input);
    expect(transformScopedTimers('/repo/packages/plugin-micro-frontend/src/runtime/remoteScope.ts', input, options)).toBe(
      input
    );
  });
});
