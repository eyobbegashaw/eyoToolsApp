Pod::Spec.new do |s|
  s.name           = 'PdfPageRenderer'
  s.version        = '1.0.0'
  s.summary        = 'On-device PDF page rasterization'
  s.description    = 'Renders local PDF pages to images for appearance-preserving conversion.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '13.0',
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
