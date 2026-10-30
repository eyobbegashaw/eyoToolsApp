import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { t, language } = useTheme();
  const [isFinishing, setIsFinishing] = useState(false);
  const isFinishingRef = useRef(false);

  const handleFinish = () => {
    if (isFinishingRef.current) {
      return;
    }

    isFinishingRef.current = true;
    setIsFinishing(true);
    onFinish();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleFinish();
    }, 1800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <LinearGradient
      colors={['#090d16', '#0f172a', '#0369a1']}
      style={styles.container}
    >
      <View style={styles.centerBox}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>CS</Text>
        </View>

        <Text style={styles.title}>eyoTools</Text>
        <Text style={styles.tagline}>
          {language === 'am'
            ? 'ከ 8 በላይ ተወዳጅ የሆኑ መሳሪዎች ያሉት'
            : 'A collection of 8+ popular tools'}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.developer}>Dn Eyob Begashaw</Text>
        <Text style={styles.location}>Addis Ababa, Ethiopia</Text>
      </View>

      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#38bdf8" style={styles.spinner} />
        <TouchableOpacity
          onPress={handleFinish}
          activeOpacity={0.8}
          accessibilityState={{ disabled: isFinishing }}
          style={[
            styles.skipBtn,
            {
              opacity: isFinishing ? 0.5 : 1,
              pointerEvents: isFinishing ? 'none' : 'auto',
            },
          ]}
        >
          <Text style={styles.skipText}>
            {language === 'am' ? 'ጀምር' : 'Tap to Enter'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 8,
    boxShadow: '0px 4px 10px rgba(56, 189, 248, 0.4)',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: '#0284c7',
    marginVertical: 18,
    borderRadius: 1,
  },
  developer: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: '700',
  },
  location: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    width: '100%',
  },
  spinner: {
    marginBottom: 14,
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
