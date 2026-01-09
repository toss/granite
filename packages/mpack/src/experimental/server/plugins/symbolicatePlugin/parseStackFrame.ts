import * as z from 'zod';

export type StackFrame = z.TypeOf<typeof stackFrame>;

const stackFrame = z.object({
  file: z.string(),
  lineNumber: z.number(),
  column: z.number(),
  methodName: z.string(),
});

const stackFrameBody = z.object({
  stack: z.array(stackFrame),
});

export function parseStackFrame(body: unknown) {
  const parsedBody = stackFrameBody.safeParse(JSON.parse(body as string));

  return parsedBody.success ? parsedBody.data.stack : null;
}
