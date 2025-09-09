import * as fs from 'fs/promises';
import * as path from 'path';
import { describe, expect, it, beforeAll } from 'vitest';
import { evaluate } from '../../testing';
import { AsyncTransformPipeline } from '../AsyncTransformPipeline';

describe('AsyncTransformPipeline', () => {
  let entryCode: string;
  const entryFile = path.join(__dirname, 'fixtures/index.ts');

  function toPrintState(code: string) {
    return code + ';console.log(JSON.stringify(state));';
  }

  function expectState(key: string, value: unknown) {
    return `"${key}":${JSON.stringify(value)}`;
  }

  beforeAll(async () => {
    entryCode = await fs.readFile(entryFile, 'utf-8');
  });

  it('등록한 step 들이 순차적으로 실행된다', async () => {
    const pipeline = new AsyncTransformPipeline()
      .addStep(async (code) => ({ code: code + ';state.value++;' })) // 1
      .addStep(async (code) => ({ code: code + ';state.value++;' })) // 2
      .addStep(async (code) => ({ code: code + ';state.value++;' })); // 3

    const result = await pipeline.transform(entryCode, { path: entryFile });
    const code = toPrintState(result.code);

    expect(await evaluate(code)).toContain(expectState('value', 3));
  });

  describe('step 에서 done: true 를 반환할 경우', () => {
    it('이후 step 들은 실행되지 않아야 한다', async () => {
      const pipeline = new AsyncTransformPipeline()
        .addStep(async (code) => ({ code: code + ';state.value++;' })) // 1
        .addStep(async (code) => ({ code: code + ';state.value++;', done: true })) // 2
        .addStep(async (code) => ({ code: code + ';state.value++;' })); // 3

      const result = await pipeline.transform(entryCode, { path: entryFile });
      const code = toPrintState(result.code);

      expect(await evaluate(code)).toContain(expectState('value', 2));
    });

    it('afterStep 은 항상 실행된다', async () => {
      const pipeline = new AsyncTransformPipeline()
        .addStep(async (code) => ({ code: code + ';state.value++;' })) // 1
        .addStep(async (code) => ({ code: code + ';state.value++;', done: true })) // 2
        .addStep(async (code) => ({ code: code + ';state.value++;' })) // 3
        .afterStep(async (code) => ({ code: code + ';state.after=true;' }));

      const result = await pipeline.transform(entryCode, { path: entryFile });
      const code = toPrintState(result.code);

      expect(await evaluate(code)).toContain(expectState('value', 2));
      expect(await evaluate(code)).toContain(expectState('after', true));
    });
  });

  describe('step 구성에 조건이 있는 경우', () => {
    describe('조건이 하나라도 충족된 경우', () => {
      it('해당 step 이 실행되어야 한다', async () => {
        const pipeline = new AsyncTransformPipeline()
          .addStep(async (code) => ({ code: code + ';state.value++;' })) // 1
          .addStep({
            if: () => true,
            then: async (code) => ({ code: code + ';state.value++;' }),
          });

        const result = await pipeline.transform(entryCode, { path: entryFile });
        const code = toPrintState(result.code);

        expect(await evaluate(code)).toContain(expectState('value', 2));
      });
    });

    describe('조건이 하나라도 충족되지 않은 경우', () => {
      it('해당 step 이 실행되지 않아야 한다', async () => {
        const pipeline = new AsyncTransformPipeline()
          .addStep(async (code) => ({ code: code + ';state.value++;' })) // 1
          .addStep({
            if: () => false,
            then: async (code) => ({ code: code + ';state.value++;' }),
          });

        const result = await pipeline.transform(entryCode, { path: entryFile });
        const code = toPrintState(result.code);

        expect(await evaluate(code)).toContain(expectState('value', 1));
      });
    });
  });

  describe('step 구성에 skipOtherSteps 이 활성화 되어있는 경우', () => {
    it('이후 step 들은 실행되지 않아야 한다', async () => {
      const pipeline = new AsyncTransformPipeline()
        .addStep(async (code) => ({ code: code + ';state.value++;' })) // 1
        .addStep(async (code) => ({ code: code + ';state.value++;' })) // 2
        .addStep({
          if: () => false,
          then: async (code) => ({ code: code + ';state.value++;' }),
          stopAfter: true,
        })
        .addStep(async (code) => ({ code: code + ';state.value++;' })); // 4

      const result = await pipeline.transform(entryCode, { path: entryFile });
      const code = toPrintState(result.code);

      expect(await evaluate(code)).toContain(expectState('value', 3));
    });
  });
});
