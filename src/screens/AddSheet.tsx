import React, {useState} from 'react';
import {ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {Button} from '../ui/Button';
import {c, type} from '../ui/theme';

type Props = {
  visible: boolean;
  busy: string | null; 
  error: string | null;
  onClose: () => void;
  onPickFile: () => void;
  onPasteText: (name: string, text: string) => void;
  onSample: () => void;
};

export function AddSheet({visible, busy, error, onClose, onPickFile, onPasteText, onSample}: Props) {
  const [pasting, setPasting] = useState(false);
  const [name, setName] = useState('');
  const [text, setText] = useState('');

  const close = () => {
    if (busy) return;
    setPasting(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={s.scrim} onPress={close} accessibilityLabel="Close" />
      <View style={s.sheet}>
        {busy ? (
          <View style={s.busy} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={c.ink} />
            <Text style={[type.label, {marginTop: 16}]}>{busy}</Text>
            <Text style={[type.small, {marginTop: 4, textAlign: 'center'}]}>
              Reading happens on your phone. Longer PDFs take a little while.
            </Text>
          </View>
        ) : pasting ? (
          <>
            <Text style={type.title}>Paste text</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name, e.g. Letter from insurer"
              placeholderTextColor={c.slate}
              style={s.input}
              accessibilityLabel="Document name"
            />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Paste the text here"
              placeholderTextColor={c.slate}
              multiline
              textAlignVertical="top"
              style={[s.input, {height: 180}]}
              accessibilityLabel="Document text"
            />
            {!!error && <Text style={s.error}>{error}</Text>}
            <View style={s.actions}>
              <Button label="Back" kind="quiet" onPress={() => setPasting(false)} style={{flex: 1}} />
              <Button
                label="Save"
                disabled={text.trim().length < 20}
                onPress={() => onPasteText(name.trim() || 'Pasted text', text)}
                style={{flex: 1}}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={type.title}>Add a document</Text>
            {!!error && <Text style={s.error}>{error}</Text>}
            <View style={s.stack}>
              <Button label="Choose PDF, photo or text file" onPress={onPickFile} />
              <Button label="Paste text" kind="quiet" onPress={() => setPasting(true)} />
              <Button label="Try the sample contract" kind="quiet" onPress={onSample} />
            </View>
            <Text style={[type.small, {marginTop: 12}]}>
              Files are read on this phone and not uploaded anywhere.
            </Text>
          </>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: {flex: 1, backgroundColor: 'rgba(22,32,44,0.45)'},
  sheet: {backgroundColor: c.sheet, padding: 22, paddingBottom: 28, borderTopLeftRadius: 14, borderTopRightRadius: 14},
  stack: {marginTop: 18, gap: 10},
  busy: {alignItems: 'center', paddingVertical: 28},
  input: {
    ...type.body,
    borderWidth: 1.5,
    borderColor: c.line,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  actions: {flexDirection: 'row', gap: 10, marginTop: 14},
  error: {...type.small, color: c.danger, marginTop: 10},
});
