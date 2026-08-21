package com.reactnativejsibridge;

import android.os.Handler;
import android.os.Looper;

import androidx.collection.ArrayMap;

import com.facebook.jni.HybridData;
import com.facebook.jni.annotations.DoNotStrip;
import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableNativeArray;
import com.facebook.react.bridge.ReadableNativeMap;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.react.turbomodule.core.interfaces.BindingsInstallerHolder;
import com.facebook.react.turbomodule.core.interfaces.CallInvokerHolder;
@SuppressWarnings("JavaJniMissingFunction")
public class JsiBridge {
    public static final JsiBridge instance = new JsiBridge();
    private final ArrayMap<String, JsiBridgeCallback> nativeListeners = new ArrayMap<>(10);
    private final Handler handler = new Handler(Looper.getMainLooper());
    @DoNotStrip
    @SuppressWarnings("unused")
    private HybridData mHybridData;

    public static void on(String name, JsiBridgeCallback callback) {
        instance.nativeListeners.put(name, callback);
    }

    public static void off(String name) {
        instance.nativeListeners.remove(name);
    }

    public static void emit(String name, Object data) {
        if (data instanceof String) {
            instance.emitJsStr(name, (String) data);
        } else if (data instanceof Boolean) {
            instance.emitJsBool(name, (boolean) data);
        } else if (data instanceof Double || data instanceof Float
                || data instanceof Long
                || data instanceof Byte
                || data instanceof Short
                || data instanceof Integer
        ) {
            instance.emitJsNum(name, ((Number) data).doubleValue());
        } else if (data instanceof ReadableNativeMap) {
            instance.emitJsObj(name, data, false);
        } else if (data instanceof ReadableNativeArray) {
            instance.emitJsObj(name, data, true);
        } else if (data == null) {
            instance.emitJsNull(name);
        }
    }

    public boolean install(ReactApplicationContext context) {
        try {
            JavaScriptContextHolder jsContext = context.getJavaScriptContextHolder();
            CallInvokerHolder jsCallInvokerHolder = context.getCatalystInstance().getJSCallInvokerHolder();
            mHybridData = initHybrid(jsContext.get(), (CallInvokerHolderImpl) jsCallInvokerHolder);
            installJSIBindings();
            return true;
        } catch (Exception exception) {
            return false;
        }
    }

    public BindingsInstallerHolder getBindingsInstaller(CallInvokerHolder callInvokerHolder) {
        try {
            if (mHybridData == null) {
                mHybridData = initHybrid(0, (CallInvokerHolderImpl) callInvokerHolder);
            }
            return getBindingsInstaller();
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to create JSI bindings installer", exception);
        }
    }

    @DoNotStrip
    @SuppressWarnings("unused")
    private void emitNative(final String name, final Object data) {
        JsiBridgeCallback jsiBridgeCallback = nativeListeners.get(name);
        if (jsiBridgeCallback == null) return;
        handler.post(new Runnable() {
            @Override
            public void run() {
                jsiBridgeCallback.onJsEvent(data);
            }
        });
    }

    private native void installJSIBindings();

    private native void emitJsStr(String name, String data);

    private native void emitJsBool(String name, boolean data);


    @DoNotStrip
    private native BindingsInstallerHolder getBindingsInstaller();
    private native void emitJsNum(String name, double data);

    private native void emitJsObj(String name, Object data, boolean isArray);

    private native void emitJsNull(String name);

    private native HybridData initHybrid(long jsContext, CallInvokerHolderImpl jsCallInvokerHolder);

    public interface JsiBridgeCallback<T> {
        void onJsEvent(T data);
    }
}
