// Jest mock for the NativeCounter TurboModule spec. The real spec calls
// TurboModuleRegistry.getEnforcing at module load, which fails in Node-side
// tests because the native binary isn't loaded. This mock provides a
// JS-only stub so tests that pull in the screen can still mount.

type Listener = (value: number) => void;

let value = 0;
const listeners = new Set<Listener>();

const emit = () => {
  listeners.forEach(l => l(value));
};

export default {
  increment(): number {
    value += 1;
    emit();
    return value;
  },
  decrement(): number {
    if (value > 0) value -= 1;
    emit();
    return value;
  },
  reset(): void {
    value = 0;
    emit();
  },
  getValue(): number {
    return value;
  },
  onChange: (listener: Listener) => {
    listeners.add(listener);
    return {
      remove: () => {
        listeners.delete(listener);
      },
    };
  },
};
