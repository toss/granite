import { describe, expect, it } from 'vitest';
import {
  excludeDynamicNamePattern,
  excludeFileExtension,
  excludeRelativePath,
  getFileNameFromPath,
  getRoutePath,
} from './path';

describe('excludeFileExtension', () => {
  it('"./index.ts" is changed to "./index"', () => {
    expect(excludeFileExtension('./index.ts')).toEqual('./index');
  });

  it('"./index.js" is changed to "./index"', () => {
    expect(excludeFileExtension('./index.js')).toEqual('./index');
  });

  it('"./list/detail.tsx" is changed to "./list/detail"', () => {
    expect(excludeFileExtension('./list/detail.tsx')).toEqual('./list/detail');
  });

  it('"./list/detail.jsx" is changed to "./list/detail"', () => {
    expect(excludeFileExtension('./list/detail.jsx')).toEqual('./list/detail');
  });

  it('"./detail.foo" remains as "./detail.foo"', () => {
    expect(excludeFileExtension('./detail.foo')).toEqual('./detail.foo');
  });
});

describe('excludeRelativePath', () => {
  it('"./index.tsx" is changed to "index.tsx"', () => {
    expect(excludeRelativePath('./index.tsx')).toEqual('index.tsx');
  });

  it('"./../index.tsx" is changed to "index.tsx"', () => {
    expect(excludeRelativePath('./../index.tsx')).toEqual('index.tsx');
  });

  it('"../../index.tsx" is changed to "index.tsx"', () => {
    expect(excludeRelativePath('../../index.tsx')).toEqual('index.tsx');
  });
});

describe('excludeDynamicNamePattern', () => {
  it('"[id]" is changed to "id"', () => {
    expect(excludeDynamicNamePattern('[id]')).toEqual('id');
  });

  it('"[id]/[name]" is changed to "id/name"', () => {
    expect(excludeDynamicNamePattern('[id]/[name]')).toEqual('id/name');
  });
});

describe('getRoutePath', () => {
  describe('posix', () => {
    it('"/index.tsx" is converted to "/"', () => {
      expect(getRoutePath('/index.tsx')).toEqual('/');
    });

    it('"/index.ts" is converted to "/"', () => {
      expect(getRoutePath('/index.tsx')).toEqual('/');
    });

    it('"/list/index.tsx" is converted to "/list"', () => {
      expect(getRoutePath('/list/index.tsx')).toEqual('/list');
    });

    it('"/list/detail.tsx" is converted to "/list"', () => {
      expect(getRoutePath('/list/detail.tsx')).toEqual('/list/detail');
    });

    it('"/list/[id].tsx" is converted to "/:id"', () => {
      expect(getRoutePath('/list/[id].tsx')).toEqual('/list/:id');
    });

    it('"/list/[id].js" is converted to "/:id"', () => {
      expect(getRoutePath('/list/[id].js')).toEqual('/list/:id');
    });
  });

  describe('window', () => {
    it('"\\index.tsx" is converted to "/"', () => {
      expect(getRoutePath('\\index.tsx')).toEqual('/');
    });

    it('"\\index.ts" is converted to "/"', () => {
      expect(getRoutePath('\\index.tsx')).toEqual('/');
    });

    it('"\\list\\index.tsx" is converted to "/list"', () => {
      expect(getRoutePath('\\list\\index.tsx')).toEqual('/list');
    });

    it('"\\list\\detail.tsx" is converted to "/list"', () => {
      expect(getRoutePath('\\list\\detail.tsx')).toEqual('/list/detail');
    });

    it('"\\list\\[id].tsx" is converted to "/:id"', () => {
      expect(getRoutePath('\\list\\[id].tsx')).toEqual('/list/:id');
    });

    it('"\\list\\[id].js" is converted to "/:id"', () => {
      expect(getRoutePath('\\list\\[id].js')).toEqual('/list/:id');
    });
  });
});

describe('getFileNameFromPath', () => {
  it('extracts filename from file path', () => {
    const result = getFileNameFromPath('/path/to/file.txt');
    expect(result).toBe('file.txt');
  });

  it('returns the filename when path is just a filename', () => {
    const result = getFileNameFromPath('file.txt');
    expect(result).toBe('file.txt');
  });

  it('returns empty string when path is empty', () => {
    const result = getFileNameFromPath('');
    expect(result).toBe('');
  });

  it('returns empty string when path ends with slash', () => {
    const result = getFileNameFromPath('/path/to/directory/');
    expect(result).toBe('');
  });

  it('extracts filename without extension using withExtension option', () => {
    const result = getFileNameFromPath('/path/to/file.txt', { withExtension: false });
    expect(result).toBe('file');
  });
});
