import {
  counterReducer,
  INITIAL_STATE,
  type CounterState,
} from '../src/hooks/useCounter';

describe('counterReducer', () => {
  describe('INCREMENT', () => {
    it('adds 1 normally', () => {
      const s = counterReducer(INITIAL_STATE, { type: 'INCREMENT', amount: 1 });
      expect(s.value).toBe(1);
      expect(s.incrementCount).toBe(1);
    });

    it('every 5th increment adds 5 instead of 1', () => {
      let s: CounterState = INITIAL_STATE;
      for (let i = 0; i < 5; i += 1) {
        s = counterReducer(s, { type: 'INCREMENT', amount: 1 });
      }
      // 1 + 1 + 1 + 1 + 5 = 9
      expect(s.value).toBe(9);
      expect(s.incrementCount).toBe(5);
    });

    it('applies the bonus correctly across a burst', () => {
      const s = counterReducer(INITIAL_STATE, { type: 'INCREMENT', amount: 10 });
      // four +1, one +5, four +1, one +5 = 4 + 5 + 4 + 5 = 18
      expect(s.value).toBe(18);
      expect(s.incrementCount).toBe(10);
    });

    it('cancels a gradual reset in flight', () => {
      const resetting: CounterState = {
        value: 3,
        incrementCount: 0,
        isResetting: true,
      };
      const s = counterReducer(resetting, { type: 'INCREMENT', amount: 1 });
      expect(s.isResetting).toBe(false);
      expect(s.value).toBe(4);
    });
  });

  describe('DECREMENT', () => {
    it('decrements value', () => {
      const s = counterReducer(
        { ...INITIAL_STATE, value: 5 },
        { type: 'DECREMENT' },
      );
      expect(s.value).toBe(4);
    });

    it('does not go below 0', () => {
      const s = counterReducer(INITIAL_STATE, { type: 'DECREMENT' });
      expect(s.value).toBe(0);
    });

    it('clears isResetting at 0', () => {
      const s = counterReducer(
        { value: 0, incrementCount: 0, isResetting: true },
        { type: 'DECREMENT' },
      );
      expect(s.isResetting).toBe(false);
    });
  });

  describe('RESET_START', () => {
    it('flips isResetting when value > 0', () => {
      const s = counterReducer(
        { ...INITIAL_STATE, value: 5, incrementCount: 5 },
        { type: 'RESET_START' },
      );
      expect(s.isResetting).toBe(true);
      expect(s.incrementCount).toBe(0);
      expect(s.value).toBe(5);
    });

    it('is a no-op at value 0 with no pending state', () => {
      const s = counterReducer(INITIAL_STATE, { type: 'RESET_START' });
      expect(s).toBe(INITIAL_STATE);
    });
  });

  describe('TICK_DOWN', () => {
    it('decrements value while resetting', () => {
      const s = counterReducer(
        { value: 5, incrementCount: 0, isResetting: true },
        { type: 'TICK_DOWN' },
      );
      expect(s.value).toBe(4);
      expect(s.isResetting).toBe(true);
    });

    it('clears isResetting when reaching 0', () => {
      const s = counterReducer(
        { value: 1, incrementCount: 0, isResetting: true },
        { type: 'TICK_DOWN' },
      );
      expect(s.value).toBe(0);
      expect(s.isResetting).toBe(false);
    });

    it('is a no-op at 0', () => {
      const s = counterReducer(INITIAL_STATE, { type: 'TICK_DOWN' });
      expect(s).toBe(INITIAL_STATE);
    });
  });
});
