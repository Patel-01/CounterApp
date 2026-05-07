import { memo, useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRenderCount } from '../utils/useRenderCount';

const LONG_PRESS_DELAY_MS = 400;
const LONG_PRESS_INTERVAL_MS = 80;

type Props = {
  onIncrement: () => void;
  onDecrement: () => void;
  onReset: () => void;
  decrementDisabled?: boolean;
};

function CounterButtonsBase({
  onIncrement,
  onDecrement,
  onReset,
  decrementDisabled,
}: Props) {
  useRenderCount('CounterButtons');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRepeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startRepeatIncrement = useCallback(() => {
    stopRepeat();
    onIncrement();
    intervalRef.current = setInterval(onIncrement, LONG_PRESS_INTERVAL_MS);
  }, [onIncrement, stopRepeat]);

  useEffect(() => stopRepeat, [stopRepeat]);

  return (
    <View style={styles.row}>
      <CounterButton
        label="−"
        onPress={onDecrement}
        disabled={decrementDisabled}
        testID="btn-decrement"
      />
      <CounterButton
        label="Reset"
        onPress={onReset}
        variant="secondary"
        testID="btn-reset"
      />
      <CounterButton
        label="+"
        onPress={onIncrement}
        onLongPress={startRepeatIncrement}
        onPressOut={stopRepeat}
        delayLongPress={LONG_PRESS_DELAY_MS}
        testID="btn-increment"
      />
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  onPressOut?: () => void;
  delayLongPress?: number;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  testID?: string;
};

function CounterButton({
  label,
  onPress,
  onLongPress,
  onPressOut,
  delayLongPress,
  disabled,
  variant = 'primary',
  testID,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      delayLongPress={delayLongPress}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.buttonTextSecondary,
          disabled && styles.buttonTextDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export const CounterButtons = memo(CounterButtonsBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  button: {
    minWidth: 88,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#1f6feb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#eee',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    backgroundColor: '#cfd6dd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#1f6feb',
  },
  buttonTextDisabled: {
    color: '#88909a',
  },
});
