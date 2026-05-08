// Pure-C++ counter logic. No React/JSI dependencies — easy to unit-test in
// isolation and reuse across iOS and Android.

#pragma once

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <functional>
#include <mutex>
#include <thread>

namespace counterapp {

class Counter {
 public:
  using Listener = std::function<void(int64_t)>;

  static constexpr int64_t kFifthBonus = 5;
  static constexpr std::chrono::milliseconds kIdleDelay{4000};
  static constexpr std::chrono::milliseconds kAutoDecrementInterval{1000};
  static constexpr std::chrono::milliseconds kGradualResetTick{60};

  Counter();
  ~Counter();

  Counter(const Counter&) = delete;
  Counter& operator=(const Counter&) = delete;

  int64_t increment();
  int64_t decrement();
  void reset();
  int64_t getValue() const;

  // Stops and joins the timer thread. Idempotent. Call this from the owning
  // module's destructor before the listener target becomes invalid: it
  // guarantees no in-flight listener invocation can race with destruction.
  void shutdownTimer();

  // Replace the change listener. The new listener is invoked synchronously
  // with the current value so subscribers can sync without a separate read.
  void setListener(Listener listener);

 private:
  enum class TimerMode { Idle, GradualReset };

  void timerLoop();

  mutable std::mutex mutex_;
  int64_t value_{0};
  int64_t incrementCount_{0};
  std::chrono::steady_clock::time_point lastInteraction_{
      std::chrono::steady_clock::now()};
  TimerMode timerMode_{TimerMode::Idle};

  Listener listener_;

  std::thread timerThread_;
  std::condition_variable timerCv_;
  std::atomic<bool> shuttingDown_{false};
  std::atomic<uint64_t> timerEpoch_{0};
};

}  // namespace counterapp
