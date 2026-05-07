#include "NativeCounterModule.h"

#include <ReactCommon/CxxTurboModuleUtils.h>

namespace facebook::react {

NativeCounterModule::NativeCounterModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeCounterCxxSpec<NativeCounterModule>(jsInvoker) {
  counter_.setListener([this](int32_t value) {
    emitOnChange(static_cast<double>(value));
  });
}

NativeCounterModule::~NativeCounterModule() {
  // Drop the listener so the timer thread can finish without touching
  // a potentially-destroyed module.
  counter_.setListener({});
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
