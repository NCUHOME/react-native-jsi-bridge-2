package com.reactnativejsibridge;

import com.facebook.react.bridge.ReactApplicationContext;

abstract class JsiBridgeSpec extends NativeJsiBridgeSpec {
    JsiBridgeSpec(ReactApplicationContext reactContext) {
        super(reactContext);
    }
}
