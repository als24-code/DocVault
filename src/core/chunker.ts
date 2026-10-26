import {Chunk, PageText} from './types';

export const MAX_CHARS = 900;

const HEADING = /^(§\s*\d+[a-z]?\b.*|\d{1,2}(\.\d{1,2})*\.?\s+[A-ZÄÖÜ].*|[A-ZÄÖÜ][A-ZÄÖÜ \-/&]{5,})$/;

function isHeading(line: string): boolean {
  const t = line.trim();
  return t.length > 2 && t.length <= 80 && HEADING.test(t);
}

function splitLong(unit: string, max: number): string[] {
  if (unit.length <= max) return [unit];
  const sentences = (unit.match(/[^.!?;:]+[.!?;:]*\s*/g) || [unit]).map(x => x.trim());
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (s.length > max) {
      if (cur) out.push(cur);
      cur = '';
      for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max));
      continue;
    }
    if ((cur + ' ' + s).trim().length > max) {
      if (cur) out.push(cur);
      cur = s;
    } else {
      cur = (cur + ' ' + s).trim();
    }
  }
  if (cur) out.push(cur);
  return out;
}

export function chunkPages(
  docId: string,
  docName: string,
  pages: PageText[],
  max: number = MAX_CHARS,
): Chunk[] {
  const chunks: Chunk[] = [];
  let heading = '';
  for (const {page, text} of pages) {
    const lines = text.replace(/\r/g, '').split('\n');
    const units: {text: string; heading: string}[] = [];
    let para: string[] = [];
    const flush = () => {
      const t = para.join(' ').replace(/\s+/g, ' ').trim();
      para = [];
      if (t) for (const part of splitLong(t, max - 60)) units.push({text: part, heading});
    };
    for (const line of lines) {
      if (!line.trim()) {
        flush();
      } else if (isHeading(line)) {
        flush();
        heading = line.trim();
        para.push(line.trim());
      } else {
        para.push(line.trim());
      }
    }
    flush();

    let cur = '';
    let curHeading = '';
    const emit = () => {
      const body = cur.trim();
      if (!body) return;
      const withHeading =
        curHeading && !body.startsWith(curHeading) ? curHeading + '\n' + body : body;
      chunks.push({
        id: `${docId}:${chunks.length}`,
        docId,
        docName,
        page,
        text: withHeading,
      });
      cur = '';
    };
    for (const u of units) {
      if (cur && (cur + '\n' + u.text).length > max) emit();
      if (!cur) curHeading = u.heading;
      cur = cur ? cur + '\n' + u.text : u.text;
    }
    emit();
  }
  return chunks;
}
