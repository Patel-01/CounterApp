#include "Counter.h"

#include <algorithm>

namespace counterapp {

Counter::Counter() {
  timerThread_ = std::thread([this] { timerLoop(); });
}

Counter::~Counter() {
  {
    std::lock_guard<std::mutex> lock(mutex_);
    shuttingDown_ = true;
  }
  timerCv_.notify_all();
  if (timerThread_.joinable()) {
    timerThread_.join();
  }
}

int32_t Counter::increment() {
  Listener listenerCopy;
  int32_t newValue;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    incrementCount_ += 1;
    int32_t delta = (incrementCount_ % 5 == 0) ? kFifthBonus : 1;
    value_ += delta;
    timerMode_ = TimerMode::Idle;
    lastInteraction_ = std::chrono::steady_clock::now();
    timerEpoch_.fetch_add(1, std::memory_order_relaxed);
    newValue = value_;
    listenerCopy = listener_;
  }
  timerCv_.notify_all();
  if (listenerCopy) listenerCopy(newValue);
  return newValue;
}

int32_t Counter::decrement() {
  Listener listenerCopy;
  int32_t newValue;
  bool changed;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    timerMode_ = TimerMode::Idle;
    lastInteraction_ = std::chrono::steady_clock::now();
    timerEpoch_.fetch_add(1, std::memory_order_relaxed);
    if (value_ > 0) {
      value_ -= 1;
      changed = true;
    } else {
      changed = false;
    }
    newValue = value_;
    listenerCopy = listener_;
  }
  timerCv_.notify_all();
  if (changed && listenerCopy) listenerCopy(newValue);
  return newValue;
}

void Counter::reset() {
  Listener listenerCopy;
  int32_t snapshot;
  bool fireImmediate = false;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    incrementCount_ = 0;
    lastInteraction_ = std::chrono::steady_clock::now();
    timerEpoch_.fetch_add(1, std::memory_order_relaxed);
    if (value_ == 0) {
      timerMode_ = TimerMode::Idle;
      fireImmediate = false;
    } else {
      timerMode_ = TimerMode::GradualReset;
      fireImmediate = false;
    }
    snapshot = value_;
    listenerCopy = listener_;
  }
  timerCv_.notify_all();
  // No immediate change to emit — gradual reset will tick the value down.
  (void)fireImmediate;
  (void)snapshot;
  (void)listenerCopy;
}

int32_t Counter::getValue() const {
  std::lock_guard<std::mutex> lock(mutex_);
  return value_;
}

void Counter::setListener(Listener listener) {
  std::lock_guard<std::mutex> lock(mutex_);
  listener_ = std::move(listener);
}

void Counter::notify(int32_t value) {
  Listener listenerCopy;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    listenerCopy = listener_;
  }
  if (listenerCopy) listenerCopy(value);
}

void Counter::timerLoop() {
  std::unique_lock<std::mutex> lock(mutex_);
  uint64_t myEpoch = timerEpoch_.load(std::memory_order_relaxed);

  while (!shuttingDown_.load(std::memory_order_relaxed)) {
    if (value_ == 0) {
      timerCv_.wait(lock, [&] {
        return shuttingDown_.load(std::memory_order_relaxed) ||
               timerEpoch_.load(std::memory_order_relaxed) != myEpoch ||
               value_ != 0;
      });
      myEpoch = timerEpoch_.load(std::memory_order_relaxed);
      continue;
    }

    std::chrono::milliseconds waitFor;
    if (timerMode_ == TimerMode::GradualReset) {
      waitFor = kGradualResetTick;
    } else {
      auto now = std::chrono::steady_clock::now();
      auto sinceLast = std::chrono::duration_cast<std::chrono::milliseconds>(
          now - lastInteraction_);
      if (sinceLast >= kIdleDelay) {
        waitFor = kAutoDecrementInterval;
      } else {
        waitFor = std::chrono::duration_cast<std::chrono::milliseconds>(
            kIdleDelay - sinceLast);
      }
    }

    bool stateChanged = timerCv_.wait_for(lock, waitFor, [&] {
      return shuttingDown_.load(std::memory_order_relaxed) ||
             timerEpoch_.load(std::memory_order_relaxed) != myEpoch;
    });

    if (shuttingDown_.load(std::memory_order_relaxed)) break;
    if (stateChanged) {
      myEpoch = timerEpoch_.load(std::memory_order_relaxed);
      continue;
    }

    // Timeout fired — apply a tick if still applicable.
    if (timerMode_ == TimerMode::GradualReset) {
      if (value_ > 0) {
        value_ -= 1;
        if (value_ == 0) timerMode_ = TimerMode::Idle;
        int32_t toEmit = value_;
        Listener listenerCopy = listener_;
        lock.unlock();
        if (listenerCopy) listenerCopy(toEmit);
        lock.lock();
      } else {
        timerMode_ = TimerMode::Idle;
      }
    } else {
      auto now = std::chrono::steady_clock::now();
      auto sinceLast = std::chrono::duration_cast<std::chrono::milliseconds>(
          now - lastInteraction_);
      if (sinceLast >= kIdleDelay && value_ > 0) {
        value_ -= 1;
        int32_t toEmit = value_;
        Listener listenerCopy = listener_;
        lock.unlock();
        if (listenerCopy) listenerCopy(toEmit);
        lock.lock();
      }
    }
  }
}

}  // namespace counterapp
