#import <React/RCTBridgeModule.h>

#if defined(RCT_NEW_ARCH_ENABLED) && RCT_NEW_ARCH_ENABLED
#import <React/RCTCallInvokerModule.h>
#import <ReactCommon/RCTTurboModuleWithJSIBindings.h>
#import "RNJsiBridgeSpec.h"
#endif

@interface JsiBridge : NSObject <RCTBridgeModule
#if defined(RCT_NEW_ARCH_ENABLED) && RCT_NEW_ARCH_ENABLED
, NativeJsiBridgeSpec, RCTTurboModuleWithJSIBindings, RCTCallInvokerModule
#endif
>
#if defined(RCT_NEW_ARCH_ENABLED) && RCT_NEW_ARCH_ENABLED
@property(nonatomic, strong, nullable) RCTCallInvoker *callInvoker;
#endif

- (void)emitJs:(NSString *)name with:(id)data;

@end
