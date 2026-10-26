import {Platform} from 'react-native';

export const c = {
  bg: '#E9EDF1',
  sheet: '#FFFFFF',
  ink: '#16202C',
  slate: '#5A6776',
  line: '#CBD3DC',
  yellow: '#F6C400',
  yellowDeep: '#B88F00',
  yellowSoft: '#FFF4C2',
  ok: '#1E7A4C',
  warn: '#9A5B00',
  warnSoft: '#FFF0D6',
  danger: '#B3261E',
};

export const font = {
  serif: Platform.select({android: 'serif', default: 'Georgia'}) as string,
  sans: Platform.select({android: 'sans-serif', default: 'System'}) as string,
  medium: Platform.select({android: 'sans-serif-medium', default: 'System'}) as string,
};

export const type = {
  display: {fontFamily: font.serif, fontSize: 34, lineHeight: 40, color: c.ink, fontWeight: '700' as const},
  title: {fontFamily: font.serif, fontSize: 24, lineHeight: 30, color: c.ink, fontWeight: '700' as const},
  body: {fontFamily: font.sans, fontSize: 16, lineHeight: 23, color: c.ink},
  small: {fontFamily: font.sans, fontSize: 13, lineHeight: 18, color: c.slate},
  label: {fontFamily: font.medium, fontSize: 15, color: c.ink},
};

export const space = (n: number) => n * 4;
