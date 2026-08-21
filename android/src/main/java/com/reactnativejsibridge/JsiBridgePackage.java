package com.reactnativejsibridge;

import androidx.annotation.NonNull;

import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

public class JsiBridgePackage extends TurboReactPackage {
    @Override
    public NativeModule getModule(String name, ReactApplicationContext reactContext) {
        if (JsiBridgeModule.NAME.equals(name)) {
            return new JsiBridgeModule(reactContext);
        }
        return null;
    }

    @Override
    @NonNull
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return () -> {
            Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();
            boolean isTurboModule = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
            moduleInfos.put(
                    JsiBridgeModule.NAME,
                    new ReactModuleInfo(
                            JsiBridgeModule.NAME,
                            JsiBridgeModule.NAME,
                            false,
                            false,
                            false,
                            false,
                            isTurboModule));
            return moduleInfos;
        };
    }
}
