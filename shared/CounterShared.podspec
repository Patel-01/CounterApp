require 'json'

Pod::Spec.new do |s|
  s.name         = 'CounterShared'
  s.version      = '0.0.1'
  s.summary      = 'C++ Counter TurboModule (shared logic for iOS and Android).'
  s.license      = 'MIT'
  s.authors      = { 'CounterApp' => 'noreply@example.com' }
  s.homepage     = 'https://github.com/local/CounterApp'
  s.platforms    = { :ios => '15.1' }
  s.source       = { :git => 'https://github.com/local/CounterApp.git' }
  s.source_files = 'cpp/**/*.{h,cpp}', 'ios/**/*.{h,mm}'
  s.header_dir   = 'CounterShared'
  s.requires_arc = false
  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited)'
  }

  install_modules_dependencies(s)
  s.dependency 'ReactCodegen'
end
