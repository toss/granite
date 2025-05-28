import * as fs from 'fs/promises';
import * as path from 'path';
import { toMerged } from 'es-toolkit';
import { MPACK_DATA_DIR } from '../constants';
import { INTERNAL__Id } from '../types';

/**
 * 파일 시스템에 저장되는 데이터 (캐싱된 메타 데이터)
 */
interface PersistentData {
  [id: INTERNAL__Id]: {
    /**
     * 번들링시 resolve 된 전체 모듈 수 (progress 계산에 사용)
     */
    totalModuleCount: number;
  };
}

class PersistentStorage {
  private data: PersistentData = {};

  getData() {
    return this.data;
  }

  setData(newData: Partial<PersistentData>) {
    this.data = toMerged(this.data, newData);
  }

  async loadData() {
    try {
      await fs.access(MPACK_DATA_DIR, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      await fs.mkdir(MPACK_DATA_DIR, { recursive: true });
    }

    try {
      this.data = JSON.parse(await fs.readFile(path.join(MPACK_DATA_DIR, '.mpack'), 'utf-8')) as PersistentData;
    } catch {
      // noop
    }
  }

  async saveData() {
    try {
      await fs.writeFile(path.join(MPACK_DATA_DIR, '.mpack'), JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // noop
    }
  }
}

export const persistentStorage = new PersistentStorage();
