import {Hit} from './types';

export const NOT_FOUND = 'NOT_FOUND';

export const SYSTEM_PROMPT =
  "You answer questions about the user's own documents. " +
  'Use ONLY the numbered excerpts you are given. ' +
  'After every fact write the excerpt number in square brackets, like [1] or [2]. ' +
  `If the excerpts do not contain the answer, reply with exactly ${NOT_FOUND} and nothing else. ` +
  'Answer in the language of the question, in at most four short sentences. ' +
  'Copy numbers, dates and time periods exactly as written. ' +
  'If two excerpts differ, say which applies to which case. ' +
  'Do not add legal advice or facts that are not in the excerpts.';

export function buildMessages(question: string, hits: Hit[]) {
  const ex = hits
    .map(
      (h, i) =>
        `[${i + 1}] (${h.chunk.docName}, page ${h.chunk.page})\n${h.chunk.text}`,
    )
    .join('\n\n');
  return [
    {role: 'system', content: SYSTEM_PROMPT},
    {
      role: 'user',
      content: `Excerpts:\n\n${ex}\n\nQuestion: ${question.trim()}`,
    },
  ];
}
