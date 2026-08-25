cmake_minimum_required(VERSION 3.4.1)

set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 20)
set (CMAKE_CXX_FLAGS "-DFOLLY_NO_CONFIG=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -DFOLLY_HAVE_MEMRCHR=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_MOBILE=1 -DON_ANDROID -DONANDROID -DFOR_HERMES=${FOR_HERMES}")

set (PACKAGE_NAME "jsiBridge")

add_library(
    ${PACKAGE_NAME}
    SHARED
    src/main/cpp/JsiBridge.cpp
)

find_package(ReactAndroid REQUIRED CONFIG)

find_package(fbjni REQUIRED CONFIG)

# linking

message(WARNING "jsiBridge linking")

target_link_libraries(
    ${PACKAGE_NAME}
    ReactAndroid::jsi
    ReactAndroid::reactnative
    fbjni::fbjni
    log
    android
)
