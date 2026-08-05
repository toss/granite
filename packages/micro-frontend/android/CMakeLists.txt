cmake_minimum_required(VERSION 3.13)
project(granite-micro-frontend)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(
  granite-micro-frontend
  SHARED
  src/main/cpp/BundleEvaluator.cpp
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

if(CMAKE_ANDROID_NDK_VERSION VERSION_LESS "27")
  target_link_options(granite-micro-frontend PRIVATE "-Wl,-z,max-page-size=16384")
endif()
