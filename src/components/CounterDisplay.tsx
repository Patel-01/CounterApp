import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRenderCount } from '../utils/useRenderCount';

type Props = {
  value: number;
  isResetting: boolean;
};

function CounterDisplayBase({ value, isResetting }: Props) {
  useRenderCount('CounterDisplay');
  return (
    <View style={styles.container}>
      <Text style={styles.value} accessibilityRole="text" testID="counter-value">
        {value}
      </Text>
      <Text style={styles.status}>
        {isResetting ? 'resetting…' : ' '}
      </Text>
    </View>
  );
}

export const CounterDisplay = memo(CounterDisplayBase);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  value: {
    fontSize: 96,
    fontVariant: ['tabular-nums'],
    fontWeight: '300',
  },
  status: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
    height: 18,
  },
});
