//
//  JsiUtils.h
//  JsiBridge
//
//  Created by FuzzyFade on 08/27/2022.
//  Copyright © 2022 NCUHOME. All rights reserved.
//

#pragma once

#include <jsi/jsi.h>
#import <ReactCommon/CallInvoker.h>
#import <react/bridging/CallbackWrapper.h>

using namespace facebook;
using namespace facebook::react;

typedef void(^PureBlockType)(void);

#pragma mark - JsiBridgeBlockGuard

@interface JsiBridgeBlockGuard : NSObject

@property (nonatomic) PureBlockType cleanup;

- (id)initWithCleanup:(PureBlockType)cleanup;

@end

@implementation JsiBridgeBlockGuard {
    void (^_cleanup)(void);
}

- (id)initWithCleanup:(void (^)(void))cleanup
{
    if (self = [super init]) {
        _cleanup = cleanup;
    }
    
    return self;
}

- (void)dealloc
{
    _cleanup();
}

@end

#pragma mark - Objc to JSI

namespace JsiBridgeTurboModuleConvertUtils {

static jsi::Value convertNSNumberToJSIBoolean(jsi::Runtime &runtime, NSNumber *value)
{
    return jsi::Value((bool)[value boolValue]);
}

static jsi::Value convertNSNumberToJSINumber(jsi::Runtime &runtime, NSNumber *value)
{
    return jsi::Value([value doubleValue]);
}

static jsi::String convertNSStringToJSIString(jsi::Runtime &runtime, NSString *value)
{
    return jsi::String::createFromUtf8(runtime, [value UTF8String] ?: "");
}

static jsi::Value convertObjCObjectToJSIValue(jsi::Runtime &runtime, id value);
static jsi::Object convertNSDictionaryToJSIObject(jsi::Runtime &runtime, NSDictionary *value)
{
    jsi::Object result = jsi::Object(runtime);
    for (NSString *k in value) {
        result.setProperty(runtime, [k UTF8String], convertObjCObjectToJSIValue(runtime, value[k]));
    }
    return result;
}

static jsi::Array convertNSArrayToJSIArray(jsi::Runtime &runtime, NSArray *value)
{
    jsi::Array result = jsi::Array(runtime, value.count);
    for (size_t i = 0; i < value.count; i++) {
        result.setValueAtIndex(runtime, i, convertObjCObjectToJSIValue(runtime, value[i]));
    }
    return result;
}

static jsi::Value convertObjCObjectToJSIValue(jsi::Runtime &runtime, id value)
{
    if ([value isKindOfClass:[NSString class]]) {
        return convertNSStringToJSIString(runtime, (NSString *)value);
    } else if ([value isKindOfClass:[NSNumber class]]) {
        if ([value isKindOfClass:[@YES class]]) {
            return convertNSNumberToJSIBoolean(runtime, (NSNumber *)value);
        }
        return convertNSNumberToJSINumber(runtime, (NSNumber *)value);
    } else if ([value isKindOfClass:[NSDictionary class]]) {
        return convertNSDictionaryToJSIObject(runtime, (NSDictionary *)value);
    } else if ([value isKindOfClass:[NSArray class]]) {
        return convertNSArrayToJSIArray(runtime, (NSArray *)value);
    } else if (value == (id)kCFNull) {
        return jsi::Value::null();
    }
    return jsi::Value::undefined();
}

#pragma mark - Objc to Std

static std::vector<jsi::Value> convertNSArrayToStdVector(jsi::Runtime &runtime, NSArray *value)
{
    std::vector<jsi::Value> result;
    for (size_t i = 0; i < value.count; i++) {
        result.emplace_back(convertObjCObjectToJSIValue(runtime, value[i]));
    }
    return result;
}

#pragma mark - JSI to Objc

static id convertJSIValueToObjCObject(
                                      jsi::Runtime &runtime,
                                      const jsi::Value &value,
                                      std::shared_ptr<CallInvoker> jsInvoker);
static NSString *convertJSIStringToNSString(jsi::Runtime &runtime, const jsi::String &value)
{
    return [NSString stringWithUTF8String:value.utf8(runtime).c_str()];
}

static NSArray *convertJSIArrayToNSArray(
                                         jsi::Runtime &runtime,
                                         const jsi::Array &value,
                                         std::shared_ptr<CallInvoker> jsInvoker)
{
    size_t size = value.size(runtime);
    NSMutableArray *result = [NSMutableArray new];
    for (size_t i = 0; i < size; i++) {
            // Insert kCFNull when it's `undefined` value to preserve the indices.
        [result
         addObject:convertJSIValueToObjCObject(runtime, value.getValueAtIndex(runtime, i), jsInvoker)
         ?: (id)kCFNull];
    }
    return [result copy];
}

static NSDictionary *convertJSIObjectToNSDictionary(
                                                    jsi::Runtime &runtime,
                                                    const jsi::Object &value,
                                                    std::shared_ptr<CallInvoker> jsInvoker)
{
    jsi::Array propertyNames = value.getPropertyNames(runtime);
    size_t size = propertyNames.size(runtime);
    NSMutableDictionary *result = [NSMutableDictionary new];
    for (size_t i = 0; i < size; i++) {
        jsi::String name = propertyNames.getValueAtIndex(runtime, i).getString(runtime);
        NSString *k = convertJSIStringToNSString(runtime, name);
        id v = convertJSIValueToObjCObject(runtime, value.getProperty(runtime, name), jsInvoker);
        if (v) {
            result[k] = v;
        }
    }
    return [result copy];
}

static RCTResponseSenderBlock convertJSIFunctionToCallback(
                                                           jsi::Runtime &runtime,
                                                           const jsi::Function &value,
                                                           std::shared_ptr<CallInvoker> jsInvoker);
static id convertJSIValueToObjCObject(
                                      jsi::Runtime &runtime,
                                      const jsi::Value &value,
                                      std::shared_ptr<CallInvoker> jsInvoker)
{
    if (value.isUndefined() || value.isNull()) {
        return nil;
    }
    if (value.isBool()) {
        return @(value.getBool());
    }
    if (value.isNumber()) {
        return @(value.getNumber());
    }
    if (value.isString()) {
        return convertJSIStringToNSString(runtime, value.getString(runtime));
    }
    if (value.isObject()) {
        jsi::Object o = value.getObject(runtime);
        if (o.isArray(runtime)) {
            return convertJSIArrayToNSArray(runtime, o.getArray(runtime), jsInvoker);
        }
        if (o.isFunction(runtime)) {
            return convertJSIFunctionToCallback(runtime, std::move(o.getFunction(runtime)), jsInvoker);
        }
        return convertJSIObjectToNSDictionary(runtime, o, jsInvoker);
    }
    
    throw std::runtime_error("Unsupported jsi::jsi::Value kind");
}

static RCTResponseSenderBlock convertJSIFunctionToCallback(
                                                           jsi::Runtime &runtime,
                                                           const jsi::Function &value,
                                                           std::shared_ptr<CallInvoker> jsInvoker)
{
    auto weakWrapper = CallbackWrapper::createWeak(value.getFunction(runtime), runtime, jsInvoker);
    JsiBridgeBlockGuard *blockGuard = [[JsiBridgeBlockGuard alloc] initWithCleanup:^() {
        auto strongWrapper = weakWrapper.lock();
        if (strongWrapper) {
            strongWrapper->destroy();
        }
    }];
    
    BOOL __block wrapperWasCalled = NO;
    RCTResponseSenderBlock callback = ^(NSArray *responses) {
        if (wrapperWasCalled) {
            throw std::runtime_error("callback arg cannot be called more than once");
        }
        
        auto strongWrapper = weakWrapper.lock();
        if (!strongWrapper) {
            return;
        }
        
        strongWrapper->jsInvoker().invokeAsync([weakWrapper, responses, blockGuard]() {
            auto strongWrapper2 = weakWrapper.lock();
            if (!strongWrapper2) {
                return;
            }
            
            std::vector<jsi::Value> args = convertNSArrayToStdVector(strongWrapper2->runtime(), responses);
            strongWrapper2->callback().call(strongWrapper2->runtime(), (const jsi::Value *)args.data(), args.size());
            strongWrapper2->destroy();
            
                // Delete the CallbackWrapper when the block gets dealloced without being invoked.
            (void)blockGuard;
        });
        
        wrapperWasCalled = YES;
    };
    
    return [callback copy];
}

} // namespace RNJSIBridgeTurboModuleConvertUtils
