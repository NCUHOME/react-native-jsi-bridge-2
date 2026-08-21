#import <React/RCTBridgeModule.h>

@interface JsiBridge : NSObject <RCTBridgeModule>

- (void)emitJs:(NSString *)name with:(id)data;

@end
