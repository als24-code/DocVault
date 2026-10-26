import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {DlState} from '../services/downloader';
import {Button} from '../ui/Button';
import {ProgressBar} from '../ui/ProgressBar';
import {c, type} from '../ui/theme';
import {MODEL} from '../config';

const mb = (n: number) => (n / 1024 / 1024).toFixed(0);

function eta(s: DlState) {
  if (!s.bytesPerSec || !s.total) return '';
  const secs = (s.total - s.received) / s.bytesPerSec;
  if (!isFinite(secs) || secs <= 0) return '';
  return secs > 90 ? ` · about ${Math.round(secs / 60)} min left` : ' · under 2 min left';
}

type Props = {
  state: DlState;
  onStart: () => void;
  onPause: () => void;
  onDone: () => void;
};

export function SetupScreen({state, onStart, onPause, onDone}: Props) {
  const {status} = state;
  const pct = state.total ? state.received / state.total : 0;
  const busy = status === 'downloading';
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={type.title}>One-time download</Text>
      <Text style={[type.body, {marginTop: 8}]}>
        The language model runs on your phone, so your documents never leave it. It is stored in the
        app and is only downloaded once.
      </Text>

      <View style={s.card}>
        <Text style={type.label}>{MODEL.name}</Text>
        <Text style={type.small}>
          {MODEL.quant} · about {MODEL.approxGB} GB
        </Text>

        <View style={{marginTop: 18}}>
          <ProgressBar value={status === 'ready' ? 1 : pct} />
          <Text style={[type.small, {marginTop: 8}]} accessibilityLiveRegion="polite">
            {status === 'ready'
              ? 'Downloaded'
              : state.received > 0
              ? `${mb(state.received)} MB${state.total ? ` of ${mb(state.total)} MB` : ''}${
                  busy && state.bytesPerSec ? ` · ${(state.bytesPerSec / 1024 / 1024).toFixed(1)} MB/s` : ''
                }${busy ? eta(state) : ''}`
              : 'Not downloaded yet'}
          </Text>
        </View>

        {!!state.error && <Text style={s.error}>{state.error}</Text>}
      </View>

      <View style={{marginTop: 24}}>
        {status === 'ready' ? (
          <Button label="Open my vault" onPress={onDone} />
        ) : busy ? (
          <Button label="Pause" kind="quiet" onPress={onPause} />
        ) : (
          <Button
            label={status === 'paused' ? 'Resume download' : status === 'error' ? 'Try again' : 'Download model'}
            onPress={onStart}
            disabled={status === 'checking'}
          />
        )}
      </View>

      <Text style={[type.small, {marginTop: 16}]}>
        If the connection drops, the download continues from where it stopped. Keep the screen on
        while it runs.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: c.bg},
  content: {padding: 24, paddingTop: 64},
  card: {marginTop: 24, backgroundColor: c.sheet, borderRadius: 6, padding: 18, elevation: 2},
  error: {...type.small, color: c.danger, marginTop: 12},
});
