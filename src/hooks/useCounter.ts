import { useCallback, useEffect, useReducer } from 'react';

export const IDLE_MS = 4000;
export const AUTO_DECREMENT_INTERVAL_MS = 1000;
export const GRADUAL_RESET_TICK_MS = 60;
export const HISTORY_LIMIT = 10;
export const FIFTH_INCREMENT_BONUS = 5;

export type CounterState = {
  value: number;
  incrementCount: number;
  isResetting: boolean;
  history: number[];
};

type Action =
  | { type: 'INCREMENT'; amount?: number }
  | { type: 'DECREMENT' }
  | { type: 'RESET_START' }
  | { type: 'TICK_DOWN' };

const INITIAL_STATE: CounterState = {
  value: 0,
  incrementCount: 0,
  isResetting: false,
  history: [0],
};

const pushHistory = (history: number[], value: number): number[] => {
  if (history[0] === value) return history;
  const next = [value, ...history];
  return next.length > HISTORY_LIMIT ? next.slice(0, HISTORY_LIMIT) : next;
};

const reducer = (state: CounterState, action: Action): CounterState => {
  switch (action.type) {
    case 'INCREMENT': {
      const bursts = action.amount ?? 1;
      let { value, incrementCount, history } = state;
      for (let i = 0; i < bursts; i += 1) {
        incrementCount += 1;
        const delta = incrementCount % 5 === 0 ? FIFTH_INCREMENT_BONUS : 1;
        value += delta;
        history = pushHistory(history, value);
      }
      return { value, incrementCount, isResetting: false, history };
    }
    case 'DECREMENT': {
      if (state.value === 0) {
        return state.isResetting ? { ...state, isResetting: false } : state;
      }
      const value = state.value - 1;
      return {
        ...state,
        value,
        isResetting: false,
        history: pushHistory(state.history, value),
      };
    }
    case 'RESET_START': {
      if (state.value === 0) {
        return state.incrementCount === 0 && !state.isResetting
          ? state
          : { ...state, incrementCount: 0, isResetting: false };
      }
      return { ...state, incrementCount: 0, isResetting: true };
    }
    case 'TICK_DOWN': {
      if (state.value === 0) {
        return state.isResetting ? { ...state, isResetting: false } : state;
      }
      const value = state.value - 1;
      return {
        ...state,
        value,
        isResetting: state.isResetting && value > 0,
        history: pushHistory(state.history, value),
      };
    }
    default:
      return state;
  }
};

export type CounterApi = {
  state: CounterState;
  increment: (amount?: number) => void;
  decrement: () => void;
  reset: () => void;
};

const interactionReducer = (n: number): number => n + 1;

export function useCounter(): CounterApi {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [interactionTick, bumpInteraction] = useReducer(interactionReducer, 0);

  const increment = useCallback((amount?: number) => {
    bumpInteraction();
    // amount may arrive as a GestureResponderEvent when wired directly to
    // Pressable.onPress. Coerce anything non-numeric to a single tick.
    const burst =
      typeof amount === 'number' && Number.isFinite(amount) && amount > 0
        ? Math.floor(amount)
        : 1;
    dispatch({ type: 'INCREMENT', amount: burst });
  }, []);

  const decrement = useCallback(() => {
    bumpInteraction();
    dispatch({ type: 'DECREMENT' });
  }, []);

  const reset = useCallback(() => {
    bumpInteraction();
    dispatch({ type: 'RESET_START' });
  }, []);

  const valueAtZero = state.value === 0;

  // Gradual reset: tick down every GRADUAL_RESET_TICK_MS until value hits 0
  // or another interaction cancels the reset.
  useEffect(() => {
    if (!state.isResetting || valueAtZero) return;
    const id = setInterval(() => {
      dispatch({ type: 'TICK_DOWN' });
    }, GRADUAL_RESET_TICK_MS);
    return () => clearInterval(id);
  }, [state.isResetting, valueAtZero]);

  // Idle auto-decrement. Wait IDLE_MS after the last interaction, then tick
  // down every AUTO_DECREMENT_INTERVAL_MS until interaction, reset, or zero.
  // Restarts whenever the user interacts (interactionTick changes).
  useEffect(() => {
    if (valueAtZero || state.isResetting) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      dispatch({ type: 'TICK_DOWN' });
      interval = setInterval(() => {
        dispatch({ type: 'TICK_DOWN' });
      }, AUTO_DECREMENT_INTERVAL_MS);
    }, IDLE_MS);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [interactionTick, state.isResetting, valueAtZero]);

  return { state, increment, decrement, reset };
}
