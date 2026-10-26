import {Chunk, Hit} from './types';
import {indexTokens, prefixOf, words} from './text';
import {alternatives} from './synonyms';

const K1 = 1.4;
const B = 0.72;

export type Index = {
  chunks: Chunk[];
  tf: Map<string, number>[];
  len: number[];
  df: Map<string, number>;
  avgLen: number;
};

export function buildIndex(chunks: Chunk[]): Index {
  const tf: Map<string, number>[] = [];
  const len: number[] = [];
  const df = new Map<string, number>();
  for (const c of chunks) {
    const toks = indexTokens(c.docName + ' ' + c.text);
    const m = new Map<string, number>();
    for (const t of toks) m.set(t, (m.get(t) || 0) + 1);
    for (const t of m.keys()) df.set(t, (df.get(t) || 0) + 1);
    tf.push(m);
    len.push(toks.length);
  }
  const avgLen = len.length ? len.reduce((a, b) => a + b, 0) / len.length : 1;
  return {chunks, tf, len, df, avgLen};
}

export function search(index: Index, query: string, k = 3): Hit[] {
  const base = Array.from(new Set(words(query)));
  if (!base.length || !index.chunks.length) return [];
  const N = index.chunks.length;
  const idfOf = (t: string) => {
    const n = Math.max(1, index.df.get(t) || 0);
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  };
  const weight = base.map(w => {
    const p = prefixOf(w);
    return idfOf(w) > 0 && p ? Math.min(idfOf(w), idfOf(p)) : idfOf(w);
  });
  const totalWeight = weight.reduce((a, b) => a + b, 0) || 1;

  const hits: Hit[] = [];
  for (let i = 0; i < N; i++) {
    const tf = index.tf[i];
    let score = 0;
    let matchedWeight = 0;
    base.forEach((w, wi) => {
      const cands: [string, number][] = [[w, 1]];
      const p = prefixOf(w);
      if (p) cands.push([p, 0.6]);
      for (const alt of alternatives(w)) {
        cands.push([alt, 0.7]);
      }
      let best = 0;
      for (const [t, strength] of cands) {
        const f = tf.get(t);
        if (!f) continue;
        best = Math.max(best, strength);
        const norm = (f * (K1 + 1)) / (f + K1 * (1 - B + (B * index.len[i]) / index.avgLen));
        score += idfOf(t) * norm * strength;
      }
      matchedWeight += weight[wi] * best;
    });
    if (score > 0) hits.push({chunk: index.chunks[i], score, coverage: matchedWeight / totalWeight});
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, k);
}

export const MIN_COVERAGE = 0.45;

export function isAnswerable(hits: Hit[]): boolean {
  return hits.length > 0 && Math.max(...hits.map(h => h.coverage)) >= MIN_COVERAGE;
}
