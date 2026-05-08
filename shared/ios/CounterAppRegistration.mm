// Registers the C++ TurboModule into the global Cxx TurboModule map at
// process load. RCTTurboModuleManager consults this map when JS first
// requests `NativeCounter`, so registration only has to happen once and
// only has to happen before any JS interaction with the module.
//
// Using +load avoids any Swift ↔ C++ bridging header.

#import <Foundation/Foundation.h>

#include "../cpp/NativeCounterModule.h"

@interface CounterAppCxxRegistration : NSObject
@end

@implementation CounterAppCxxRegistration
+ (void)load {
  facebook::react::registerNativeCounterModule();
}
@end
