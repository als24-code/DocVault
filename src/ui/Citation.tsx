import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Citation as CitationT} from '../core/types';
import {c, font, type} from './theme';

export function CitationChip({cite}: {cite: CitationT}) {
  const [open, setOpen] = useState(false);
  const heading = cite.chunk.text.split('\n')[0];
  const showHeading = /^§|^\d/.test(heading) && heading.length < 70;
  return (
    <View style={s.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Source ${cite.n}: ${cite.chunk.docName}, page ${cite.chunk.page}`}
        accessibilityState={{expanded: open}}
        onPress={() => setOpen(o => !o)}
        style={s.chip}>
        <Text style={s.chipNum}>{cite.n}</Text>
        <Text style={s.chipText} numberOfLines={1}>
          {cite.chunk.docName} · p. {cite.chunk.page}
          {showHeading ? ` · ${heading.split(' ').slice(0, 2).join(' ')}` : ''}
        </Text>
      </Pressable>
      {open && (
        <View style={s.excerpt}>
          <Text style={s.excerptText}>{cite.chunk.text}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {marginTop: 8},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: c.ink,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    maxWidth: '100%',
    minHeight: 36,
  },
  chipNum: {
    fontFamily: font.medium,
    fontSize: 12,
    color: c.ink,
    backgroundColor: c.yellow,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  chipText: {...type.small, color: c.ink, flexShrink: 1},
  excerpt: {
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: c.yellow,
    backgroundColor: c.yellowSoft,
    padding: 10,
  },
  excerptText: {...type.small, color: c.ink, lineHeight: 19},
});
