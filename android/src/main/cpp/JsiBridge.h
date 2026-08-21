//
// Created by Sergei Golishnikov on 08/03/2022.
//
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <jsi/JSIDynamic.h>
#include <ReactCommon/BindingsInstallerHolder.h>
#include <ReactCommon/CallInvokerHolder.h>
#include <react/jni/JMessageQueueThread.h>
#include <react/jni/WritableNativeMap.h>
#include <map>

class JsiBridge : public facebook::jni::HybridClass<JsiBridge> {

public:
    static constexpr auto kJavaDescriptor = "Lcom/reactnativejsibridge/JsiBridge;";

    static facebook::jni::local_ref<jhybriddata> initHybrid(
            facebook::jni::alias_ref<jhybridobject> jThis,
            jlong jsContext,
            facebook::jni::alias_ref<facebook::react::CallInvokerHolder::javaobject> jsCallInvokerHolder);

    static void registerNatives();

    void installJSIBindings();
    facebook::jni::local_ref<facebook::react::BindingsInstallerHolder::javaobject>
    getBindingsInstaller();

    void emitJsStr(jstring name, jstring data);

    void emitJsBool(jstring name, jboolean data);

    void emitJsNum(jstring name, jdouble data);

    void emitJsObj(jstring name, jobject data, jboolean isArray);

    void emitJsNull(jstring name);


private:
    friend HybridBase;
    facebook::jni::global_ref<JsiBridge::javaobject> javaPart_;
    facebook::jsi::Runtime *runtime_;
    std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker_;
    std::map<std::string, std::shared_ptr<facebook::jsi::Function>> jsListeners_;

    explicit JsiBridge(
            facebook::jni::alias_ref<JsiBridge::jhybridobject> jThis,
            facebook::jsi::Runtime *rt,
            std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker);
};

