#import "_JsiBridge.h"
#if defined(RCT_NEW_ARCH_ENABLED) && RCT_NEW_ARCH_ENABLED
#import <React/RCTCallInvoker.h>
#import <React/RCTCallInvokerModule.h>
#import <ReactCommon/RCTTurboModuleWithJSIBindings.h>
#import "RNJsiBridgeSpec.h"
#endif
#import <React/RCTBridge+Private.h>
#import <ReactCommon/RCTTurboModule.h>
#import <jsi/jsi.h>
#import "JsiBridgeEmitter.h"
#import "JsiUtils.h"

#include <map>
#include <memory>

using namespace facebook;

namespace {
std::map<jsi::Runtime *, std::map<std::string, std::shared_ptr<jsi::Function>>> runtimeMap_;
jsi::Runtime *currentRuntime_ = nullptr;
std::shared_ptr<react::CallInvoker> currentCallInvoker_;
}

#if defined(RCT_NEW_ARCH_ENABLED) && RCT_NEW_ARCH_ENABLED
@interface JsiBridge () <NativeJsiBridgeSpec, RCTTurboModuleWithJSIBindings, RCTCallInvokerModule>
@end
#endif
@implementation JsiBridge
#if defined(RCT_NEW_ARCH_ENABLED) && RCT_NEW_ARCH_ENABLED
@synthesize callInvoker = _callInvoker;
#endif

RCT_EXPORT_MODULE()

- (void)installJSIBindingsWithRuntime:(jsi::Runtime &)runtime
                          callInvoker:(const std::shared_ptr<react::CallInvoker> &)callInvoker
{
    currentRuntime_ = &runtime;
    currentCallInvoker_ = callInvoker;

    [self installJsiBindingsForRuntime:runtime];
}

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-implementations"
// Legacy single-argument hook. Deprecated in RN 0.83+, still required for
// older RN versions where RCTTurboModuleManager only knows this selector.
- (void)installJSIBindingsWithRuntime:(jsi::Runtime &)runtime
{
#if defined(RCT_NEW_ARCH_ENABLED) && RCT_NEW_ARCH_ENABLED
    [self installJSIBindingsWithRuntime:runtime callInvoker:self.callInvoker.callInvoker];
#else
    RCTBridge *bridge = [RCTBridge currentBridge];
    [self installJSIBindingsWithRuntime:runtime callInvoker:bridge.jsCallInvoker];
#endif
}
#pragma clang diagnostic pop

- (void)installJsiBindingsForRuntime:(jsi::Runtime &)runtime
{
    [JsiBridgeEmitter.shared registerJsiBridge:self];

    auto registerCallback = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forUtf8(runtime, "registerCallback"),
        2,
        [](jsi::Runtime &runtime,
           const jsi::Value &,
           const jsi::Value *args,
           size_t) -> jsi::Value {
            auto name = args[0].asString(runtime).utf8(runtime);
            auto callback = args[1].asObject(runtime).asFunction(runtime);
            runtimeMap_[&runtime][name] = std::make_shared<jsi::Function>(std::move(callback));
            return jsi::Value::undefined();
        });

    auto removeCallback = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forUtf8(runtime, "removeCallback"),
        1,
        [](jsi::Runtime &runtime,
           const jsi::Value &,
           const jsi::Value *args,
           size_t) -> jsi::Value {
            auto name = args[0].asString(runtime).utf8(runtime);
            runtimeMap_[&runtime].erase(name);
            return jsi::Value::undefined();
        });

    auto emit = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forUtf8(runtime, "emit"),
        2,
        [jsInvoker = currentCallInvoker_](jsi::Runtime &runtime,
                                          const jsi::Value &,
                                          const jsi::Value *args,
                                          size_t) -> jsi::Value {
            auto name = args[0].asString(runtime).utf8(runtime);
            id data = JsiBridgeTurboModuleConvertUtils::convertJSIValueToObjCObject(
                runtime, args[1], jsInvoker);
            auto nameString = [NSString stringWithUTF8String:name.c_str()];
            [JsiBridgeEmitter.shared emitNative:nameString with:data];
            return jsi::Value::undefined();
        });

    jsi::Object jsiBridge = jsi::Object(runtime);
    jsiBridge.setProperty(runtime, "registerCallback", std::move(registerCallback));
    jsiBridge.setProperty(runtime, "removeCallback", std::move(removeCallback));
    jsiBridge.setProperty(runtime, "emit", std::move(emit));
    runtime.global().setProperty(runtime, "_JsiBridge", std::move(jsiBridge));
}

#if !defined(RCT_NEW_ARCH_ENABLED) || !RCT_NEW_ARCH_ENABLED
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(install)
{
    RCTBridge *bridge = [RCTBridge currentBridge];
    RCTCxxBridge *cxxBridge = (RCTCxxBridge *)bridge;
    if (cxxBridge == nil || cxxBridge.runtime == nil) {
        return @false;
    }

    [self installJSIBindingsWithRuntime:*((jsi::Runtime *)cxxBridge.runtime)
                            callInvoker:bridge.jsCallInvoker];
    return @true;
}
#endif

#if defined(RCT_NEW_ARCH_ENABLED) && RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<NativeJsiBridgeSpecJSI>(params);
}

RCT_EXPORT_METHOD(getStatus:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
{
    resolve(@"newarch");
}

- (void)install
{
    // JSI bindings are installed automatically via RCTTurboModuleWithJSIBindings
    // when the TurboModule is created. Required by NativeJsiBridgeSpec, nothing to do.
}
#endif

- (void)emitJs:(NSString *)name with:(id)data
{
    if (currentRuntime_ == nullptr || currentCallInvoker_ == nullptr) {
        return;
    }

    auto runtime = currentRuntime_;
    auto iterator = runtimeMap_[runtime].find(std::string([name UTF8String]));
    if (iterator == runtimeMap_[runtime].end()) {
        return;
    }

    auto callback = iterator->second;
    auto jsInvoker = currentCallInvoker_;
    jsInvoker->invokeAsync([runtime, callback, data]() {
        auto value = JsiBridgeTurboModuleConvertUtils::convertObjCObjectToJSIValue(*runtime, data);
        callback->call(*runtime, value);
    });
}

- (void)invalidate
{
    if (currentRuntime_ != nullptr) {
        runtimeMap_.erase(currentRuntime_);
    }
    currentRuntime_ = nullptr;
    currentCallInvoker_.reset();
    [JsiBridgeEmitter.shared registerJsiBridge:nil];
}

@end
