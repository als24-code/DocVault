import React from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {VaultDoc} from '../core/types';
import {Button} from '../ui/Button';
import {c, font, type} from '../ui/theme';

const KIND: Record<string, string> = {pdf: 'PDF', image: 'IMG', text: 'TXT', note: 'NOTE', sample: 'DEMO'};

function ago(t: number) {
  const d = Math.floor((Date.now() - t) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}

type Props = {
  docs: VaultDoc[];
  onAdd: () => void;
  onRemove: (doc: VaultDoc) => void;
};

export function DocsScreen({docs, onAdd, onRemove}: Props) {
  return (
    <View style={s.root}>
      <FlatList
        data={docs}
        keyExtractor={d => d.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={<Text style={[type.title, {marginBottom: 16}]}>Documents</Text>}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={type.label}>Nothing here yet</Text>
            <Text style={[type.small, {marginTop: 4}]}>
              Add a contract, letter or payslip. PDFs and photos are read on your phone, so scans
              work too.
            </Text>
          </View>
        }
        renderItem={({item}) => (
          <View style={s.row}>
            <View style={s.badge}>
              <Text style={s.badgeText}>{KIND[item.kind]}</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={type.label} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={type.small}>
                {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'} · {item.chunks.length} passages · {ago(item.addedAt)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name}`}
              onPress={() => onRemove(item)}
              hitSlop={8}
              style={s.remove}>
              <Text style={[type.small, {color: c.danger}]}>Remove</Text>
            </Pressable>
          </View>
        )}
      />
      <View style={s.bar}>
        <Button label="Add document" onPress={onAdd} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: c.bg},
  list: {padding: 20, paddingTop: 56, paddingBottom: 24},
  empty: {backgroundColor: c.sheet, padding: 18, borderRadius: 6},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.sheet,
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  badge: {width: 46, height: 46, borderRadius: 4, borderWidth: 1.5, borderColor: c.ink, alignItems: 'center', justifyContent: 'center'},
  badgeText: {fontFamily: font.medium, fontSize: 11, color: c.ink},
  remove: {minHeight: 44, minWidth: 56, alignItems: 'flex-end', justifyContent: 'center'},
  bar: {padding: 16, backgroundColor: c.bg},
});
