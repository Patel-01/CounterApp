import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  return (
    <View style={styles.row}>
      <CounterButton
        label="−"
        accessibilityLabel="Decrement counter"
        onPress={onDecrement}
        disabled={decrementDisabled}
        testID="btn-decrement"
      />
      <CounterButton
        label="Reset"
        accessibilityLabel="Reset counter to zero"
        onPress={onReset}
        variant="secondary"
        testID="btn-reset"
      />
      <CounterButton
        label="+"
        accessibilityLabel="Increment counter"
        onPress={onIncrement}
        testID="btn-increment"
      />
    </View>
  );
}

type ButtonProps = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  testID?: string;
};

function CounterButton({
  label,
  accessibilityLabel,
  onPress,
  disabled,
  variant = 'primary',
  testID,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
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
