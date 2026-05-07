import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';

export interface Spec extends TurboModule {
  increment(): number;
  decrement(): number;
  reset(): void;
  getValue(): number;
  readonly onChange: EventEmitter<number>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeCounter');
