import {chunkPages} from '../src/core/chunker';
import {buildIndex, search, isAnswerable} from '../src/core/retrieval';
import {buildMessages} from '../src/core/prompt';
import {finalizeAnswer, unverifiedFigures} from '../src/core/answer';
import {SAMPLE_CONTRACT, SAMPLE_NAME} from '../src/sample/contract';

const pages = SAMPLE_CONTRACT.split('\f').map((text, i) => ({page: i + 1, text}));
const chunks = chunkPages('d1', SAMPLE_NAME, pages);
const index = buildIndex(chunks);

describe('chunker', () => {
  it('keeps chunks small and tags pages', () => {
    expect(chunks.length).toBeGreaterThan(4);
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(1000);
    expect(new Set(chunks.map(c => c.page))).toEqual(new Set([1, 2, 3]));
  });
  it('carries clause headings into the chunk', () => {
    const c = chunks.find(x => x.text.includes('vier Wochen'))!;
    expect(c.text).toContain('§ 12');
  });
  it('splits one huge paragraph', () => {
    const big = 'Satz eins ist hier. '.repeat(300);
    const out = chunkPages('x', 'x', [{page: 1, text: big}]);
    expect(out.length).toBeGreaterThan(3);
    for (const c of out) expect(c.text.length).toBeLessThanOrEqual(900);
  });
});

describe('retrieval', () => {
  const top = (q: string, k = 3) => search(index, q, k).map(h => h.chunk.text);
  it('finds the notice period clauses, including the one in § 14', () => {
    const t = top('Wie lang ist meine Kündigungsfrist nach drei Jahren im Betrieb?', 3).join('\n');
    expect(t).toContain('vier Wochen zum 15.');
    expect(t).toContain('nach zwei Jahren Betriebszugehörigkeit');
  });
  it('matches German compounds without exact words', () => {
    const t = top('Wann kann ich kündigen?', 3).join('\n');
    expect(t).toContain('Kündigungsfrist');
  });
  it('finds vacation expiry rules', () => {
    const t = top('Verfällt mein Urlaub, wenn ich ihn bis März nicht genommen habe?', 2).join('\n');
    expect(t).toContain('31. März');
    expect(t).toContain('Mehrurlaub');
  });
  it('finds Weihnachtsgeld', () => {
    expect(top('Habe ich Anspruch auf Weihnachtsgeld?', 1)[0]).toContain('freiwillige Leistung');
  });
  it('works in English and with plain umlauts', () => {
    expect(top('Kuendigung Probezeit', 2).join('\n')).toContain('zwei Wochen');
    const en = buildIndex(chunkPages('e', 'Lease', [{page: 1, text: 'Termination\nThe tenant may terminate this lease early with three months written notice.'}]));
    expect(search(en, 'Can I terminate my lease early?', 1)[0].chunk.text).toContain('three months');
  });
  it('refuses questions the documents cannot answer', () => {
    expect(isAnswerable(search(index, 'Wie lautet die Adresse meines Vermieters?'))).toBe(false);
    expect(isAnswerable(search(index, 'Was kostet eine Mietkaution?'))).toBe(false);
  });
  it('does not refuse answerable questions', () => {
    for (const q of [
      'Wie lang ist meine Kündigungsfrist nach drei Jahren im Betrieb?',
      'Habe ich Anspruch auf Weihnachtsgeld?',
      'Wie viele Urlaubstage habe ich?',
      'Darf ich nach dem Job zur Konkurrenz?',
    ]) {
      expect(isAnswerable(search(index, q))).toBe(true);
    }
  });
  it('uses synonyms people actually type', () => {
    expect(top('Was ist mit Konkurrenz nach dem Job?', 1)[0]).toContain('Wettbewerb');
    expect(top('Wie viel Lohn bekomme ich?', 1)[0]).toContain('4.800');
  });
  it('cannot match across languages (documented limit)', () => {
    expect(isAnswerable(search(index, 'How long is the probation period?'))).toBe(false);
  });
  it('handles empty input', () => {
    expect(search(buildIndex([]), 'Kündigung')).toEqual([]);
    expect(search(index, '   ')).toEqual([]);
  });
});

describe('prompt', () => {
  it('numbers excerpts and names the page', () => {
    const hits = search(index, 'Probezeit', 2);
    const m = buildMessages('Wie lang ist die Probezeit?', hits);
    expect(m[1].content).toContain('[1] (' + SAMPLE_NAME + ', page');
    expect(m[1].content).toContain('[2]');
    expect(m[1].content).toContain('Question: Wie lang ist die Probezeit?');
  });
});

describe('answer checks', () => {
  const hits = search(index, 'Kündigungsfrist nach drei Jahren', 3);
  it('maps citations to excerpts and drops invented ones', () => {
    const a = finalizeAnswer('Zwei Monate zum Monatsende [1]. Siehe auch [9].', hits);
    expect(a.notFound).toBe(false);
    expect(a.citations.map(c => c.n)).toEqual([1]);
    expect(a.text).not.toContain('[9]');
  });
  it('attaches the best excerpt when the model cites nothing', () => {
    const a = finalizeAnswer('Zwei Monate zum Monatsende.', hits);
    expect(a.citations).toHaveLength(1);
  });
  it('recognises NOT_FOUND', () => {
    expect(finalizeAnswer('NOT_FOUND', hits).notFound).toBe(true);
    expect(finalizeAnswer('  ', hits).notFound).toBe(true);
  });
  it('flags figures that are not in the cited text', () => {
    expect(unverifiedFigures('Die Frist beträgt 3 Monate [1].', ['nach fünf Jahren auf drei Monate'])).toEqual(['3']);
    expect(unverifiedFigures('Der Urlaub beträgt 28 Tage [1].', ['beträgt 28 Arbeitstage'])).toEqual([]);
    expect(unverifiedFigures('Gehalt 4.800 Euro [1]', ['Das Gehalt beträgt 4,800 Euro'])).toEqual([]);
  });
});
