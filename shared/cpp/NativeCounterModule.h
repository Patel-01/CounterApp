// Bridge between the JSI TurboModule API (codegen) and the pure-C++ Counter.

#pragma once

#include <AppSpecsJSI.h>
#include <ReactCommon/CallInvoker.h>
#include "Counter.h"

#include <memory>

namespace facebook::react {

class NativeCounterModule
    : public NativeCounterCxxSpec<NativeCounterModule> {
 public:
  explicit NativeCounterModule(std::shared_ptr<CallInvoker> jsInvoker);
  ~NativeCounterModule() override;

  double increment(jsi::Runtime& rt);
  double decrement(jsi::Runtime& rt);
  void reset(jsi::Runtime& rt);
  double getValue(jsi::Runtime& rt);

 private:
  counterapp::Counter counter_;
};

void registerNativeCounterModule();

}  // namespace facebook::react
