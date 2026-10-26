import React from 'react';
import {ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Button} from '../ui/Button';
import {c, type} from '../ui/theme';
import {MODEL} from '../config';

export function WelcomeScreen({onStart}: {onStart: () => void}) {
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <StatusBar barStyle="dark-content" backgroundColor={c.bg} />
      <Text style={type.display}>Ask your paperwork.</Text>
      <Text style={[type.body, {marginTop: 12}]}>
        Add contracts, insurance letters and payslips. Ask in your own words and get the answer with
        the passage it came from. Everything stays on this phone.
      </Text>

      <View style={s.sheet} accessible accessibilityLabel="Example answer with source">
        <Text style={s.q}>Can I terminate early after three years?</Text>
        <Text style={[type.body, {marginTop: 8}]}>
          Two months to the end of a month, not the four weeks in the main clause.
        </Text>
        <View style={s.chip}>
          <Text style={s.chipNum}>1</Text>
          <Text style={type.small}>Employment contract · p. 3 · § 14</Text>
        </View>
      </View>

      <Button label="Get started" onPress={onStart} style={{marginTop: 28}} />
      <Text style={[type.small, {marginTop: 12}]}>
        First use downloads the language model once (about {MODEL.approxGB} GB). Use Wi-Fi. After
        that the app works without internet.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: c.bg},
  content: {padding: 24, paddingTop: 64, paddingBottom: 40},
  sheet: {
    marginTop: 32,
    backgroundColor: c.sheet,
    borderRadius: 6,
    padding: 18,
    borderTopWidth: 6,
    borderTopColor: c.yellow,
    elevation: 2,
  },
  q: {...type.small, color: c.slate},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: c.ink,
    borderRadius: 4,
    padding: 6,
    marginTop: 12,
  },
  chipNum: {
    ...type.small,
    color: c.ink,
    backgroundColor: c.yellow,
    paddingHorizontal: 6,
    marginRight: 8,
    overflow: 'hidden',
  },
});
