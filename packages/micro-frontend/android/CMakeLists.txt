cmake_minimum_required(VERSION 3.13)
project(granite-micro-frontend)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_EXTENSIONS OFF)

# This file is the module's own externalNativeBuild entry point and builds only the library that
# ships inside the AAR. The codegen target lives in src/main/jni/CMakeLists.txt, which autolinking
# builds inside the consuming app.

add_library(
  granite-micro-frontend
  SHARED
  src/main/cpp/BundleEvaluator.cpp
  src/main/cpp/FileReader.cpp
  src/main/cpp/onLoad.cpp
)

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

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
