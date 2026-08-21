package com.reactnativejsibridge;

import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public abstract class JsiBridgeSpec extends ReactContextBaseJavaModule {
    protected JsiBridgeSpec(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    @NonNull
    public String getName() {
        return JsiBridgeModule.NAME;
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public void install() {
        try {
            System.loadLibrary("jsiBridge");
            JsiBridge.instance.install(getReactApplicationContext());
        } catch (Exception exception) {
            Log.e(JsiBridgeModule.NAME, "Failed to install JSI Bindings!", exception);
        }
    }

    @ReactMethod
    public void getStatus(Promise promise) {
        promise.resolve("legacy");
    }
}
