cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE ON)

# Autolinking owns this file. React Native's application CMake add_subdirectory()s it, so the
# consuming app builds the codegen target exactly once. It must stay separate from the module's
# own externalNativeBuild entry point (../../../CMakeLists.txt): pointing both at the same file
# builds every target in it twice and lets mergeNativeLibs pick between two copies of each .so.
#
# This file is included from an app project, so it must not call project() and does not need
# find_package(): ReactNative-application.cmake resolves ReactAndroid and fbjni before including
# the autolinking file.

set(CODEGEN_LIBRARY_NAME GraniteMicroFrontendRuntimeSpec)
set(CODEGEN_TARGET_NAME react_codegen_${CODEGEN_LIBRARY_NAME})

set(LIB_ANDROID_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../..)
set(COMMON_DIR ${LIB_ANDROID_DIR}/../common/cpp)
set(COMMON_COMPONENTS_DIR ${COMMON_DIR}/react/renderer/components/${CODEGEN_LIBRARY_NAME})
set(GENERATED_JNI_DIR ${LIB_ANDROID_DIR}/build/generated/source/codegen/jni)
set(GENERATED_COMPONENTS_DIR ${GENERATED_JNI_DIR}/react/renderer/components/${CODEGEN_LIBRARY_NAME})

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
