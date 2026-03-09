cmake_minimum_required(VERSION 3.14)
project(granite-screen-tests LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(FetchContent)
FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG v1.14.0
)
FetchContent_MakeAvailable(googletest)

enable_testing()

set(MAIN_CPP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../main/cpp")

add_executable(
    FileReaderTest
    FileReaderTest.cpp
    ${MAIN_CPP_DIR}/FileReader.cpp
)

target_include_directories(
    FileReaderTest
    PRIVATE
    "${CMAKE_CURRENT_SOURCE_DIR}/../../main/cpp"
)

target_link_libraries(
    FileReaderTest
    GTest::gtest_main
)

include(GoogleTest)
gtest_discover_tests(FileReaderTest)
