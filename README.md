# CounterApp

React Native counter assignment — single-screen counter with non-trivial behaviors, plus a C++ TurboModule re-implementation of the same logic over JSI.

> **For reviewers:** the work is split across three stacked PRs against a `review-base` branch (the bare React Native bootstrap). Each PR maps to a section of the assignment so you can review one slice at a time. All three are open, mergeable, and tested.

## Branch / PR → assignment map

| PR | Branch | Assignment items | What it adds |
| --- | --- | --- | --- |
| [#1](https://github.com/Patel-01/CounterApp/pull/1) | `feat/counter-core` | §1, §2, §3, §4 (all four behaviors), §5, §6 | TS RN app, single-screen UI, `useReducer` counter logic, all four §4 behaviors, memoized children, accessibility, reducer unit tests |
| [#2](https://github.com/Patel-01/CounterApp/pull/2) | `feat/history-and-long-press` | §9 (optional improvements) | History strip of recent values (with stable React keys), long-press repeat on `+`, dev-only render-count logger |
| [#3](https://github.com/Patel-01/CounterApp/pull/3) | `feat/turbomodule-cpp-counter` | §10, §11 | C++ counter logic, codegen Spec, JSI bridge, iOS + Android wiring, `useNativeCounter` hook over `useSyncExternalStore`, UI fully driven by native |

`main` contains the merged JS-only counter (PRs #1 + #2). The TurboModule (PR #3) is intentionally kept on its own branch because §10 is the advanced section.

```
review-base ──► feat/counter-core ──► feat/history-and-long-press ──► feat/turbomodule-cpp-counter
   (bare RN)        (PR #1)                    (PR #2)                          (PR #3)
```

## Running the app

```sh
# Install JS deps
npm install

# iOS — first run only, or after native dep changes
bundle install
bundle exec pod install --project-directory=ios

# Start Metro
npm start

# In a second terminal — run on a simulator/device
npm run ios       # or
npm run android

# Run the test suite (the JS reducer has full unit coverage)
npm test
```

The TurboModule branch additionally runs codegen as part of the iOS pod install / Android Gradle build — no manual step required.

## §8 — Architecture (JS implementation, on `main`)

### How the logic is structured
- **`src/hooks/useCounter.ts`** owns all counter state and behavior. The reducer is exported as a pure function so it can be tested directly without rendering. The component tree is purely presentational.
- State is managed with `useReducer`, not multiple `useState`s, because the four §4 behaviors share state (`value`, `incrementCount`, `isResetting`, `history`, `nextHistoryId`) and need to transition atomically — for example, an increment while a gradual reset is in flight has to both bump the value *and* cancel the reset.
- A small `useState`-backed `interactionTick` is bumped on every user action. It exists only to restart the idle-timer effect without changing the dispatchable callbacks' identity, so the children stay memoized.
- The components are thin and `memo`'d:
  - `CounterScreen` — composition only.
  - `CounterDisplay` — number + status (re-renders only on `value` / `isResetting` change).
  - `CounterButtons` — three buttons with stable handlers; long-press logic for `+`. Each button carries `accessibilityLabel` and `accessibilityState` so screen readers announce intent and disabled state.
  - `HistoryStrip` — chip strip rendered from `state.history`; each entry has a stable `id` for React keys (so chips don't remount when new values shift older entries down).

### Where state is stored, and why
- All counter state lives in the `useCounter` hook (component-local). No global store — the screen is single-purpose, and global state would add complexity for no win.
- `history` lives next to `value` in the same reducer because each transition that changes `value` also has to push to history; coupling them avoids drift.
- The render-count logger (`useRenderCount`) keeps a `useRef` for the per-render counter and logs **inside `useEffect`** (after commit) — logging during render would fire twice in Strict Mode and report misleading numbers.

### §4 behaviors (all four implemented)
| Behavior | Implementation |
| --- | --- |
| 5th-increment +5 bonus | `incrementCount % 5 === 0 ? 5 : 1` inside the `INCREMENT` reducer |
| Decrement floor at 0 | `DECREMENT` is a no-op when `value === 0`; the button is also disabled |
| Idle auto-decrement (4 s, then every 1 s) | Effect keyed on `interactionTick` — sets a `setTimeout(IDLE_MS)` that arms a `setInterval(AUTO_DECREMENT_INTERVAL_MS)` |
| Gradual reset (60 ms tick) | `RESET_START` flips `isResetting`; an effect runs `setInterval(GRADUAL_RESET_TICK_MS)` of `TICK_DOWN` actions until value reaches 0 or another action cancels |

### Edge cases handled
- **Reset during increment burst** — `RESET_START` zeros `incrementCount` and sets `isResetting`; the next increment cancels the reset (`isResetting: false`) without losing the bonus cadence (count starts fresh from 0).
- **Decrement at 0** — no-op, also clears any stale `isResetting` flag.
- **Rapid clicks** — handlers are stable identities; reducer is pure; idle timer is restarted via `interactionTick` only after dispatch, so the timer always reflects the latest interaction.
- **Pressable.onPress passes a `GestureResponderEvent`** — `increment(amount?)` validates that `amount` is a finite positive number, otherwise falls back to a single tick. Without this, the synthetic event would be treated as the burst count and the reducer's loop would never iterate.
- **Unmount during gradual reset / idle countdown** — both effects return cleanups for their `setInterval` / `setTimeout`.

### Tradeoffs
- **`useReducer` over Redux/Zustand**: the assignment's §7 says "keep dependencies minimal". `useReducer` is built-in and fits a single screen. If the app grew past one screen, a real store would be the next step.
- **Single hook over hook-per-behavior**: I considered splitting `useGradualReset` and `useIdleAutoDecrement` into separate hooks, but they need to coordinate — when a reset starts, the idle countdown must pause, and vice-versa. Splitting would have meant exposing more shared state, so I kept them as effects within the same hook.
- **No memoization library** (e.g. `reselect`): values are primitives and the tree is small; React's built-in `memo` + stable `useCallback` is enough. React Compiler v1.0 (GA Oct 2025) would auto-memoize and make most of the manual `memo`/`useCallback` redundant — the manual form is left in place here for visibility into how memoization is reasoned about.

### Tests
`__tests__/useCounter.test.ts` covers the pure reducer with 16 cases — all four §4 behaviors, decrement floor, reset no-op at zero, tick-down clearing isResetting, history capping, and id stability.

## §11 — TurboModule architecture (on `feat/turbomodule-cpp-counter`)

### How the TurboModule is implemented

```
JS UI (CounterScreen) ──► useNativeCounter (useSyncExternalStore)
                            │
                            ▼
                    src/specs/NativeCounter.ts
                            │   TurboModuleRegistry.getEnforcing<Spec>('NativeCounter')
                            ▼
            Codegen-generated NativeCounterCxxSpec  ◄── shared/cpp/NativeCounterModule (subclass)
                            │   bridges JSI calls to plain C++
                            ▼
                    shared/cpp/Counter
                    pure C++ — mutex + atomic epoch + condvar timer thread
```

- **Spec (`src/specs/NativeCounter.ts`)** — declares `increment / decrement / reset / getValue` plus `readonly onChange: EventEmitter<number>`. Codegen consumes this and generates `AppSpecsJSI.h` (the C++ side) and the JS shim.
- **Pure C++ logic (`shared/cpp/Counter.{h,cpp}`)** — no JSI dependency, easy to unit-test, reusable across platforms. Holds `value_`, `incrementCount_`, `lastInteraction_`, `timerMode_` (Idle / GradualReset). All access is under a `std::mutex`. A dedicated `std::thread` runs `timerLoop()` and uses a `std::condition_variable` plus an atomic `timerEpoch_` to coalesce / interrupt waits when state changes (e.g. user taps during a gradual reset). `Counter::shutdownTimer()` is idempotent and stops/joins the timer thread before the listener target becomes invalid.
- **JSI bridge (`shared/cpp/NativeCounterModule.{h,cpp}`)** — subclasses the codegen-generated `NativeCounterCxxSpec`. On construction it installs a `Counter::Listener` whose body is `emitOnChange(static_cast<double>(value))`, so every committed value change fans out as an `onChange` event to JS. On destruction it calls `counter_.shutdownTimer()` to ensure no in-flight tick can fire on a partially-destroyed module.
- **JS subscription (`src/hooks/useNativeCounter.ts`)** — uses React 18's `useSyncExternalStore` to subscribe to `NativeCounter.onChange`. The native module is the single source of truth for `value`; recent-value history is derived UI-side from observed values. `CounterScreen` consumes this hook and the JS reducer is no longer rendered on this branch.
- **iOS registration** — `shared/ios/CounterAppRegistration.mm` uses Obj-C++ `+load` to call `registerNativeCounterModule()` once at process load, avoiding a Swift ↔ C++ bridging header.
- **Android registration** — `android/app/src/main/jni/OnLoad.cpp` overrides the default `cxxModuleProvider` to map `"NativeCounter"` → `NativeCounterModule`, falling through to autolinking otherwise.
- **Build wiring** — `CounterShared.podspec` + `Podfile` for iOS; `externalNativeBuild` block + custom `CMakeLists.txt` linking `react_codegen_AppSpecs` for Android. Codegen config lives in `package.json` `codegenConfig`.

### How data flows between native and JS
1. **JS → native (commands)** — UI calls `NativeCounter.increment()`. The JS shim invokes the JSI method, which calls `NativeCounterModule::increment(rt)`, which calls `counter_.increment()` on the pure-C++ object. The new value is returned synchronously as a `double` and also fired through the listener.
2. **Native → JS (state changes)** — every time `Counter` mutates `value_` (whether from a JS-initiated call or from a timer-thread tick), it invokes the installed `Listener` outside the mutex. That listener calls `emitOnChange(value)` on the codegen base class, which dispatches an `onChange` event to JS through `CallInvoker` (so the listener thread is decoupled from the JS thread).
3. **JS subscription** — `useNativeCounter` registers a single subscriber via `useSyncExternalStore`. Each `onChange` pulse calls React's notify callback; React then re-reads `getValue()` and re-renders the components that depend on the new value.

### Key differences between the JS and native implementations

| Aspect | JS implementation (`useCounter`) | C++ TurboModule |
| --- | --- | --- |
| State location | React component (`useReducer`) | Native `Counter` object held by the module instance, lives across re-renders |
| Concurrency model | Single-threaded JS, timers via `setInterval` / `setTimeout` | Worker `std::thread` + `condition_variable` + atomic epoch for cancellation |
| Idle / gradual-reset timers | Two `useEffect` blocks, restarted by deps | One `timerLoop()` that switches between Idle / GradualReset modes |
| Data shape exposed | Plain JS object with `value`, `history`, `isResetting`, `incrementCount` | JSI methods + `onChange(number)`. History is *not* exposed natively (kept as a UI-side concern); `isResetting` is also UI-side / inferable |
| Mutation atomicity | Reducer transitions are atomic by construction | `std::mutex` around every `value_` / `incrementCount_` / `timerMode_` mutation |
| Lifecycle | Tied to component mount/unmount | Module instance lives until React tears it down; module destructor calls `Counter::shutdownTimer()` to stop and join the timer thread before the listener target becomes invalid |
| Where the §4 behaviors live | TS reducer + effects | C++ `Counter` class — same constants ported (`kIdleDelay = 4 s`, `kAutoDecrementInterval = 1 s`, `kGradualResetTick = 60 ms`, `kFifthBonus = 5`) |
| Platform reach | JS only | Same `shared/cpp/` source compiled into iOS via CocoaPods, into Android via CMake — single source of truth |

## Status

- §1–§6 (core counter): ✅ done, on `main` via PR #1.
- §9 (optional improvements: history, long-press, render logging): ✅ done, on `main` via PR #2.
- §10 (TurboModule + JSI, JS-only-handles-UI): ✅ done on `feat/turbomodule-cpp-counter` via PR #3. `CounterScreen` consumes `useNativeCounter`; the C++ module is the single source of truth for `value`.
- §11 (README writeup of the native architecture): ✅ this document.
- Tests: `__tests__/useCounter.test.ts` covers the JS reducer (16 cases). The TurboModule branch additionally provides a Jest mock at `src/specs/__mocks__/NativeCounter.ts` so the rewired `App.test.tsx` snapshot can mount without `TurboModuleRegistry.getEnforcing` blowing up.

## Repo

Public mirror of the assignment: <https://github.com/Patel-01/CounterApp>.
