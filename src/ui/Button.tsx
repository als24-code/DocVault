import React from 'react';
import {Pressable, StyleSheet, Text, ViewStyle} from 'react-native';
import {c, font} from './theme';

type Props = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'quiet' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({label, onPress, kind = 'primary', disabled, style}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{color: kind === 'primary' ? c.yellowDeep : c.line}}
      style={[s.base, s[kind], disabled && s.disabled, style]}>
      <Text style={[s.text, kind === 'danger' && {color: c.danger}]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {minHeight: 52, paddingHorizontal: 22, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  primary: {backgroundColor: c.yellow},
  quiet: {backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.ink},
  danger: {backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.danger},
  disabled: {opacity: 0.45},
  text: {fontFamily: font.medium, fontSize: 16, color: c.ink, fontWeight: '600'},
});
