#include "Counter.h"

namespace counterapp {

Counter::Counter() {
  timerThread_ = std::thread([this] { timerLoop(); });
}

Counter::~Counter() {
  shutdownTimer();
}

void Counter::shutdownTimer() {
  {
    std::lock_guard<std::mutex> lock(mutex_);
    if (shuttingDown_.load(std::memory_order_relaxed)) return;
    shuttingDown_.store(true, std::memory_order_relaxed);
  }
  timerCv_.notify_all();
  if (timerThread_.joinable()) {
    timerThread_.join();
  }
}

int64_t Counter::increment() {
  Listener listenerCopy;
  int64_t newValue;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    incrementCount_ += 1;
    int64_t delta = (incrementCount_ % 5 == 0) ? kFifthBonus : 1;
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

int64_t Counter::decrement() {
  Listener listenerCopy;
  int64_t newValue;
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
  {
    std::lock_guard<std::mutex> lock(mutex_);
    incrementCount_ = 0;
    lastInteraction_ = std::chrono::steady_clock::now();
    timerEpoch_.fetch_add(1, std::memory_order_relaxed);
    timerMode_ = (value_ == 0) ? TimerMode::Idle : TimerMode::GradualReset;
  }
  timerCv_.notify_all();
  // Gradual reset ticks the value down via the timer thread; no immediate
  // emission here.
}

int64_t Counter::getValue() const {
  std::lock_guard<std::mutex> lock(mutex_);
  return value_;
}

void Counter::setListener(Listener listener) {
  Listener toEmit;
  int64_t snapshot;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    listener_ = std::move(listener);
    toEmit = listener_;
    snapshot = value_;
  }
  if (toEmit) toEmit(snapshot);
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
        int64_t toEmit = value_;
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
        int64_t toEmit = value_;
        Listener listenerCopy = listener_;
        lock.unlock();
        if (listenerCopy) listenerCopy(toEmit);
        lock.lock();
      }
    }
  }
}

}  // namespace counterapp
