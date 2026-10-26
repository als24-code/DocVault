const STOPWORDS = new Set(
  (
    'der die das den dem des ein eine einen einem einer eines und oder aber ' +
    'ist sind war wird werden wurde kann koennen muss soll sollen hat haben ' +
    'habe habt bin bist ich mein meine meinen meinem meiner mir mich du dein sie er es wir ihr ' +
    'wie was wer wo wann wann warum welche welcher welches wieviel wie viele ' +
    'bei mit von vor nach aus auf in im am an zu zum zur fuer ueber unter ' +
    'nicht kein keine auch noch nur wenn dann als ob so ' +
    'the a an and or but is are was were be been can could should must have has ' +
    'i my me you your we our they it its what which who when where why how ' +
    'do does did of to in on at for with by from about if then not no'
  ).split(' '),
);

export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

export function words(s: string): string[] {
  return fold(s)
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w));
}

export function prefixOf(w: string): string | null {
  return w.length >= 5 ? '~' + w.slice(0, 5) : null;
}

export function indexTokens(s: string): string[] {
  const out: string[] = [];
  for (const w of words(s)) {
    out.push(w);
    const p = prefixOf(w);
    if (p) out.push(p);
  }
  return out;
}
