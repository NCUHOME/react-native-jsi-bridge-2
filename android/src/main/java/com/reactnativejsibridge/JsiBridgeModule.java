package com.reactnativejsibridge;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.turbomodule.core.interfaces.BindingsInstallerHolder;
import com.facebook.react.turbomodule.core.interfaces.CallInvokerHolder;
import com.facebook.react.turbomodule.core.interfaces.TurboModuleWithJSIBindings;

@ReactModule(name = JsiBridgeModule.NAME)
public class JsiBridgeModule extends JsiBridgeSpec implements TurboModuleWithJSIBindings {
    public static final String NAME = "JsiBridge";

    public JsiBridgeModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }

    @Override
    @com.facebook.proguard.annotations.DoNotStrip
    public BindingsInstallerHolder getBindingsInstaller() {
        System.loadLibrary("jsiBridge");
        CallInvokerHolder callInvokerHolder = getReactApplicationContext().getJSCallInvokerHolder();
        return JsiBridge.instance.getBindingsInstaller(callInvokerHolder);
    }
    @Override
    public void getStatus(Promise promise) {
        promise.resolve("newarch");
    }
}
