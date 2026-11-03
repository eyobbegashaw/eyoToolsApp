import { Language } from '../types';

export interface Translations {
  app_name: string;
  app_tagline: string;
  home: string;
  tools: string;
  history: string;
  settings: string;
  dark_mode: string;
  light_mode: string;
  system_mode: string;
  language: string;
  english: string;
  amharic: string;
  font_size: string;
  font_size_small: string;
  font_size_medium: string;
  font_size_large: string;
  about: string;
  contact: string;
  developer: string;
  version: string;
  version_code: string;
  cs_students: string;
  welcome: string;
  welcome_sub: string;
  cs_quote: string;
  select_tool: string;
  quick_actions: string;
  recent_activity: string;
  no_history_yet: string;
  clear_history: string;
  clear_history_confirm: string;
  storage_usage: string;
  clear_cache: string;
  cache_cleared: string;
  view_all_tools: string;
  back_to_home: string;
  back: string;
  loading: string;
  ok: string;
  cancel: string;
  close: string;
  save: string;
  copy: string;
  copied: string;
  clear: string;
  search: string;
  share: string;
  export_txt: string;
  export_png: string;
  export_audio: string;
  error: string;
  success: string;
  complete: string;
  extract: string;
  extracted_text: string;
  ready: string;
  warning: string;
  offline_badge: string;
  online_badge: string;
  mobile_native_info: string;
  export_project: string;

  // Tools names & descriptions
  youtube: string;
  youtube_desc: string;
  pdf_extract: string;
  pdf_extract_desc: string;
  pdf_audio: string;
  pdf_audio_desc: string;
  ocr: string;
  ocr_desc: string;
  qr: string;
  qr_desc: string;
  file_converter: string;
  file_converter_desc: string;
  md_editor: string;
  md_editor_desc: string;
  steganography: string;
  steganography_desc: string;
  bg_remover: string;
  bg_remover_desc: string;

  // Video Downloader
  enter_url: string;
  url_placeholder: string;
  fetch_info: string;
  fetching_info: string;
  video_info: string;
  video_title: string;
  author: string;
  duration: string;
  views: string;
  download_type: string;
  video_type: string;
  audio_type: string;
  select_quality: string;
  download: string;
  downloading: string;
  download_complete: string;
  download_error: string;
  download_cancel: string;
  video_notice_title: string;
  video_notice_desc: string;
  test_sample_urls: string;

  // PDF to Text
  select_pdf: string;
  choose_pdf: string;
  pdf_drop_zone: string;
  extract_text: string;
  extracting: string;
  page: string;
  of: string;
  pages: string;
  extracted_preview: string;
  scanned_pdf_warning: string;
  run_ocr_button: string;
  extracting_ocr: string;
  ocr_scanned_notice: string;
  ocr_language_label: string;
  search_in_text: string;
  characters_count: string;
  words_count: string;
  saved_successfully: string;

  // PDF to Audio
  tts_title: string;
  select_tts_lang: string;
  convert_to_speech: string;
  play: string;
  pause: string;
  resume: string;
  stop: string;
  speed: string;
  pitch: string;
  reading_progress: string;
  voice_selection: string;
  amharic_voice_note: string;
  tts_export_limitation: string;

  // OCR
  ocr_title: string;
  select_image: string;
  take_photo: string;
  choose_from_gallery: string;
  ocr_language: string;
  ocr_processing: string;
  ocr_confidence: string;
  ocr_empty_warning: string;
  ocr_ethiopic_note: string;
  ocr_instructions: string;

  // QR Tool
  qr_title: string;
  enter_text_or_url: string;
  generate_qr: string;
  generating_qr: string;
  qr_preview: string;
  error_correction: string;
  qr_foreground_color: string;
  qr_background_color: string;

  // QR Reader Tool
  qr_reader: string;
  qr_reader_desc: string;
  qr_reader_title: string;
  scan_with_camera: string;
  scan_from_file: string;
  qr_decoded_title: string;
  qr_type: string;
  qr_action_open: string;
  qr_action_copy: string;
  qr_no_code_found: string;
  qr_camera_permission: string;
  qr_camera_stop: string;
  qr_camera_start: string;
  qr_sample_code: string;
  qr_scanning_active: string;

  // File Converter Tool
  file_converter_title: string;
  conv_doc_pdf: string;
  conv_ppt_pdf: string;
  conv_md_pdf: string;
  convert_direction: string;
  select_file_to_convert: string;
  convert_action: string;
  converting_file: string;
  conversion_success: string;
  download_converted: string;
  original_format: string;
  target_format: string;
  test_sample_file: string;

  // Markdown Editor Tool
  md_editor_title: string;
  edit_tab: string;
  preview_tab: string;
  split_tab: string;
  export_md: string;
  export_pdf: string;
  load_cs_template: string;
  words: string;
  lines: string;
  chars: string;
  reading_time: string;
  open_md_file: string;

  // Steganography
  stego_title: string;
  mode_hide: string;
  mode_reveal: string;
  enter_secret_message: string;
  secret_placeholder: string;
  revealed_message: string;
  hiding_message: string;
  revealing_message: string;
  no_hidden_message: string;
  message_too_large: string;
  lsb_explanation: string;

  // Background Remover
  bg_title: string;
  remove_bg: string;
  removing_bg: string;
  bg_threshold: string;
  original_preview: string;
  result_preview: string;
  bg_algorithm_info: string;

  // About developer
  about_dev_name: string;
  about_dev_role: string;
  about_dev_bio: string;
  about_dev_ethiopia: string;
  portfolio: string;
  github: string;
  copyright: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    app_name: 'eyoTools',
    app_tagline: 'CS Student Edition • Mobile Toolkit',
    home: 'Home',
    tools: 'Tools',
    history: 'History',
    settings: 'Settings',
    dark_mode: 'Dark Mode',
    light_mode: 'Light Mode',
    system_mode: 'System Theme',
    language: 'Language',
    english: 'English',
    amharic: 'አማርኛ',
    font_size: 'Font Size',
    font_size_small: 'Compact',
    font_size_medium: 'Standard',
    font_size_large: 'Comfortable',
    about: 'About eyoTools',
    contact: 'Contact & Portfolio',
    developer: 'Developer Profile',
    version: 'Version 1.0.0',
    version_code: 'v1.0.0',
    cs_students: 'For Students, By a  Student',
    welcome: 'Welcome to eyoTools Mobile',
    welcome_sub: 'Your Ultimate Toolkit on Android',
    cs_quote: '"Code is like humor. When you have to explain it, it\'s bad." – Cory House',
    select_tool: 'Select a utility tool to begin processing',
    quick_actions: 'Quick Actions',
    recent_activity: 'Recent History',
    no_history_yet: 'No processed items yet. Open any tool to get started!',
    clear_history: 'Clear History',
    clear_history_confirm: 'Are you sure you want to delete all processing history?',
    storage_usage: 'Local Storage Used',
    clear_cache: 'Clear Cached Files',
    cache_cleared: 'Cached files and temporary buffers cleared successfully.',
    view_all_tools: 'View All Tools',
    back_to_home: 'Back to Home',
    back: 'Back',
    loading: 'Loading...',
    ok: 'OK',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    copy: 'Copy to Clipboard',
    copied: 'Copied to clipboard!',
    clear: 'Clear All',
    search: 'Search...',
    share: 'Share',
    export_txt: 'Export TXT',
    export_png: 'Export PNG',
    export_audio: 'Save Audio',
    error: 'An error occurred',
    success: 'Operation completed successfully',
    complete: 'Process completed successfully!',
    extract: 'Extract Text',
    extracted_text: 'Extracted Content',
    ready: 'Ready',
    warning: 'Notice',
    offline_badge: 'Offline Capable',
    online_badge: 'Requires Internet',
    mobile_native_info: 'Runs locally using Android Native APIs / On-Device engines.',
    export_project: 'Export React Native Project',

    youtube: 'Video Downloader',
    youtube_desc: 'Analyze video URLs, inspect streams, resolution & file size',
    pdf_extract: 'PDF to Text',
    pdf_extract_desc: 'Local text extraction with paragraph parsing and search',
    pdf_audio: 'PDF to Audio',
    pdf_audio_desc: 'Listen to PDF documents with real on-device text-to-speech',
    ocr: 'Image to Text (OCR)',
    ocr_desc: 'Extract English & Ethiopic Amharic text from photos offline',
    qr: 'QR Code Generator',
    qr_desc: 'Generate customizable vector QR codes with colors and error correction',
    qr_reader: 'QR Code Reader',
    qr_reader_desc: 'Scan & decode QR codes from camera or image files',
    file_converter: 'File Converter',
    file_converter_desc: 'Convert DOCX ↔ PDF, PPTX → PDF, and MD → PDF',
    md_editor: 'Markdown Studio',
    md_editor_desc: 'Write, live preview, and export to MD or styled PDF',
    steganography: 'Steganography',
    steganography_desc: 'Hide & reveal secret encrypted UTF-8 messages in image pixels (LSB)',
    bg_remover: 'Background Remover',
    bg_remover_desc: 'Extract foreground objects and generate transparent PNGs',

    enter_url: 'Video URL or Stream Link',
    url_placeholder: 'https://www.youtube.com/watch?v=... or direct MP4/stream URL',
    fetch_info: 'Analyze Stream',
    fetching_info: 'Connecting and fetching stream metadata...',
    video_info: 'Stream Information',
    video_title: 'Title',
    author: 'Author / Channel',
    duration: 'Duration',
    views: 'Views',
    download_type: 'Output Format',
    video_type: 'Video (MP4)',
    audio_type: 'Audio Track (MP3/M4A)',
    select_quality: 'Select Resolution / Bitrate',
    download: 'Download File',
    downloading: 'Downloading Stream...',
    download_complete: 'Download completed successfully!',
    download_error: 'Download failed. Please verify the URL and network connection.',
    download_cancel: 'Cancel Download',
    video_notice_title: 'Platform Restrictions & Legal Compliance',
    video_notice_desc: 'Per Google Play and YouTube Terms of Service, arbitrary restricted streams may require direct API authorization. Supported open streams and permissive direct URLs download directly with complete progress tracking.',
    test_sample_urls: 'Try Sample Permissive Streams',

    select_pdf: 'Select PDF Document',
    choose_pdf: 'Choose PDF File',
    pdf_drop_zone: 'Tap or drop a PDF document to begin local text extraction',
    extract_text: 'Extract Text Now',
    extracting: 'Extracting document text...',
    page: 'Page',
    of: 'of',
    pages: 'Total Pages',
    extracted_preview: 'Extracted Content',
    scanned_pdf_warning: 'Notice: This PDF contains image-only scanned pages without embedded text layers. Use "Image to Text (OCR)" for scanned documents.',
    run_ocr_button: 'Extract Text with OCR',
    extracting_ocr: 'Running OCR character recognition...',
    ocr_scanned_notice: 'This document appears to be a scanned image PDF. You can directly run OCR below to extract all text.',
    ocr_language_label: 'OCR Language',
    search_in_text: 'Filter & Search within extracted text...',
    characters_count: 'Characters',
    words_count: 'Words',
    saved_successfully: 'File saved successfully to device storage!',

    tts_title: 'PDF to Audio Reader',
    select_tts_lang: 'Speech Language',
    convert_to_speech: 'Initialize Audio Player',
    play: 'Play',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop Playback',
    speed: 'Reading Speed',
    pitch: 'Voice Pitch',
    reading_progress: 'Playback Progress',
    voice_selection: 'Voice Engine',
    amharic_voice_note: 'Amharic (አማርኛ) reading relies on the installed Android TTS voice engine (e.g., Google Speech Services). If your device lacks an Amharic voice pack, install it under Android Settings > Accessibility > Text-to-Speech.',
    tts_export_limitation: 'Notice: Text-To-Speech is generated via the real-time device audio synthesizer. Exporting an offline MP3 audio file requires Android MediaMuxer / remote server rendering.',

    ocr_title: 'Image to Text (OCR)',
    select_image: 'Choose Image for Recognition',
    take_photo: 'Capture with Camera',
    choose_from_gallery: 'Choose from Gallery',
    ocr_language: 'Recognition Language',
    ocr_processing: 'Analyzing image characters with Tesseract engine...',
    ocr_confidence: 'Confidence Score',
    ocr_empty_warning: 'No readable text was detected in the selected image. Please ensure the image is clear and well-lit.',
    ocr_ethiopic_note: 'Ethiopic / Amharic OCR uses the official Tesseract traineddata package with full Fidel glyph recognition.',
    ocr_instructions: 'High-contrast text on flat backgrounds yields the highest recognition accuracy.',

    qr_title: 'QR Code Generator',
    enter_text_or_url: 'Content to Encode',
    generate_qr: 'Generate QR Code',
    generating_qr: 'Generating high-resolution QR matrix...',
    qr_preview: 'QR Code Preview',
    error_correction: 'Error Correction Level',
    qr_foreground_color: 'Foreground Color',
    qr_background_color: 'Background Color',

    qr_reader_title: 'QR Code Reader & Scanner',
    scan_with_camera: 'Camera Scanner',
    scan_from_file: 'Scan from Image',
    qr_decoded_title: 'Decoded QR Content',
    qr_type: 'Detected Type',
    qr_action_open: 'Open Link',
    qr_action_copy: 'Copy Content',
    qr_no_code_found: 'No QR code detected in this image. Ensure the QR code is clearly focused and well-lit.',
    qr_camera_permission: 'Camera permission is required to scan QR codes with your device camera.',
    qr_camera_stop: 'Stop Camera',
    qr_camera_start: 'Start Camera',
    qr_sample_code: 'Test with Sample QR Code',
    qr_scanning_active: 'Point camera at any QR code...',

    // File Converter
    file_converter_title: 'Document & Presentation Converter',
    conv_doc_pdf: 'Word ↔ PDF',
    conv_ppt_pdf: 'PowerPoint ↔ PDF',
    conv_md_pdf: 'Markdown ↔ PDF',
    convert_direction: 'Conversion Mode',
    select_file_to_convert: 'Select Document to Convert',
    convert_action: 'Convert File Now',
    converting_file: 'Converting document structure and formatting...',
    conversion_success: 'Document converted successfully!',
    download_converted: 'Download Converted File',
    original_format: 'Source Format',
    target_format: 'Output Format',
    test_sample_file: 'Load Sample Document',

    // Markdown Editor
    md_editor_title: 'Markdown Studio & Document Exporter',
    edit_tab: 'Editor',
    preview_tab: 'Live Preview',
    split_tab: 'Side-by-Side',
    export_md: 'Export .MD',
    export_pdf: 'Export as PDF',
    load_cs_template: 'CS Templates',
    words: 'Words',
    lines: 'Lines',
    chars: 'Characters',
    reading_time: 'Read Time',
    open_md_file: 'Import Markdown File',

    stego_title: 'LSB Image Steganography',
    mode_hide: 'Hide Message',
    mode_reveal: 'Reveal Message',
    enter_secret_message: 'Confidential Message to Encode',
    secret_placeholder: 'Enter secret message to embed into image pixels...',
    revealed_message: 'Decoded Hidden Message',
    hiding_message: 'Injecting UTF-8 bits into Least Significant Bits (LSB)...',
    revealing_message: 'Scanning pixel bit planes for 16-bit termination sequence...',
    no_hidden_message: 'No secret message detected in this image. Make sure you selected the uncompressed PNG generated with eyoTools.',
    message_too_large: 'Message exceeds the pixel capacity of this image.',
    lsb_explanation: 'Embeds data into the least significant bit of each RGB pixel with the exact 16-bit terminator sequence (1111111111111110) from the original desktop app. Completely invisible to the naked eye.',

    bg_title: 'Background Remover',
    remove_bg: 'Remove Background',
    removing_bg: 'Isolating foreground subject and removing background...',
    bg_threshold: 'Color Threshold Tolerance',
    original_preview: 'Original Image',
    result_preview: 'Transparent Result',
    bg_algorithm_info: 'Isolates the foreground subject and generates clean alpha transparency.',

    about_dev_name: 'Dn Eyob Begashaw',
    about_dev_role: 'Computer Science Student & Software Engineer',
    about_dev_bio: 'Developer and creator of eyoTools. Built with passion to provide an all-in-one suite of essential utilities.',
    about_dev_ethiopia: 'Addis Ababa, Ethiopia',
    portfolio: 'Portfolio Website',
    github: 'GitHub Profile',
    copyright: '© 2025-2026 eyoTools. All rights reserved.',
  },

  am: {
    app_name: 'ኢዮ መሳሪያዎች',
    app_tagline: 'የኮምፒውተር ሳይንስ ተማሪዎች ዕትም • የሞባይል ስብስብ',
    home: 'መነሻ',
    tools: 'መሳሪያዎች',
    history: 'ታሪክ',
    settings: 'ማስተካከያ',
    dark_mode: 'ጨለማ ሁነታ',
    light_mode: 'ብርሃን ሁነታ',
    system_mode: 'የስርዓቱ ገጽታ',
    language: 'ቋንቋ',
    english: 'English',
    amharic: 'አማርኛ',
    font_size: 'የፊደል መጠን',
    font_size_small: 'ትንሽ',
    font_size_medium: 'መካከለኛ',
    font_size_large: 'ትልቅ',
    about: 'ስለ ኢዮ መሳሪያዎች',
    contact: 'መገናኛ እና ፖርትፎሊዮ',
    developer: 'የገንቢ መረጃ',
    version: 'እትም 1.0.0',
    version_code: 'v1.0.0',
    cs_students: 'ለተማሪዎች፣ ከተማሪ',
    welcome: 'እንኳን ወደ ኢዮ መሳሪያዎች በደህና መጡ',
    welcome_sub: 'የእርስዎ የተሟላ መሳሪያዎች ስብስብ በስልክዎ ላይ',
    cs_quote: '"ኮድ እንደ ቀልድ ነው። ማስረዳት ሲያስፈልገው ጥሩ አይደለም።" – ኮሪ ሃውስ',
    select_tool: 'ስራ ለመጀመር ከዚህ በታች ካሉት መሳሪያዎች አንዱን ይምረጡ',
    quick_actions: 'ፈጣን ተግባራት',
    recent_activity: 'የቅርብ ጊዜ ክንውኖች',
    no_history_yet: 'እስካሁን ምንም የተሰራ ሰነድ የለም። ማንኛውንም መሳሪያ ተጠቅመው ይጀምሩ!',
    clear_history: 'ታሪክን አጽዳ',
    clear_history_confirm: 'ሁሉንም የተሰሩ ሰነዶች ታሪክ መሰረዝ ይፈልጋሉ?',
    storage_usage: 'ጥቅም ላይ የዋለ ማከማቻ',
    clear_cache: 'ጊዜያዊ ፋይሎችን አጽዳ',
    cache_cleared: 'ጊዜያዊ ፋይሎች በተሳካ ሁኔታ ተጠርገዋል።',
    view_all_tools: 'ሁሉንም መሳሪያዎች እይ',
    back_to_home: 'ወደ መነሻ ተመለስ',
    back: 'ተመለስ',
    loading: 'በመጫን ላይ...',
    ok: 'እሺ',
    cancel: 'ሰርዝ',
    close: 'ዝጋ',
    save: 'አስቀምጥ',
    copy: 'ጽሁፉን ቅዳ',
    copied: 'ጽሁፍ ወደ ቅንጥብ ሰሌዳ ተቀድቷል!',
    clear: 'ሁሉንም አጽዳ',
    search: 'ፈልግ...',
    share: 'አጋራ',
    export_txt: 'እንደ TXT አስቀምጥ',
    export_png: 'እንደ PNG አስቀምጥ',
    export_audio: 'ድምጹን አስቀምጥ',
    error: 'ስህተት ተከስቷል',
    success: 'ተግባሩ በተሳካ ሁኔታ ተጠናቋል',
    complete: 'ተግባሩ በተሳካ ሁኔታ ተጠናቋል!',
    extract: 'ጽሁፍ አውጣ',
    extracted_text: 'የተወጣ ጽሁፍ',
    ready: 'ዝግጁ',
    warning: 'ማሳሰቢያ',
    offline_badge: 'ያለ ኢንተርኔት ይሰራል',
    online_badge: 'ኢንተርኔት ያስፈልጋል',
    mobile_native_info: 'በስልክዎ ውስጥ ባሉ የአንድሮይድ ቴክኖሎጂዎች ያለ ክፍያ ይሰራል',
    export_project: 'የ React Native ፕሮጀክት አውርድ',

    youtube: 'ዩቲዩብ አውራጅ',
    youtube_desc: 'የቪዲዮ አድራሻዎችን መርምር፣ ጥራት እና መጠን መርጠህ አውርድ',
    pdf_extract: 'PDF ወደ ጽሁፍ',
    pdf_extract_desc: 'ከ PDF ሰነዶች ላይ ጽሁፎችን በቀጥታ እና ያለ ኢንተርኔት አውጣ',
    pdf_audio: 'PDF ወደ ድምጽ',
    pdf_audio_desc: 'የ PDF ሰነዶችን በድምጽ አንባቢ በቀላሉ አዳምጥ',
    ocr: 'ምስል ወደ ጽሁፍ (OCR)',
    ocr_desc: 'ከፎቶ ላይ የእንግሊዝኛ እና የአማርኛ ጽሁፎችን ለይተህ አውጣ',
    qr: 'QR ኮድ አመንጪ',
    qr_desc: 'ከጽሁፍ ወይም ከድረ-ገጽ አድራሻ ያማሩ የ QR ኮዶችን አመንጭ',
    qr_reader: 'QR ኮድ አንባቢ',
    qr_reader_desc: 'ከካሜራ ወይም ከምስል ላይ የ QR ኮዶችን በቀላሉ አንብብ',
    steganography: 'ስውር መልእክት',
    steganography_desc: 'በምስል ፒክሰሎች ውስጥ ሚስጥራዊ መልእክት ደብቅ እና አውጣ',
    bg_remover: 'ዳራ አስወጋጅ',
    bg_remover_desc: 'ከምስሎች ላይ ጀርባውን አስወግደህ ግልጽ (PNG) ምስል አዘጋጅ',
    file_converter: 'የሰነድ እና ስላይድ መቀየሪያ',
    file_converter_desc: 'Word (DOCX) ↔ PDF ቀይር፤ PowerPoint (PPTX) እና Markdown ወደ PDF ቀይር',
    md_editor: 'የማርክዳውን (MD) አርታዒ',
    md_editor_desc: 'ማርክዳውን ጽሁፎችን አዘጋጅ፣ በቀጥታ እይ፣ እና ወደ .md ወይም ያማረ PDF ቀይረህ አውርድ',

    enter_url: 'የቪዲዮ ወይም የዥረት አድራሻ',
    url_placeholder: 'https://www.youtube.com/watch?v=... ወይም የቪዲዮ አድራሻ ያስገቡ',
    fetch_info: 'መረጃውን አምጣ',
    fetching_info: 'የቪዲዮውን መረጃ በማምጣት ላይ...',
    video_info: 'የቪዲዮ መረጃ',
    video_title: 'ርዕስ',
    author: 'አቅራቢ / ቻናል',
    duration: 'የቆይታ ጊዜ',
    views: 'የተመልካች ብዛት',
    download_type: 'የማውረጃ አይነት',
    video_type: 'ቪዲዮ (MP4)',
    audio_type: 'ድምጽ ብቻ (MP3/M4A)',
    select_quality: 'የጥራት ደረጃ ይምረጡ',
    download: 'አውርድ',
    downloading: 'በማውረድ ላይ...',
    download_complete: 'ማውረድ በተሳካ ሁኔታ ተጠናቋል!',
    download_error: 'ማውረድ አልተሳካም። እባክዎ አድራሻውን እና ኢንተርኔትዎን ያረጋግጡ።',
    download_cancel: 'ማውረድ ሰርዝ',
    video_notice_title: 'የመተግበሪያ እና የህግ ደንቦች',
    video_notice_desc: 'በጉግል ፕሌይ እና በዩቲዩብ የህግ ደንቦች መሰረት የተከለከሉ ቪዲዮዎች ልዩ ፈቃድ ሊያስፈልጋቸው ይችላል። የተፈቀዱ እና ቀጥተኛ የሆኑ ቪዲዮዎች በቀጥታ ይወርዳሉ።',
    test_sample_urls: 'የተፈቀዱ የሙከራ ቪዲዮዎችን ሞክር',

    select_pdf: 'የ PDF ሰነድ ይምረጡ',
    choose_pdf: 'PDF ፋይል ምረጥ',
    pdf_drop_zone: 'PDF ሰነድ ለመምረጥ እዚህ ይጫኑ ወይም ይጎትቱ',
    extract_text: 'ጽሁፉን አውጣ',
    extracting: 'ጽሁፍ ከሰነዱ ላይ በማውጣት ላይ...',
    page: 'ገጽ',
    of: 'ከ',
    pages: 'አጠቃላይ ገጾች',
    extracted_preview: 'የተወጣ ጽሁፍ ቅድመ እይታ',
    scanned_pdf_warning: 'ማሳሰቢያ፡ ይህ ሰነድ በስካነር የተነሳ የምስል PDF በመሆኑ ጽሁፍ የለውም። "ምስል ወደ ጽሁፍ (OCR)" መሳሪያን ይጠቀሙ።',
    run_ocr_button: 'በ OCR ጽሁፉን አውጣ',
    extracting_ocr: 'በ OCR ጽሁፍ በማንበብ ላይ...',
    ocr_scanned_notice: 'ይህ ሰነድ በስካነር የተነሳ የምስል PDF ነው። ከታች ያለውን የ OCR ማወቂያ በመጠቀም ጽሁፉን ማውጣት ይችላሉ።',
    ocr_language_label: 'የማወቂያ ቋንቋ',
    search_in_text: 'በተወጣው ጽሁፍ ውስጥ ፈልግ...',
    characters_count: 'የፊደላት ብዛት',
    words_count: 'የቃላት ብዛት',
    saved_successfully: 'ፋይሉ በስልክዎ ማከማቻ ውስጥ በተሳካ ሁኔታ ተቀምጧል!',

    tts_title: 'PDF ወደ ድምጽ አንባቢ',
    select_tts_lang: 'የማንበቢያ ቋንቋ',
    convert_to_speech: 'የድምጽ ማጫወቻውን አዘጋጅ',
    play: 'አጫውት',
    pause: 'አፍታ አቁም',
    resume: 'ቀጥል',
    stop: 'አቁም',
    speed: 'የንባብ ፍጥነት',
    pitch: 'የድምጽ ቃና',
    reading_progress: 'የንባብ ሂደት',
    voice_selection: 'የድምጽ አይነት',
    amharic_voice_note: 'የአማርኛ ንባብ በስልክዎ የአንድሮይድ ድምጽ አንባቢ (TTS) ላይ ይመረኮዛል። ስልክዎ የአማርኛ ድምጽ ከሌለው በአንድሮይድ Settings > Accessibility > Text-to-Speech ውስጥ ጫን።',
    tts_export_limitation: 'ማሳሰቢያ፡ ድምጹ የሚፈጠረው በስልክዎ የድምጽ ሞተር በቀጥታ ነው። ወደ MP3 ፋይል ለመቀየር የአንድሮይድ MediaMuxer ወይም የውጭ ሰርቨር ያስፈልጋል።',

    ocr_title: 'ምስል ወደ ጽሁፍ (OCR)',
    select_image: 'ጽሁፍ ያለበትን ምስል ይምረጡ',
    take_photo: 'በካሜራ አንሳ',
    choose_from_gallery: 'ከጋለሪ ምረጥ',
    ocr_language: 'የጽሁፍ ቋንቋ',
    ocr_processing: 'የምስሉን ፊደላት በ Tesseract ሞተር በማንበብ ላይ...',
    ocr_confidence: 'የንባብ እርግጠኝነት',
    ocr_empty_warning: 'በተመረጠው ምስል ላይ ምንም ጽሁፍ አልተገኘም። እባክዎ ምስሉ ግልጽ መሆኑን ያረጋግጡ።',
    ocr_ethiopic_note: 'የአማርኛ ፊደላት ንባብ ኦፊሴላዊውን የ Tesseract Amharic የፊደላት ማወቂያ ይጠቀማል።',
    ocr_instructions: 'ጥሩ ብርሃን እና ጥራት ያላቸው ምስሎች ከፍተኛ ውጤት ይሰጣሉ።',

    qr_title: 'QR ኮድ አመንጪ',
    enter_text_or_url: 'የሚቀየር ጽሁፍ ወይም አድራሻ',
    generate_qr: 'QR ኮድ አመንጭ',
    generating_qr: 'ጥራት ያለው QR ኮድ በማዘጋጀት ላይ...',
    qr_preview: 'የተዘጋጀው QR ኮድ',
    error_correction: 'የስህተት ማረሚያ ደረጃ',
    qr_foreground_color: 'የኮዱ ቀለም',
    qr_background_color: 'የጀርባው ቀለም',

    qr_reader_title: 'QR ኮድ አንባቢ እና ስካነር',
    scan_with_camera: 'በካሜራ ስካን አድርግ',
    scan_from_file: 'ከምስል አንብብ',
    qr_decoded_title: 'የተነበበው የ QR ኮድ መልእክት',
    qr_type: 'የመልእክቱ አይነት',
    qr_action_open: 'አድራሻውን ክፈት',
    qr_action_copy: 'ጽሁፉን ቅዳ',
    qr_no_code_found: 'በምስሉ ላይ ምንም የ QR ኮድ አልተገኘም። እባክዎ ምስሉ ግልጽ እና ብሩህ መሆኑን ያረጋግጡ።',
    qr_camera_permission: 'በስልክዎ ካሜራ የ QR ኮድ ለማንበብ የካሜራ ፈቃድ ያስፈልጋል።',
    qr_camera_stop: 'ካሜራ አቁም',
    qr_camera_start: 'ካሜራ አስጀምር',
    qr_sample_code: 'በናሙና QR ኮድ ሞክር',
    qr_scanning_active: 'ካሜራውን ወደ QR ኮዱ ያነጣጥሩ...',

    // File Converter
    file_converter_title: 'የሰነድ እና የስላይድ መቀየሪያ',
    conv_doc_pdf: 'Word ↔ PDF',
    conv_ppt_pdf: 'PowerPoint ↔ PDF',
    conv_md_pdf: 'Markdown ↔ PDF',
    convert_direction: 'የመቀየሪያ አቅጣጫ',
    select_file_to_convert: 'የሚቀየረውን ሰነድ ይምረጡ',
    convert_action: 'ሰነዱን አሁን ቀይር',
    converting_file: 'የሰነዱን ቅርጽ እና ይዘት በመቀየር ላይ...',
    conversion_success: 'ሰነዱ በተሳካ ሁኔታ ተቀይሯል!',
    download_converted: 'የተቀየረውን ፋይል አውርድ',
    original_format: 'የመነሻ ቅርጸት',
    target_format: 'የመጨረሻ ቅርጸት',
    test_sample_file: 'የሙከራ ሰነድ ጫን',

    // Markdown Editor
    md_editor_title: 'የማርክዳውን (MD) አርታዒ እና ሰነድ ማመንጪያ',
    edit_tab: 'ማስተካከያ',
    preview_tab: 'ቅድመ-ዕይታ',
    split_tab: 'ጎን ለጎን',
    export_md: 'በ .MD አስቀምጥ',
    export_pdf: 'በ PDF አስቀምጥ',
    load_cs_template: 'የኮምፒውተር ሳይንስ ናሙናዎች',
    words: 'ቃላት',
    lines: 'መስመሮች',
    chars: 'ፊደላት',
    reading_time: 'የንባብ ጊዜ',
    open_md_file: 'የማርክዳውን ፋይል ክፈት',

    stego_title: 'በምስል ውስጥ ስውር መልእክት',
    mode_hide: 'መልእክት ደብቅ',
    mode_reveal: 'መልእክት አውጣ',
    enter_secret_message: 'የሚደበቅ ሚስጥራዊ መልእክት',
    secret_placeholder: 'በምስሉ ፒክሰሎች ውስጥ የሚደበቀውን መልእክት እዚህ ያስገቡ...',
    revealed_message: 'የተገኘው ስውር መልእክት',
    hiding_message: 'መልእክቱን በፒክሰሎች ውስጥ (LSB) በመደበቅ ላይ...',
    revealing_message: 'በፒክሰሎቹ ውስጥ 16-ቢት መዝጊያውን በመፈለግ ላይ...',
    no_hidden_message: 'በዚህ ምስል ውስጥ ምንም የተደበቀ መልእክት አልተገኘም። በ eyoTools የተዘጋጀ ያልተጨመቀ PNG መሆኑን ያረጋግጡ።',
    message_too_large: 'መልእክቱ ከምስሉ የመያዝ አቅም በላይ ረጅም ነው።',
    lsb_explanation: 'በመጀመሪያው የዴስክቶፕ መተግበሪያ እንደነበረው ባለ 16-ቢት መዝጊያ (1111111111111110) በመጠቀም በፒክሰሎቹ ውስጥ መረጃውን ይደብቃል። በዓይን አይታይም።',

    bg_title: 'የምስል ዳራ አስወጋጅ',
    remove_bg: 'ዳራ አስወግድ',
    removing_bg: 'የጀርባውን ቀለም በመለየት ዳራውን በማስወገድ ላይ...',
    bg_threshold: 'የቀለም መቻቻል መጠን',
    original_preview: 'ዋናው ምስል',
    result_preview: 'ዳራው የተወገደለት ምስል',
    bg_algorithm_info: 'ዋናውን ምስል በንጽህና ለይቶ በማውጣት ዳራውን በግልፅነት (transparency) ያስወግዳል።',

    about_dev_name: 'ዲ/ን እዮብ በጋሻው',
    about_dev_role: 'የኮምፒውተር ሳይንስ ተማሪ እና የሶፍትዌር መሐንዲስ',
    about_dev_bio: 'የ eyoTools መተግበሪያ ፈጣሪ እና ገንቢ። ጠቃሚ የሆኑ መሳሪያዎችን በአንድ ላይ ለማቅረብ የተሰራ።',
    about_dev_ethiopia: 'አዲስ አበባ፣ ኢትዮጵያ',
    portfolio: 'የግል ፖርትፎሊዮ ድረ-ገጽ',
    github: 'የ GitHub ገጽ',
    copyright: '© 2025-2026 ኢዮ መሳሪያዎች። መብቱ በህግ የተጠበቀ ነው።',
  },
};
