#import "AppDelegate.h"

#import <React/RCTBridgeModule.h>
#import <React/RCTBundleURLProvider.h>
#include "JsiBridgeEmitter.h"

@interface ExampleJsiBridgeTest : NSObject <RCTBridgeModule>
@end

@implementation ExampleJsiBridgeTest

RCT_EXPORT_MODULE(ExampleJsiBridgeTest)

RCT_EXPORT_METHOD(emitNativeValue:(id)value)
{
  [[JsiBridgeEmitter shared] emit:@"onData" with:value];
}

RCT_EXPORT_METHOD(emitWebViewMessage:(id)payload)
{
  [[JsiBridgeEmitter shared] emit:@"example.webview.message" with:payload];
}

RCT_EXPORT_METHOD(emitPreloadEvent:(NSString *)status)
{
  [[JsiBridgeEmitter shared] emit:@"example.preload.event"
                              with:@{ @"status": status ?: @"error" }];
}

@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"JsiBridge2Example";
  // You can add your initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  JsiBridgeEmitter *emitter = [JsiBridgeEmitter shared];

  [emitter off:@"jsData"];
  [emitter on:@"jsData" with:^(id data) {
    NSLog(@"[ExampleJsiBridgeTest] jsData %@", data);
    [emitter emit:@"onData" with:data];
  }];

  [emitter off:@"example.webview.injectJavaScript"];
  [emitter on:@"example.webview.injectJavaScript" with:^(id data) {
    NSDictionary *message = @{
      @"type": @"injectJavaScript",
      @"nativeReceived": @YES,
      @"payload": data ?: [NSNull null],
    };
    [emitter emit:@"example.webview.message" with:message];
  }];

  [emitter off:@"example.webview.network"];
  [emitter on:@"example.webview.network" with:^(id data) {
    NSDictionary *request = [data isKindOfClass:[NSDictionary class]]
        ? (NSDictionary *)data
        : @{};
    id taskId = request[@"taskId"] ?: @"example-task";
    id responseData = request[@"data"] ?: @{ @"ok": @YES };
    NSDictionary *response = @{
      @"taskId": taskId,
      @"data": responseData,
      @"resHeader": @{
        @"content-type": @"application/json",
        @"x-example": @"true",
      },
    };
    [emitter emit:@"example.webview.response" with:response];
  }];

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

/// This method controls whether the `concurrentRoot` feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the concurrentRoot feature is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
  return true;
}

@end
