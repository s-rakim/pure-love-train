import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DayKind } from '../lib/cycle';
import { fromKey, monthGrid, monthLabel, type DateKey } from '../lib/dates';
import { colors, fonts, radius } from '../theme';
import { tap } from './ui';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthCalendar({
  map,
  today,
  selected,
  logged,
  onSelect,
}: {
  map: Record<DateKey, DayKind>;
  today: DateKey;
  selected?: DateKey;
  logged: Record<DateKey, unknown>;
  onSelect: (key: DateKey) => void;
}) {
  const t = fromKey(today);
  const [cursor, setCursor] = useState({ year: t.getFullYear(), month: t.getMonth() });
  const cells = monthGrid(cursor.year, cursor.month);

  const shift = (delta: number) => {
    tap();
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <View>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Previous month" hitSlop={12} onPress={() => shift(-1)}>
          <Ionicons name="chevron-back" size={22} color={colors.inkSoft} />
        </Pressable>
        <Text style={styles.month}>{monthLabel(cursor.year, cursor.month)}</Text>
        <Pressable accessibilityLabel="Next month" hitSlop={12} onPress={() => shift(1)}>
          <Ionicons name="chevron-forward" size={22} color={colors.inkSoft} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`w${i}`} style={styles.weekday}>{d}</Text>
        ))}
        {cells.map((key, i) => {
          if (!key) return <View key={`e${i}`} style={styles.cell} />;
          const kind = map[key];
          const isToday = key === today;
          const isSelected = key === selected;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${key}${kind ? `, ${kind}` : ''}`}
              onPress={() => {
                tap();
                onSelect(key);
              }}
              style={styles.cell}
            >
              <View
                style={[
                  styles.day,
                  kind && dayStyles[kind],
                  isToday && styles.today,
                  isSelected && styles.selected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    (kind === 'period' || kind === 'ovulation') && { color: colors.white },
                    kind === 'predicted' && { color: colors.flameDeep },
                  ]}
                >
                  {fromKey(key).getDate()}
                </Text>
              </View>
              {logged[key] ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <Legend color={colors.flame} label="Period" />
        <Legend color={colors.flameSoft} border={colors.flame} label="Predicted" />
        <Legend color={colors.fertile} label="Fertile" />
        <Legend color={colors.plum} label="Ovulation" />
      </View>
    </View>
  );
}

function Legend({ color, label, border }: { color: string; label: string; border?: string }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          { backgroundColor: color },
          border && { borderWidth: 1.5, borderColor: border, borderStyle: 'dashed' },
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const dayStyles = StyleSheet.create({
  period: { backgroundColor: colors.flame },
  predicted: {
    backgroundColor: colors.flameSoft,
    borderWidth: 1.5,
    borderColor: colors.flame,
    borderStyle: 'dashed',
  },
  fertile: { backgroundColor: colors.fertile },
  ovulation: { backgroundColor: colors.plum },
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  month: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.muted,
    marginBottom: 6,
  },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: {
    width: '84%',
    aspectRatio: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: { borderWidth: 2, borderColor: colors.ink },
  selected: { transform: [{ scale: 1.08 }], borderWidth: 2, borderColor: colors.ember },
  dayText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  dot: {
    position: 'absolute',
    bottom: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.inkSoft,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
});
