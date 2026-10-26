import React from 'react';
import {View} from 'react-native';
import {c} from './theme';

export function ProgressBar({value}: {value: number}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{min: 0, max: 100, now: Math.round(pct)}}
      style={{height: 10, borderRadius: 5, backgroundColor: c.line, overflow: 'hidden'}}>
      <View style={{width: `${pct}%`, height: '100%', backgroundColor: c.ink}} />
    </View>
  );
}
