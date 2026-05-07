import { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  history: number[];
};

function HistoryStripBase({ history }: Props) {
  if (history.length <= 1) {
    return <View style={styles.placeholder} />;
  }
  return (
    <View style={styles.container}>
      <Text style={styles.label}>recent</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {history.map((v, i) => (
          <View
            key={`${i}-${v}`}
            style={[styles.chip, i === 0 && styles.chipCurrent]}
          >
            <Text
              style={[styles.chipText, i === 0 && styles.chipTextCurrent]}
            >
              {v}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export const HistoryStrip = memo(HistoryStripBase);

const styles = StyleSheet.create({
  placeholder: {
    height: 56,
  },
  container: {
    height: 56,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 11,
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  row: {
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    minWidth: 32,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
  },
  chipCurrent: {
    backgroundColor: '#1f6feb',
  },
  chipText: {
    fontSize: 13,
    color: '#555',
    fontVariant: ['tabular-nums'],
  },
  chipTextCurrent: {
    color: '#fff',
    fontWeight: '600',
  },
});
