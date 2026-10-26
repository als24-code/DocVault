import ReactNativeBlobUtil from 'react-native-blob-util';
import {VaultDoc} from '../core/types';

const fs = ReactNativeBlobUtil.fs;
const FILE = `${fs.dirs.DocumentDir}/vault.json`;

export async function loadDocs(): Promise<VaultDoc[]> {
  try {
    if (!(await fs.exists(FILE))) return [];
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDocs(docs: VaultDoc[]): Promise<void> {
  const tmp = FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(docs), 'utf8');
  if (await fs.exists(FILE)) await fs.unlink(FILE);
  await fs.mv(tmp, FILE);
}
