Pod::Spec.new do |s|
  s.name           = 'LoveLockShield'
  s.version        = '1.0.0'
  s.summary        = 'Love Lock Screen Time bridge for Expo'
  s.description    = 'Local Expo module that exposes Love Lock iOS Screen Time and scheduling primitives.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.0'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
