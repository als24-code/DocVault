import React, {useCallback, useEffect, useState} from 'react';
import {Alert, BackHandler, Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {errorCodes, isErrorWithCode, pick, types} from '@react-native-documents/picker';
import {VaultDoc} from './src/core/types';
import {DlState} from './src/services/downloader';
import {modelDownloader} from './src/services/modelStore';
import * as llm from './src/services/llm';
import {loadDocs, saveDocs} from './src/services/storage';
import {docFromText, importPicked} from './src/services/ingest';
import {SAMPLE_CONTRACT, SAMPLE_NAME} from './src/sample/contract';
import {WelcomeScreen} from './src/screens/WelcomeScreen';
import {SetupScreen} from './src/screens/SetupScreen';
import {DocsScreen} from './src/screens/DocsScreen';
import {AskScreen, LlmState} from './src/screens/AskScreen';
import {AddSheet} from './src/screens/AddSheet';
import {c, font} from './src/ui/theme';

type Stage = 'boot' | 'welcome' | 'setup' | 'main';

export default function App() {
  const [stage, setStage] = useState<Stage>('boot');
  const [dl, setDl] = useState<DlState>(modelDownloader.getState());
  const [tab, setTab] = useState<'docs' | 'ask'>('docs');
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [llmState, setLlmState] = useState<LlmState>('loading');
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = modelDownloader.subscribe(setDl);
    (async () => {
      await modelDownloader.check();
      setDocs(await loadDocs());
      setStage(modelDownloader.getState().status === 'ready' ? 'main' : 'welcome');
    })();
    return unsub;
  }, []);

  const startLoad = useCallback(async () => {
    setLlmState('loading');
    try {
      await llm.loadModel(modelDownloader.finalPath);
      setLlmState('ready');
    } catch {
      setLlmState('error');
    }
  }, []);

  useEffect(() => {
    if (stage === 'main') startLoad();
  }, [stage, startLoad]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stage === 'setup') return (setStage('welcome'), true);
      if (stage === 'main' && tab === 'ask') return (setTab('docs'), true);
      return false;
    });
    return () => sub.remove();
  }, [stage, tab]);

  const persist = useCallback(async (next: VaultDoc[]) => {
    setDocs(next);
    await saveDocs(next);
  }, []);

  const addDoc = useCallback(
    async (make: () => Promise<VaultDoc> | VaultDoc) => {
      setAddError(null);
      try {
        const doc = await make();
        await persist([doc, ...docs]);
        setSheet(false);
      } catch (e: any) {
        const msg: string = e?.message || 'Could not add this document.';
        setAddError(
          /password/i.test(msg) ? 'This PDF is password protected. Remove the password and try again.' : msg,
        );
      } finally {
        setBusy(null);
      }
    },
    [docs, persist],
  );

  const pickFile = useCallback(async () => {
    try {
      const [file] = await pick({type: [types.pdf, types.images, types.plainText]});
      setBusy('Starting…');
      await addDoc(() => importPicked({uri: file.uri, name: file.name, type: file.type}, setBusy));
    } catch (e) {
      if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) return;
      setBusy(null);
      setAddError('Could not open the file picker.');
    }
  }, [addDoc]);

  const confirmRemove = useCallback(
    (doc: VaultDoc) =>
      Alert.alert('Remove document?', `"${doc.name}" will be removed from this phone.`, [
        {text: 'Keep', style: 'cancel'},
        {text: 'Remove', style: 'destructive', onPress: () => persist(docs.filter(d => d.id !== doc.id))},
      ]),
    [docs, persist],
  );

  if (stage === 'boot') return <View style={{flex: 1, backgroundColor: c.bg}} />;
  if (stage === 'welcome') return <WelcomeScreen onStart={() => setStage('setup')} />;
  if (stage === 'setup') {
    return (
      <SetupScreen
        state={dl}
        onStart={() => modelDownloader.start()}
        onPause={() => modelDownloader.pause()}
        onDone={() => setStage('main')}
      />
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: c.bg}}>
      <StatusBar barStyle="dark-content" backgroundColor={c.bg} />
      <View style={{flex: 1}}>
        {tab === 'docs' ? (
          <DocsScreen
            docs={docs}
            onAdd={() => {
              setAddError(null);
              setSheet(true);
            }}
            onRemove={confirmRemove}
          />
        ) : (
          <AskScreen docs={docs} llmState={llmState} onRetryLoad={startLoad} onGoDocs={() => setTab('docs')} />
        )}
      </View>
      <View style={s.tabs}>
        {(['docs', 'ask'] as const).map(t => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{selected: tab === t}}
            onPress={() => setTab(t)}
            style={[s.tab, tab === t && s.tabOn]}>
            <Text style={[s.tabText, tab === t && {color: c.ink}]}>{t === 'docs' ? 'Documents' : 'Ask'}</Text>
          </Pressable>
        ))}
      </View>
      <AddSheet
        visible={sheet}
        busy={busy}
        error={addError}
        onClose={() => setSheet(false)}
        onPickFile={pickFile}
        onPasteText={(name, text) => addDoc(() => docFromText(name, text))}
        onSample={() => addDoc(() => docFromText(SAMPLE_NAME, SAMPLE_CONTRACT, 'sample'))}
      />
    </View>
  );
}

const s = StyleSheet.create({
  tabs: {flexDirection: 'row', backgroundColor: c.sheet, borderTopWidth: 1, borderTopColor: c.line},
  tab: {flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderTopWidth: 3, borderTopColor: 'transparent'},
  tabOn: {borderTopColor: c.yellow},
  tabText: {fontFamily: font.medium, fontSize: 15, color: c.slate},
});
