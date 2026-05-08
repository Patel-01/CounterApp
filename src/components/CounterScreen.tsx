import { StyleSheet, Text, View } from 'react-native';
import { useNativeCounter } from '../hooks/useNativeCounter';
import { useRenderCount } from '../utils/useRenderCount';
import { CounterButtons } from './CounterButtons';
import { CounterDisplay } from './CounterDisplay';
import { HistoryStrip } from './HistoryStrip';

export function CounterScreen() {
  useRenderCount('CounterScreen');
  const { value, history, increment, decrement, reset } = useNativeCounter();

  return (
    <View style={styles.root}>
      <View>
        <Text style={styles.title}>Counter</Text>
        <Text style={styles.subtitle}>powered by C++ TurboModule</Text>
      </View>
      <CounterDisplay value={value} isResetting={false} />
      <HistoryStrip history={history} />
      <CounterButtons
        onIncrement={increment}
        onDecrement={decrement}
        onReset={reset}
        decrementDisabled={value === 0}
      />
      <Text style={styles.hint}>
        every 5th + adds 5 · idle 4s auto-decrements · reset eases to 0 · hold
        + to repeat
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 24,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  title: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    letterSpacing: 1,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    letterSpacing: 1,
  },
  hint: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 24,
  },
});
