#include "NativeCounterModule.h"

#include <ReactCommon/CxxTurboModuleUtils.h>

namespace facebook::react {

NativeCounterModule::NativeCounterModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeCounterCxxSpec<NativeCounterModule>(jsInvoker) {
  counter_.setListener([this](int64_t value) {
    emitOnChange(static_cast<double>(value));
  });
}

NativeCounterModule::~NativeCounterModule() {
  // Stop and join the timer thread before module teardown so an in-flight
  // tick can't call emitOnChange on a partially-destroyed module.
  counter_.shutdownTimer();
}

double NativeCounterModule::increment(jsi::Runtime& /*rt*/) {
  return static_cast<double>(counter_.increment());
}

double NativeCounterModule::decrement(jsi::Runtime& /*rt*/) {
  return static_cast<double>(counter_.decrement());
}

void NativeCounterModule::reset(jsi::Runtime& /*rt*/) {
  counter_.reset();
}

double NativeCounterModule::getValue(jsi::Runtime& /*rt*/) {
  return static_cast<double>(counter_.getValue());
}

void registerNativeCounterModule() {
  registerCxxModuleToGlobalModuleMap(
      std::string{NativeCounterModule::kModuleName},
      [](std::shared_ptr<CallInvoker> jsInvoker) {
        return std::make_shared<NativeCounterModule>(std::move(jsInvoker));
      });
}

}  // namespace facebook::react
