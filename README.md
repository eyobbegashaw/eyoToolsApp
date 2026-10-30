# eyoTools Mobile - Production React Native & Expo Android App

[![Platform: Android](https://img.shields.io/badge/Platform-Android-green.svg)]()
[![Engine: Expo 52 / React Native 0.76](https://img.shields.io/badge/Expo-SDK_52-blue.svg)]()
[![TypeScript: Verified 100%](https://img.shields.io/badge/TypeScript-Strict_Verified-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)]()

> Developed by **Dn Eyob Begashaw** • Addis Ababa, Ethiopia  
> *For Computer Science Students, By a Computer Science Student*
https://expo.dev/accounts/engda/projects/eyotools-mobile/builds/fd92f3a1-b7b0-4d9a-8b4a-e1ae9446c921
eyoTools Mobile is a complete, standalone native Android application converted from the eyoTools desktop utility suite. It features full bilingual support (**English & Amharic አማርኛ**), adaptive dark/light themes, offline-first execution, and a modular architecture matching the Google AI Studio Web Preview.

---

## 🛠️ Architecture & Verification Status

| Tool | Status | Engine / Implementation | Offline / Online |
|---|---|---|---|
| **📄 PDF to Text** | ✅ Complete | On-device PDF-1.4 stream parser; accurately detects scanned PDFs and prompts for OCR rather than returning raw binary bytes | **100% Offline** |
| **🔄 File Converter** | ✅ Complete | Converts DOCX ↔ PDF, PPTX → PDF, and MD → PDF without adding converter labels to the converted document | **100% Offline** |
| **📝 Markdown Studio** | ✅ Complete | Live side-by-side editor, syntax toolbar, CS templates, and direct export to Markdown (.md) or genuine binary PDF | **100% Offline** |
| **🔊 PDF to Audio** | ✅ Complete | Android TTS Synthesizer (`expo-speech`), speech rate, pitch, and voice settings with progress tracking | **100% Offline** |
| **🔍 Image to Text (OCR)**| ✅ Complete | Vision OCR Engine with native support for Latin (`eng`) & Ethiopic / Amharic (`amh` አማርኛ) script; reports real confidence & lines | **Online Engine** (Wi-Fi/Cellular) |
| **🏁 QR Code Generator** | ✅ Complete | High-Resolution Vector Matrix (`react-native-qrcode-svg`) with customizable colors & sharing | **100% Offline** |
| **📷 QR Code Scanner** | ✅ Complete | Real-time Camera & Image file scanner with clipboard copy & URL opener | **100% Offline** |
| **🔒 Steganography** | ✅ Complete | 16-bit LSB Terminator (`1111111111111110`) Hide & Extract message algorithms | **100% Offline** |
| **✂️ Background Remover** | ✅ Complete | 4-Corner Euclidean Color Variance Mask generator with tolerance controls | **100% Offline** |
| **📹 Video Downloader** | ✅ Complete | Genuine resumable media downloader (`FileSystem.createDownloadResumable`) with real byte tracking; rejects DRM/YouTube with clear notice | **Online Stream** |
| **📜 History & Storage** | ✅ Complete | Persistent `@react-native-async-storage/async-storage` with storage calculator | **100% Offline** |
| **🎨 Settings & Appearance**| ✅ Complete | Dark, Light & System themes, dynamic font scaling, Amharic localization | **100% Offline** |

---

## 💻 How to Run and Test on Your PC (Windows PowerShell)

### Prerequisites
1. Install **Node.js (LTS version 18 or 20)** from [https://nodejs.org](https://nodejs.org).
2. Install the **Expo Go** app on your Android smartphone from the Google Play Store (for physical phone testing).

---

### Step 1: Open PowerShell and Navigate to Mobile Project
```powershell
cd mobile
```

### Step 2: Install All Locked Dependencies
```powershell
npm install
```

### Step 3: Run TypeScript Verification
Verify that the codebase has zero syntax or type errors:
```powershell
npm run check
# or: npx tsc --noEmit
```

### Step 4: Start the Expo Development Server
```powershell
npx expo start
```

- A large QR code will render directly in your Windows terminal.
- Open **Expo Go** on your Android smartphone and scan the QR code to run the app immediately.
- Press `a` in the terminal to launch in an Android Emulator (if Android Studio emulator is installed).
- Press `w` in the terminal to launch in web preview mode.

---

## 📦 How to Build Standalone APK Without Android Studio (EAS Cloud Build)

You do **NOT** need Android Studio or heavy local SDK installations to build a distributable Android `.apk` file. Expo provides free cloud builds via **EAS (Expo Application Services)**:

### 1. Install EAS CLI globally:
```powershell
npm install -g eas-cli
```

### 2. Log in to your free Expo account:
```powershell
eas login
```
*(If you do not have an account, create one for free at [https://expo.dev/signup](https://expo.dev/signup))*

### 3. Generate Standalone Android APK (.apk):
Run this single command:
```powershell
eas build -p android --profile preview
```

- EAS will provision a cloud builder, package the Android project, and generate a downloadable `.apk`.
- When complete (typically 3–5 minutes), a direct download link and QR code are displayed in PowerShell.
- Download the `.apk` directly to your Android device and install it.

### 4. Generate Production Google Play Bundle (.aab):
When ready to publish to Google Play Store:
```powershell
eas build -p android --profile production
```

---

## 🔒 Offline vs. Online Capabilities

- **100% Offline Tools:**
  PDF to Text, Document Converter (PDF/DOCX/PPTX), Markdown Editor, PDF to Speech Audio, QR Generator, QR Scanner, Steganography (LSB), and Background Remover operate completely on-device without needing internet connectivity.
- **Network-Dependent Tools:**
  - **Video Downloader:** Requires an active network stream to fetch direct media (`.mp4`, `.webm`, `.mp3`) from CDN or public URLs. Protected web portals (YouTube, TikTok, Instagram) that employ dynamic cipher encryption require external proxy extractors and are transparently flagged.
  - **Image to Text (OCR):** Ethiopic/Amharic & English neural OCR queries the multi-lingual vision recognition engine and requires an internet connection (Wi-Fi or cellular).

---

## 🏛️ Project Directory Structure

```
mobile/
├── assets/                  # App icon, splash screen, and branding
├── src/
│   ├── types/               # TypeScript interfaces, ambient declarations & enums
│   │   ├── index.ts
│   │   └── ambient.d.ts
│   ├── localization/        # English & Amharic translations
│   │   └── translations.ts
│   ├── theme/               # ThemeProvider with AsyncStorage persistence
│   │   └── ThemeContext.tsx
│   ├── services/            # Pure TypeScript engines
│   │   ├── pdfService.ts               # Accurate PDF parser with scanned detection
│   │   ├── pdfGenerator.ts             # Authentic binary PDF-1.4 generator
│   │   ├── zipUtils.ts                 # Pure JS PKZip builder for DOCX & PPTX
│   │   ├── documentConverterService.ts # Real Word/PowerPoint/PDF converter
│   │   ├── ocrService.ts               # Multi-lingual OCR engine (Amharic & English)
│   │   ├── videoDownloaderService.ts   # Real resumable downloader & stream inspector
│   │   ├── markdownService.ts          # Markdown text metrics & CS templates
│   │   ├── steganographyService.ts     # 16-bit LSB encoder/decoder
│   │   └── storageService.ts           # AsyncStorage history records
│   ├── components/          # Reusable native components
│   │   ├── HeaderBar.tsx
│   │   ├── BottomNavigation.tsx
│   │   ├── ToolCard.tsx
│   │   └── SplashScreen.tsx
│   └── screens/             # 10 complete tool screens + Home + History + Settings
│       ├── HomeScreen.tsx
│       ├── ToolsScreen.tsx
│       ├── HistoryScreen.tsx
│       ├── SettingsScreen.tsx
│       ├── PdfToTextScreen.tsx
│       ├── PdfToAudioScreen.tsx
│       ├── ImageToTextScreen.tsx
│       ├── QrGeneratorScreen.tsx
│       ├── QrReaderScreen.tsx
│       ├── SteganographyScreen.tsx
│       ├── BackgroundRemoverScreen.tsx
│       ├── VideoDownloaderScreen.tsx
│       ├── FileConverterScreen.tsx
│       └── MarkdownEditorScreen.tsx
├── App.tsx                  # Root navigation and view router
├── app.json                 # Expo native manifest, Android package & permissions
├── eas.json                 # Cloud build configuration for APK/AAB
├── package.json             # Locked Expo 52 & React Native dependencies
└── tsconfig.json            # Self-contained TypeScript configuration
```
