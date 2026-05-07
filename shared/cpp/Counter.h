// Pure-C++ counter logic. No React/JSI dependencies — easy to unit-test in
// isolation and reuse across iOS and Android.

#pragma once

#include <functional>
#include <mutex>
#include <thread>
#include <atomic>
#include <chrono>
#include <condition_variable>

namespace counterapp {

class Counter {
 public:
  using Listener = std::function<void(int32_t)>;

  static constexpr int32_t kFifthBonus = 5;
  static constexpr std::chrono::milliseconds kIdleDelay{4000};
  static constexpr std::chrono::milliseconds kAutoDecrementInterval{1000};
  static constexpr std::chrono::milliseconds kGradualResetTick{60};

  Counter();
  ~Counter();

  Counter(const Counter&) = delete;
  Counter& operator=(const Counter&) = delete;

  int32_t increment();
  int32_t decrement();
  void reset();
  int32_t getValue() const;

  // Register the listener that receives every committed value change.
  // Called on the timer thread for auto-tick events; called on the caller's
  // thread for user-initiated operations.
  void setListener(Listener listener);

 private:
  enum class TimerMode { Idle, GradualReset };

  void notify(int32_t value);
  void scheduleIdleTimer();
  void cancelTimer();
  void startGradualReset();
  void timerLoop();

  mutable std::mutex mutex_;
  int32_t value_{0};
  int32_t incrementCount_{0};
  std::chrono::steady_clock::time_point lastInteraction_{
      std::chrono::steady_clock::now()};
  TimerMode timerMode_{TimerMode::Idle};

  Listener listener_;

  std::thread timerThread_;
  std::condition_variable timerCv_;
  std::atomic<bool> timerRunning_{false};
  std::atomic<bool> shuttingDown_{false};
  std::atomic<uint64_t> timerEpoch_{0};
};

}  // namespace counterapp
