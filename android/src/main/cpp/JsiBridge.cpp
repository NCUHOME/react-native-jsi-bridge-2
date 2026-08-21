//
// Created by Sergei Golishnikov on 08/03/2022.
//

#include "JsiBridge.h"

#include <utility>
#include "iostream"

using namespace facebook;
using namespace facebook::jni;

using TSelf = local_ref<HybridClass<JsiBridge>::jhybriddata>;

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
    return facebook::jni::initialize(vm, [] {
        JsiBridge::registerNatives();
    });
}

// JNI binding
void JsiBridge::registerNatives() {
    __android_log_print(ANDROID_LOG_DEBUG, "😇", "registerNatives");
    registerHybrid({
                           makeNativeMethod("initHybrid",
                                            JsiBridge::initHybrid),
                           makeNativeMethod("installJSIBindings",
                                            JsiBridge::installJSIBindings),
                           makeNativeMethod("emitJsStr",
                                            JsiBridge::emitJsStr),
                           makeNativeMethod("emitJsBool",
                                            JsiBridge::emitJsBool),
                           makeNativeMethod("emitJsNum",
                                            JsiBridge::emitJsNum),
                           makeNativeMethod("emitJsObj",
                                            JsiBridge::emitJsObj),
                           makeNativeMethod("emitJsNull",
                                            JsiBridge::emitJsNull),
                           makeNativeMethod("getBindingsInstaller",
                                            JsiBridge::getBindingsInstaller),
                   });
}

JsiBridge::JsiBridge(
        jni::alias_ref<JsiBridge::javaobject> jThis,
        jsi::Runtime *rt,
        std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker)
        : javaPart_(jni::make_global(jThis)),
          runtime_(rt),
          jsCallInvoker_(std::move(jsCallInvoker)) {}

// JNI init
TSelf JsiBridge::initHybrid(
        alias_ref<jhybridobject> jThis,
        jlong jsContext,
        jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
        jsCallInvokerHolder) {

    __android_log_write(ANDROID_LOG_DEBUG, "🥲", "initHybrid...");
    auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
    return makeCxxInstance(jThis, (jsi::Runtime *) jsContext, jsCallInvoker);
}

void JsiBridge::emitJsStr(jstring name, jstring data) {
    __android_log_print(ANDROID_LOG_DEBUG, "😇", "emit");

    auto stdName = jni::make_local(name)->toStdString();

    if (jsListeners_.find(stdName) != jsListeners_.end()) {
        auto stdData = jni::make_local((jstring)data)->toStdString();
        jsCallInvoker_->invokeAsync([=, d = stdData]() {
            jsListeners_[stdName]->call(*runtime_, jsi::String::createFromUtf8(*runtime_, d));
        });
    }
}

void JsiBridge::emitJsBool(jstring name, jboolean data) {
    __android_log_print(ANDROID_LOG_DEBUG, "😇", "emit");

    auto stdName = jni::make_local(name)->toStdString();

    if (jsListeners_.find(stdName) != jsListeners_.end()) {
        jsCallInvoker_->invokeAsync([=, d = data]() {
            jsListeners_[stdName]->call(*runtime_, jsi::Value(static_cast<bool>(d)));
        });
    }
}

void JsiBridge::emitJsNum(jstring name, jdouble data) {
    __android_log_print(ANDROID_LOG_DEBUG, "😇", "emit");

    auto stdName = jni::make_local(name)->toStdString();

    if (jsListeners_.find(stdName) != jsListeners_.end()) {
        jsCallInvoker_->invokeAsync([=, d = data]() {
            jsListeners_[stdName]->call(*runtime_, jsi::Value(static_cast<double>(d)));
        });
    }
}

void JsiBridge::emitJsObj(jstring name, jobject data, jboolean isArray) {
    __android_log_print(ANDROID_LOG_DEBUG, "😇", "emit");

    auto stdName = jni::make_local(name)->toStdString();

    if (jsListeners_.find(stdName) != jsListeners_.end()) {

        auto global_ref = jni::make_global(data);

        if (static_cast<bool>(isArray)) {
            auto arr = jni::static_ref_cast<react::NativeArray::jhybridobject>(global_ref);
            jsCallInvoker_->invokeAsync([=]() {
                auto arrVal = jsi::valueFromDynamic(*runtime_, arr->cthis()->consume());
                jsListeners_[stdName]->call(*runtime_, std::move(arrVal));
            });
        } else {
           auto obj = jni::static_ref_cast<react::NativeMap::jhybridobject>(global_ref);
            jsCallInvoker_->invokeAsync([=]() {
                auto objVal = jsi::valueFromDynamic(*runtime_, obj->cthis()->consume());
                jsListeners_[stdName]->call(*runtime_, std::move(objVal));
            });
        }

        global_ref.release();
    }
}

void JsiBridge::emitJsNull(jstring name) {
    __android_log_print(ANDROID_LOG_DEBUG, "😇", "emit");

    auto stdName = jni::make_local(name)->toStdString();

    if (jsListeners_.find(stdName) != jsListeners_.end()) {
        jsCallInvoker_->invokeAsync([=]() {
            jsListeners_[stdName]->call(*runtime_, jsi::Value::null());
        });
    }
}

static jni::local_ref<jobject> JSIValueToJavaObject(jsi::Runtime &rt,
                                                    const jsi::Value &value) {
    if (value.isUndefined() || value.isNull()) {
        return nullptr;
    } else if (value.isBool()) {
        return JBoolean::valueOf(value.getBool());
    } else if (value.isNumber()) {
        return jni::autobox(value.asNumber());
    } else if (value.isString()) {
        return jni::make_jstring(value.asString(rt).utf8(rt));
    } else if (value.isObject()) {
        if (value.asObject(rt).isArray(rt)) {
            return react::ReadableNativeArray::newObjectCxxArgs(
                    jsi::dynamicFromValue(rt, value));
        } else {
            return react::ReadableNativeMap::newObjectCxxArgs(
                    jsi::dynamicFromValue(rt, value));
        }
    }
    throw std::runtime_error("Unsupported jsi::Value kind");
}
facebook::jni::local_ref<facebook::react::BindingsInstallerHolder::javaobject>
JsiBridge::getBindingsInstaller() {
    return facebook::react::BindingsInstallerHolder::newObjectCxxArgs(
            [this](jsi::Runtime &runtime) {
                runtime_ = &runtime;
                installJSIBindings();
            });
}



void JsiBridge::installJSIBindings() {
    __android_log_print(ANDROID_LOG_DEBUG, "😇", "installJSIBindings");

    auto registerCallback = jsi::Function::createFromHostFunction(
            *runtime_,
            jsi::PropNameID::forUtf8(*runtime_, "registerCallback"),
            2,
            [=](jsi::Runtime &runtime,
                const jsi::Value &thisArg,
                const jsi::Value *args,
                size_t count) -> jsi::Value {


                auto name = args[0].asString(runtime).utf8(runtime);

                __android_log_print(ANDROID_LOG_DEBUG, "😇", "registerCallback %s", name.c_str());

                auto callback = args[1].asObject(runtime).asFunction(runtime);
                jsListeners_[name] = std::make_shared<jsi::Function>(std::move(callback));
                return jsi::Value::undefined();
            });

    auto removeCallback = jsi::Function::createFromHostFunction(
            *runtime_,
            jsi::PropNameID::forUtf8(*runtime_, "removeCallback"),
            1,
            [=](jsi::Runtime &runtime,
                const jsi::Value &thisArg,
                const jsi::Value *args,
                size_t count) -> jsi::Value {

                auto name = args[0].asString(runtime).utf8(runtime);

                __android_log_print(ANDROID_LOG_DEBUG, "😇", "removeCallback %s", name.c_str());

                jsListeners_.erase(name);
                return jsi::Value::undefined();
            });


    auto emit = jsi::Function::createFromHostFunction(
            *runtime_,
            jsi::PropNameID::forUtf8(*runtime_, "emit"),
            2,
            [=](jsi::Runtime &runtime,
                const jsi::Value &thisArg,
                const jsi::Value *args,
                size_t count) -> jsi::Value {

                auto name = args[0].asString(runtime).utf8(runtime);
                auto localName = jni::make_jstring(name);

                auto localData = JSIValueToJavaObject(runtime, args[1]);

                __android_log_print(ANDROID_LOG_DEBUG, "😇", "emit %s", name.c_str());

                auto method = javaPart_->getClass()->getMethod<void(jni::local_ref<jstring>,
                                                                    jni::local_ref<jobject>)>(
                        "emitNative");
                method(javaPart_.get(), localName, localData);

                return jsi::Value::undefined();
            });


    jsi::Object _jsiBridge = jsi::Object(*runtime_);
    _jsiBridge.setProperty(*runtime_, "registerCallback", std::move(registerCallback));
    _jsiBridge.setProperty(*runtime_, "removeCallback", std::move(removeCallback));
    _jsiBridge.setProperty(*runtime_, "emit", std::move(emit));
    runtime_->global().setProperty(*runtime_, "_JsiBridge", std::move(_jsiBridge));

}
