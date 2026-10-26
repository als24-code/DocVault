import React, {useCallback, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {finalizeAnswer} from '../core/answer';
import {buildIndex, isAnswerable, search} from '../core/retrieval';
import {Answer, VaultDoc} from '../core/types';
import {LLM} from '../config';
import * as llm from '../services/llm';
import {SAMPLE_QUESTIONS} from '../sample/contract';
import {Button} from '../ui/Button';
import {CitationChip} from '../ui/Citation';
import {c, type} from '../ui/theme';

export type LlmState = 'loading' | 'ready' | 'error';

type Msg =
  | {id: number; role: 'user'; text: string}
  | {id: number; role: 'assistant'; streaming?: string; answer?: Answer; refused?: boolean; failed?: string};

type Props = {
  docs: VaultDoc[];
  llmState: LlmState;
  onRetryLoad: () => void;
  onGoDocs: () => void;
};

export function AskScreen({docs, llmState, onRetryLoad, onGoDocs}: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const list = useRef<FlatList<Msg>>(null);

  const index = useMemo(() => buildIndex(docs.flatMap(d => d.chunks)), [docs]);
  const hasSample = docs.some(d => d.kind === 'sample');

  const patch = useCallback((id: number, p: Partial<Extract<Msg, {role: 'assistant'}>>) => {
    setMsgs(m => m.map(x => (x.id === id && x.role === 'assistant' ? {...x, ...p} : x)));
  }, []);

  const send = useCallback(
    async (q: string) => {
      const question = q.trim();
      if (!question || busy || llmState !== 'ready') return;
      setInput('');
      const uid = nextId.current++;
      const aid = nextId.current++;
      setMsgs(m => [...m, {id: uid, role: 'user', text: question}, {id: aid, role: 'assistant'}]);
      const hits = search(index, question, LLM.topK);
      // Nothing in the documents resembles the question: answer instantly
      // instead of letting a small model guess.
      if (!isAnswerable(hits)) {
        patch(aid, {refused: true});
        return;
      }
      setBusy(true);
      try {
        const raw = await llm.ask(question, hits, text => patch(aid, {streaming: text}));
        patch(aid, {streaming: undefined, answer: finalizeAnswer(raw, hits)});
      } catch (e: any) {
        patch(aid, {streaming: undefined, failed: e?.message || 'Something went wrong. Please try again.'});
      } finally {
        setBusy(false);
      }
    },
    [busy, index, llmState, patch],
  );

  if (!docs.length) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={type.title}>Add a document first</Text>
        <Text style={[type.body, {marginTop: 8, textAlign: 'center'}]}>
          Questions are answered from your documents only.
        </Text>
        <Button label="Go to documents" onPress={onGoDocs} style={{marginTop: 20}} />
      </View>
    );
  }

  const header =
    llmState === 'loading' ? (
      <View style={s.banner} accessibilityLiveRegion="polite">
        <ActivityIndicator color={c.ink} />
        <Text style={[type.small, {color: c.ink, marginLeft: 10}]}>Loading the model…</Text>
      </View>
    ) : llmState === 'error' ? (
      <View style={[s.banner, {backgroundColor: c.warnSoft}]}>
        <Text style={[type.small, {color: c.ink, flex: 1}]}>The model could not start. The file may be damaged.</Text>
        <Pressable onPress={onRetryLoad} accessibilityRole="button" style={s.retry}>
          <Text style={type.label}>Retry</Text>
        </Pressable>
      </View>
    ) : null;

  return (
    <View style={s.root}>
      {header}
      <FlatList
        ref={list}
        data={msgs}
        keyExtractor={m => String(m.id)}
        contentContainerStyle={s.list}
        onContentSizeChange={() => list.current?.scrollToEnd({animated: true})}
        ListEmptyComponent={
          <View>
            <Text style={type.title}>Ask a question</Text>
            <Text style={[type.small, {marginTop: 6}]}>
              Ask in the same language as your document. Each answer shows where it came from.
            </Text>
            {hasSample &&
              SAMPLE_QUESTIONS.map(q => (
                <Pressable
                  key={q}
                  accessibilityRole="button"
                  onPress={() => send(q)}
                  disabled={llmState !== 'ready'}
                  style={[s.suggest, llmState !== 'ready' && {opacity: 0.5}]}>
                  <Text style={type.body}>{q}</Text>
                </Pressable>
              ))}
          </View>
        }
        renderItem={({item}) =>
          item.role === 'user' ? (
            <View style={s.userBubble}>
              <Text style={type.body}>{item.text}</Text>
            </View>
          ) : (
            <AssistantBubble m={item} />
          )
        }
      />
      <View style={s.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your documents"
          placeholderTextColor={c.slate}
          style={s.input}
          multiline
          editable={!busy}
          accessibilityLabel="Question"
          onSubmitEditing={() => send(input)}
        />
        {busy ? (
          <Button label="Stop" kind="quiet" onPress={() => llm.stop()} style={s.sendBtn} />
        ) : (
          <Button
            label="Ask"
            onPress={() => send(input)}
            disabled={!input.trim() || llmState !== 'ready'}
            style={s.sendBtn}
          />
        )}
      </View>
    </View>
  );
}

function AssistantBubble({m}: {m: Extract<Msg, {role: 'assistant'}>}) {
  const a = m.answer;
  return (
    <View style={s.botBubble}>
      {m.refused || a?.notFound ? (
        <>
          <Text style={type.body}>I can't find that in your documents.</Text>
          <Text style={[type.small, {marginTop: 4}]}>
            Try other words from the document, or add the document that covers it.
          </Text>
        </>
      ) : m.failed ? (
        <Text style={[type.body, {color: c.danger}]}>{m.failed}</Text>
      ) : a ? (
        <>
          <Text style={type.body} selectable>
            {a.text}
          </Text>
          {a.unverifiedFigures.length > 0 && (
            <View style={s.warn}>
              <Text style={[type.small, {color: c.ink}]}>
                Check {a.unverifiedFigures.join(', ')} in the source. {a.unverifiedFigures.length > 1 ? 'These numbers do' : 'This number does'} not
                appear word for word there.
              </Text>
            </View>
          )}
          {a.citations.map(ci => (
            <CitationChip key={ci.n} cite={ci} />
          ))}
        </>
      ) : (
        <Text style={type.body}>{m.streaming || '…'}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: c.bg},
  center: {alignItems: 'center', justifyContent: 'center', padding: 32},
  list: {padding: 16, paddingTop: 56, flexGrow: 1},
  banner: {flexDirection: 'row', alignItems: 'center', backgroundColor: c.yellowSoft, paddingVertical: 10, paddingHorizontal: 16, paddingTop: 40},
  retry: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 12},
  suggest: {backgroundColor: c.sheet, borderRadius: 6, padding: 14, marginTop: 10, borderLeftWidth: 4, borderLeftColor: c.yellow},
  userBubble: {alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: c.yellow, borderRadius: 12, borderBottomRightRadius: 3, padding: 12, marginBottom: 10},
  botBubble: {alignSelf: 'flex-start', maxWidth: '92%', backgroundColor: c.sheet, borderRadius: 12, borderTopLeftRadius: 3, padding: 14, marginBottom: 14, elevation: 1},
  warn: {marginTop: 10, backgroundColor: c.warnSoft, padding: 8, borderRadius: 4},
  inputBar: {flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, backgroundColor: c.sheet, borderTopWidth: 1, borderTopColor: c.line},
  input: {...type.body, flex: 1, maxHeight: 120, minHeight: 52, borderWidth: 1.5, borderColor: c.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10},
  sendBtn: {minWidth: 76, paddingHorizontal: 14},
});
