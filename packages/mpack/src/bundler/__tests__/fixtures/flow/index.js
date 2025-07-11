// @flow

type Operation = 'add' | 'sub' | 'mul' | 'div';

function add(a: number, b: number): number {
  return a + b;
}

function sub(a: number, b: number): number {
  return a - b;
}

function mul(a: number, b: number): number {
  return a * b;
}

function div(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}

const operations: { [key: Operation]: (number, number) => number } = {
  add,
  sub,
  mul,
  div
};

const op: mixed = 'mul';
const typedOp: Operation = (op: any);

function safeExecute(fn: ?(number, number) => number, a: number, b: number): number {
  if (fn == null) {
    throw new Error('Function not found');
  }
  return fn(a, b);
}

const a: number = 10;
const b: number = 5;

const result: number = safeExecute(operations[typedOp], a, b);
console.log(`${typedOp}(${a}, ${b}) = ${result}`);
