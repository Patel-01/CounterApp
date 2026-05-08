import { StyleSheet, Text, View } from 'react-native';
import { useCounter } from '../hooks/useCounter';
import { useRenderCount } from '../utils/useRenderCount';
import { CounterButtons } from './CounterButtons';
import { CounterDisplay } from './CounterDisplay';
import { HistoryStrip } from './HistoryStrip';

export function CounterScreen() {
  useRenderCount('CounterScreen');
  const { state, increment, decrement, reset } = useCounter();

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Counter</Text>
      <CounterDisplay value={state.value} isResetting={state.isResetting} />
      <HistoryStrip history={state.history} />
      <CounterButtons
        onIncrement={increment}
        onDecrement={decrement}
        onReset={reset}
        decrementDisabled={state.value === 0}
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
  hint: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 24,
  },
});
