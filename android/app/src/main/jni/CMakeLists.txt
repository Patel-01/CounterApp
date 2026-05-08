# Custom CMakeLists for the app's native module — overrides the default RN
# template so the shared C++ counter logic is compiled and the JSI bridge for
# our codegen spec is wired in.

cmake_minimum_required(VERSION 3.13)

project(appmodules)

# The shared C++ logic lives outside the Android folder so iOS can use it too.
# CMakeLists is at android/app/src/main/jni — five levels up reaches the repo
# root.
set(SHARED_CPP_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../shared/cpp)

# Bring in RN's helper which globs *.cpp from the current directory + the
# autolinking-generated cpp into a shared library named ${CMAKE_PROJECT_NAME}.
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# Add the shared logic to the same library and expose its headers for OnLoad.cpp.
target_sources(${CMAKE_PROJECT_NAME} PRIVATE
  ${SHARED_CPP_DIR}/Counter.cpp
  ${SHARED_CPP_DIR}/NativeCounterModule.cpp
)

target_include_directories(${CMAKE_PROJECT_NAME} PRIVATE
  ${SHARED_CPP_DIR}
  ${PROJECT_BUILD_DIR}/generated/source/codegen/jni
)

# Codegen produces a static library `react_codegen_AppSpecs` with bridging
# helpers and the AppSpecsJSI.h header. Link it so our C++ TurboModule can
# subclass NativeCounterCxxSpec.
target_link_libraries(${CMAKE_PROJECT_NAME} react_codegen_AppSpecs)
