import { useCallback, useEffect, useReducer, useState } from 'react';

export const IDLE_MS = 4000;
export const AUTO_DECREMENT_INTERVAL_MS = 1000;
export const GRADUAL_RESET_TICK_MS = 60;
export const HISTORY_LIMIT = 10;
export const FIFTH_INCREMENT_BONUS = 5;

export type HistoryEntry = { id: number; value: number };

export type CounterState = {
  value: number;
  incrementCount: number;
  isResetting: boolean;
  history: HistoryEntry[];
  nextHistoryId: number;
};

export type CounterAction =
  | { type: 'INCREMENT'; amount: number }
  | { type: 'DECREMENT' }
  | { type: 'RESET_START' }
  | { type: 'TICK_DOWN' };

export const INITIAL_STATE: CounterState = {
  value: 0,
  incrementCount: 0,
  isResetting: false,
  history: [{ id: 0, value: 0 }],
  nextHistoryId: 1,
};

const pushHistory = (
  history: HistoryEntry[],
  nextId: number,
  value: number,
): { history: HistoryEntry[]; nextHistoryId: number } => {
  if (history[0]?.value === value) {
    return { history, nextHistoryId: nextId };
  }
  const next = [{ id: nextId, value }, ...history];
  return {
    history: next.length > HISTORY_LIMIT ? next.slice(0, HISTORY_LIMIT) : next,
    nextHistoryId: nextId + 1,
  };
};

export const counterReducer = (
  state: CounterState,
  action: CounterAction,
): CounterState => {
  switch (action.type) {
    case 'INCREMENT': {
      let { value, incrementCount, history, nextHistoryId } = state;
      for (let i = 0; i < action.amount; i += 1) {
        incrementCount += 1;
        value += incrementCount % 5 === 0 ? FIFTH_INCREMENT_BONUS : 1;
        ({ history, nextHistoryId } = pushHistory(
          history,
          nextHistoryId,
          value,
        ));
      }
      return {
        value,
        incrementCount,
        isResetting: false,
        history,
        nextHistoryId,
      };
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
        ...pushHistory(state.history, state.nextHistoryId, value),
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
        ...pushHistory(state.history, state.nextHistoryId, value),
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

export function useCounter(): CounterApi {
  const [state, dispatch] = useReducer(counterReducer, INITIAL_STATE);
  const [interactionTick, setInteractionTick] = useState(0);

  const increment = useCallback((amount?: number) => {
    setInteractionTick(n => n + 1);
    const burst =
      typeof amount === 'number' && Number.isFinite(amount) && amount > 0
        ? Math.floor(amount)
        : 1;
    dispatch({ type: 'INCREMENT', amount: burst });
  }, []);

  const decrement = useCallback(() => {
    setInteractionTick(n => n + 1);
    dispatch({ type: 'DECREMENT' });
  }, []);

  const reset = useCallback(() => {
    setInteractionTick(n => n + 1);
    dispatch({ type: 'RESET_START' });
  }, []);

  const valueAtZero = state.value === 0;

  useEffect(() => {
    if (!state.isResetting || valueAtZero) return;
    const id = setInterval(
      () => dispatch({ type: 'TICK_DOWN' }),
      GRADUAL_RESET_TICK_MS,
    );
    return () => clearInterval(id);
  }, [state.isResetting, valueAtZero]);

  useEffect(() => {
    if (valueAtZero || state.isResetting) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      dispatch({ type: 'TICK_DOWN' });
      interval = setInterval(
        () => dispatch({ type: 'TICK_DOWN' }),
        AUTO_DECREMENT_INTERVAL_MS,
      );
    }, IDLE_MS);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [interactionTick, state.isResetting, valueAtZero]);

  return { state, increment, decrement, reset };
}
