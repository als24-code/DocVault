import {Answer, Citation, Hit} from './types';
import {NOT_FOUND} from './prompt';

const CITE = /\[(\d{1,2})\]/g;

export function unverifiedFigures(answer: string, sources: string[]): string[] {
  const body = answer.replace(CITE, ' ');
  const nums = body.match(/\d+(?:[.,]\d+)*/g) || [];
  const hay = sources.join(' ').replace(/\s+/g, ' ');
  const missing: string[] = [];
  for (const n of Array.from(new Set(nums))) {
    const re = new RegExp('(^|[^0-9])' + n.replace(/[.,]/g, '[.,]') + '([^0-9]|$)');
    if (!re.test(hay)) missing.push(n);
  }
  return missing;
}

export function finalizeAnswer(raw: string, hits: Hit[]): Answer {
  const text = raw.trim();
  if (!text || text.toUpperCase().startsWith(NOT_FOUND)) {
    return {text: '', citations: [], notFound: true, unverifiedFigures: []};
  }
  const used = new Set<number>();
  let m: RegExpExecArray | null;
  const re = new RegExp(CITE.source, 'g');
  while ((m = re.exec(text))) {
    const n = Number(m[1]);
    if (n >= 1 && n <= hits.length) used.add(n);
  }
  let citations: Citation[] = Array.from(used)
    .sort((a, b) => a - b)
    .map(n => ({n, chunk: hits[n - 1].chunk}));
  if (!citations.length && hits.length) citations = [{n: 1, chunk: hits[0].chunk}];
  const cleaned = text.replace(/\[(\d{1,2})\]/g, (all, d) =>
    Number(d) >= 1 && Number(d) <= hits.length ? all : '',
  );
  return {
    text: cleaned.replace(/\s+([.,;])/g, '$1').trim(),
    citations,
    notFound: false,
    unverifiedFigures: unverifiedFigures(
      cleaned,
      citations.map(c => c.chunk.text),
    ),
  };
}
