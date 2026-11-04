import { describe, it, expect } from 'vitest';
import { defaultParserParams } from './defaultParserParams';

describe('defaultParserParams', () => {
  it('Parses numeric and boolean values from strings', () => {
    const result = defaultParserParams({ foo: '123', bar: 'true' });
    expect(result).toEqual({
      foo: 123,
      bar: true,
    });
  });

  it('Parses parameters in query string format', () => {
    const result = defaultParserParams({ foo: '123', bar: 'true' });
    expect(result).toEqual({
      foo: 123,
      bar: true,
    });
  });

  it('Maintains original value for unparseable strings', () => {
    const result = defaultParserParams({ name: 'john', age: 'invalid' });
    expect(result).toEqual({
      name: 'john',
      age: 'invalid',
    });
  });

  it('Parses JSON format arrays', () => {
    const result = defaultParserParams({ numbers: '[1,2,3]', strings: '["a","b"]' });
    expect(result).toEqual({
      numbers: [1, 2, 3],
      strings: ['a', 'b'],
    });
  });

  it('Parses JSON format objects', () => {
    const result = defaultParserParams({ user: '{"name":"john","age":30}' });
    expect(result).toEqual({
      user: {
        name: 'john',
        age: 30,
      },
    });
  });
});
