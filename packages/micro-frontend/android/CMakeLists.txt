cmake_minimum_required(VERSION 3.13)
project(granite-micro-frontend)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CODEGEN_LIBRARY_NAME GraniteMicroFrontendRuntimeSpec)
set(CODEGEN_TARGET_NAME react_codegen_${CODEGEN_LIBRARY_NAME})
set(COMMON_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../common/cpp)
set(COMMON_COMPONENTS_DIR ${COMMON_DIR}/react/renderer/components/${CODEGEN_LIBRARY_NAME})
set(GENERATED_JNI_DIR ${CMAKE_CURRENT_SOURCE_DIR}/build/generated/source/codegen/jni)
set(GENERATED_COMPONENTS_DIR ${GENERATED_JNI_DIR}/react/renderer/components/${CODEGEN_LIBRARY_NAME})

add_library(
  granite-micro-frontend
  SHARED
  src/main/cpp/BundleEvaluator.cpp
  src/main/cpp/FileReader.cpp
  src/main/cpp/onLoad.cpp
)

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

file(GLOB CODEGEN_CUSTOM_SOURCES CONFIGURE_DEPENDS ${COMMON_COMPONENTS_DIR}/*.cpp)
file(GLOB CODEGEN_GENERATED_SOURCES CONFIGURE_DEPENDS
  ${GENERATED_JNI_DIR}/*.cpp
  ${GENERATED_COMPONENTS_DIR}/*.cpp
)

add_library(
  ${CODEGEN_TARGET_NAME}
  SHARED
  ${CODEGEN_CUSTOM_SOURCES}
  ${CODEGEN_GENERATED_SOURCES}
)

target_include_directories(
  ${CODEGEN_TARGET_NAME}
  PUBLIC
  ${COMMON_DIR}
  ${GENERATED_JNI_DIR}
  ${GENERATED_COMPONENTS_DIR}
)

target_include_directories(
  granite-micro-frontend
  PRIVATE
  src/main/cpp
)

target_link_libraries(
  granite-micro-frontend
  android
  fbjni::fbjni
  ReactAndroid::jsi
  ReactAndroid::reactnative
)

target_link_libraries(
  ${CODEGEN_TARGET_NAME}
  ReactAndroid::reactnative
  ReactAndroid::jsi
  fbjni::fbjni
)

if(COMMAND target_compile_reactnative_options)
  target_compile_reactnative_options(${CODEGEN_TARGET_NAME} PRIVATE)
else()
  target_compile_options(
    ${CODEGEN_TARGET_NAME}
    PRIVATE
    -DLOG_TAG=\"ReactNative\"
    -DFOLLY_NO_CONFIG=1
    -fexceptions
    -frtti
    -std=c++20
    -Wall
  )
  target_compile_definitions(${CODEGEN_TARGET_NAME} PRIVATE RN_SERIALIZABLE_STATE)
endif()

if(CMAKE_ANDROID_NDK_VERSION VERSION_LESS "27")
  target_link_options(granite-micro-frontend PRIVATE "-Wl,-z,max-page-size=16384")
endif()
