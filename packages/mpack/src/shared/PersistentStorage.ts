import * as fs from 'fs';
import * as path from 'path';
import { toMerged } from 'es-toolkit';
import { MPACK_DATA_DIR } from '../constants';
import { INTERNAL__Id } from '../types';

interface PersistentData {
  [id: INTERNAL__Id]: {
    /**
     * Resolved module count (used for progress bar progress calculation)
     */
    totalModuleCount: number;
  };
}

class PersistentStorage {
  private data: PersistentData = {};

  constructor() {
    this.loadData();
  }

  getData() {
    return this.data;
  }

  setData(newData: Partial<PersistentData>) {
    this.data = toMerged(this.data, newData);
  }

  loadData() {
    try {
      fs.accessSync(MPACK_DATA_DIR, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      fs.mkdirSync(MPACK_DATA_DIR, { recursive: true });
    }

    try {
      this.data = JSON.parse(fs.readFileSync(path.join(MPACK_DATA_DIR, '.mpack'), 'utf-8')) as PersistentData;
    } catch {
      // noop
    }
  }

  async saveData() {
    try {
      await fs.promises.writeFile(path.join(MPACK_DATA_DIR, '.mpack'), JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // noop
    }
  }
}

export const persistentStorage = new PersistentStorage();
