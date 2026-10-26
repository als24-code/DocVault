import {NativeModules} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import TextRecognition, {TextRecognitionScript} from '@react-native-ml-kit/text-recognition';
import {keepLocalCopy} from '@react-native-documents/picker';
import {chunkPages} from '../core/chunker';
import {DocKind, PageText, VaultDoc} from '../core/types';
import {INGEST} from '../config';

const fs = ReactNativeBlobUtil.fs;
const PdfRender: {
  pageCount(uri: string): Promise<number>;
  renderPage(uri: string, page: number, width: number): Promise<string>;
} = NativeModules.PdfRender;

export type Picked = {uri: string; name: string | null; type: string | null};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function buildDoc(name: string, kind: DocKind, pages: PageText[]): VaultDoc {
  const id = uid();
  const clean = pages.filter(p => p.text.trim().length > 0);
  const chunks = chunkPages(id, name, clean);
  if (!chunks.length) throw new Error('No readable text found in this document.');
  return {id, name, kind, addedAt: Date.now(), pageCount: pages.length, chunks};
}

export function docFromText(name: string, text: string, kind: DocKind = 'note'): VaultDoc {
  const pages = text.split('\f').map((t, i) => ({page: i + 1, text: t}));
  return buildDoc(name, kind, pages);
}

const localPath = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));

async function ocr(uri: string): Promise<string> {
  const res = await TextRecognition.recognize(uri, TextRecognitionScript.LATIN);
  return res.text;
}

function kindOf(p: Picked): DocKind | null {
  const name = (p.name || '').toLowerCase();
  const type = p.type || '';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/.test(name)) return 'image';
  if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) return 'text';
  return null;
}

export async function importPicked(
  picked: Picked,
  onStatus: (msg: string) => void,
): Promise<VaultDoc> {
  const kind = kindOf(picked);
  if (!kind) throw new Error('Only PDF, image and text files are supported.');
  const name = (picked.name || 'Document').replace(/\.[a-z0-9]{2,4}$/i, '');
  onStatus('Copying file…');
  const [copy] = await keepLocalCopy({
    files: [{uri: picked.uri, fileName: picked.name || 'document'}],
    destination: 'cachesDirectory',
  });
  if (copy.status !== 'success') throw new Error('Could not open the file.');
  const uri = copy.localUri;

  try {
    if (kind === 'text') {
      onStatus('Reading text…');
      return docFromText(name, await fs.readFile(localPath(uri), 'utf8'), 'text');
    }
    if (kind === 'image') {
      onStatus('Reading text from the picture…');
      return buildDoc(name, 'image', [{page: 1, text: await ocr(uri)}]);
    }
    const count = await PdfRender.pageCount(uri);
    const limit = Math.min(count, INGEST.maxPdfPages);
    const pages: PageText[] = [];
    for (let i = 0; i < limit; i++) {
      onStatus(`Reading page ${i + 1} of ${limit}…`);
      const img = await PdfRender.renderPage(uri, i, INGEST.pdfRenderWidth);
      try {
        pages.push({page: i + 1, text: await ocr('file://' + img)});
      } finally {
        fs.unlink(img).catch(() => {});
      }
    }
    const doc = buildDoc(name, 'pdf', pages);
    doc.pageCount = count;
    return doc;
  } finally {
    fs.unlink(localPath(uri)).catch(() => {});
  }
}
