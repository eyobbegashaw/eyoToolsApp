import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { HeaderBar } from './src/components/HeaderBar';
import { BottomNavigation } from './src/components/BottomNavigation';
import { SplashScreen } from './src/components/SplashScreen';

import { HomeScreen } from './src/screens/HomeScreen';
import { ToolsScreen } from './src/screens/ToolsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

import { PdfToTextScreen } from './src/screens/PdfToTextScreen';
import { PdfToAudioScreen } from './src/screens/PdfToAudioScreen';
import { ImageToTextScreen } from './src/screens/ImageToTextScreen';
import { QrGeneratorScreen } from './src/screens/QrGeneratorScreen';
import { QrReaderScreen } from './src/screens/QrReaderScreen';
import { SteganographyScreen } from './src/screens/SteganographyScreen';
import { BackgroundRemoverScreen } from './src/screens/BackgroundRemoverScreen';
import { VideoDownloaderScreen } from './src/screens/VideoDownloaderScreen';
import { FileConverterScreen } from './src/screens/FileConverterScreen';
import { MarkdownEditorScreen } from './src/screens/MarkdownEditorScreen';

import { ScreenId, HistoryItem } from './src/types';
import { StorageService } from './src/services/storageService';

const MainAppContent: React.FC = () => {
  const { colors, isDark, t } = useTheme();

  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [screenStack, setScreenStack] = useState<ScreenId[]>(['home']);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    StorageService.getHistory().then(setHistoryItems);
  }, [currentScreen]);

  const refreshHistory = () => {
    StorageService.getHistory().then(setHistoryItems);
  };

  const handleNavigate = (screen: ScreenId) => {
    if (['home', 'tools', 'history', 'settings'].includes(screen)) {
      setScreenStack([screen]);
    } else {
      setScreenStack((prev) => [...prev, screen]);
    }
    setCurrentScreen(screen);
  };

  const handleBack = () => {
    if (screenStack.length > 1) {
      const nextStack = [...screenStack];
      nextStack.pop();
      const prevScreen = nextStack[nextStack.length - 1];
      setScreenStack(nextStack);
      setCurrentScreen(prevScreen);
    } else {
      setCurrentScreen('home');
      setScreenStack(['home']);
    }
  };

  const getScreenTitle = (screen: ScreenId): string | undefined => {
    switch (screen) {
      case 'pdf_extract':
        return t.pdf_extract;
      case 'file_converter':
        return t.file_converter_title;
      case 'md_editor':
        return t.md_editor_title;
      case 'pdf_audio':
        return t.pdf_audio;
      case 'ocr':
        return t.ocr;
      case 'youtube_dl':
        return t.youtube;
      case 'qr':
        return t.qr;
      case 'qr_reader':
        return t.qr_reader_title;
      case 'steganography':
        return t.steganography;
      case 'bg_remover':
        return t.bg_remover;
      case 'tools':
        return t.tools;
      case 'history':
        return t.history;
      case 'settings':
        return t.settings;
      default:
        return undefined;
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen
            onNavigate={handleNavigate}
            recentHistory={historyItems}
          />
        );
      case 'tools':
        return <ToolsScreen onNavigate={handleNavigate} />;
      case 'history':
        return (
          <HistoryScreen
            history={historyItems}
            onRefresh={refreshHistory}
            onNavigate={handleNavigate}
          />
        );
      case 'settings':
        return <SettingsScreen onReplaySplash={() => setShowSplash(true)} />;
      case 'file_converter':
        return <FileConverterScreen />;
      case 'md_editor':
        return <MarkdownEditorScreen />;
      case 'pdf_extract':
        return <PdfToTextScreen onNavigate={handleNavigate} />;
      case 'pdf_audio':
        return <PdfToAudioScreen />;
      case 'ocr':
        return <ImageToTextScreen />;
      case 'youtube_dl':
        return <VideoDownloaderScreen />;
      case 'qr':
        return <QrGeneratorScreen />;
      case 'qr_reader':
        return <QrReaderScreen />;
      case 'steganography':
        return <SteganographyScreen />;
      case 'bg_remover':
        return <BackgroundRemoverScreen />;
      default:
        return (
          <HomeScreen
            onNavigate={handleNavigate}
            recentHistory={historyItems}
          />
        );
    }
  };

  const isMainTab = ['home', 'tools', 'history', 'settings'].includes(currentScreen);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.headerBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.headerBg}
      />

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Native Mobile Header Bar */}
        <HeaderBar
          currentScreen={currentScreen}
          onBack={handleBack}
          title={getScreenTitle(currentScreen)}
        />

        {/* Screen Content */}
        <View style={styles.screenContainer}>{renderScreen()}</View>

        {/* Bottom Tab Navigation */}
        {isMainTab && (
          <BottomNavigation
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            historyCount={historyItems.length}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <MainAppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
});
