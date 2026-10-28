import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as DocumentPicker from 'expo-document-picker';
import {
  Volume2,
  Play,
  Square,
  Upload,
  Sparkles,
  Info,
  Sliders,
  Globe,
} from 'lucide-react-native';
import { PDFService } from '../services/pdfService';
import { useTheme } from '../theme/ThemeContext';

export const PdfToAudioScreen: React.FC = () => {
  const { colors, t, language, fontScale } = useTheme();

  const [textToRead, setTextToRead] = useState<string>(
    'Welcome to eyoTools Mobile. CS Student Edition. The offline audio reading engine converts your textbooks and notes into natural speech.'
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [ttsLang, setTtsLang] = useState<'en-US' | 'am-ET'>(
    language === 'am' ? 'am-ET' : 'en-US'
  );

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        const res = await PDFService.extractTextFromUri(file.uri);
        if (res.text) {
          setTextToRead(res.text.slice(0, 3000));
        }
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to read PDF document');
    }
  };

  const handlePlay = () => {
    if (!textToRead.trim()) return;

    if (isPlaying) {
      Speech.stop();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    Speech.speak(textToRead, {
      language: ttsLang,
      rate: speechRate,
      pitch: speechPitch,
      onDone: () => setIsPlaying(false),
      onError: (e) => {
        setIsPlaying(false);
        console.warn('Speech error', e);
      },
    });
  };

  const handleStop = () => {
    Speech.stop();
    setIsPlaying(false);
  };

  const handleLoadSample = () => {
    setTextToRead(
      language === 'am'
        ? 'እንኳን ወደ ኢዮ መሳሪያዎች የድምጽ አንባቢ በደህና መጡ። ይህ መተግበሪያ ሰነዶችን በቀላሉ ወደ ድምጽ ይቀይራል።'
        : 'Binary Search is an efficient algorithm for finding an item from a sorted list of items. It works by repeatedly dividing in half the portion of the list that could contain the item.'
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Card */}
      <View
        style={[
          styles.headerCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(124, 58, 237, 0.15)' }]}>
            <Volume2 size={22} color="#7c3aed" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.text }]}>{t.tts_title}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t.pdf_audio_desc}
            </Text>
          </View>
        </View>

        {/* Text Input to Read */}
        <TextInput
          multiline
          value={textToRead}
          onChangeText={setTextToRead}
          placeholder="Enter text or load from a PDF document to read aloud..."
          placeholderTextColor={colors.textMuted}
          style={[
            styles.textArea,
            {
              backgroundColor: colors.cardSecondary,
              color: colors.text,
              fontSize: 12 * fontScale,
            },
          ]}
        />

        <View style={styles.inputActionsRow}>
          <TouchableOpacity
            onPress={handlePickDocument}
            style={[styles.smallBtn, { backgroundColor: colors.cardSecondary }]}
          >
            <Upload size={14} color={colors.text} style={{ marginRight: 5 }} />
            <Text style={[styles.smallBtnText, { color: colors.text }]}>
              {t.choose_pdf}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLoadSample}
            style={[styles.smallBtn, { backgroundColor: colors.cardSecondary }]}
          >
            <Sparkles size={14} color="#f59e0b" style={{ marginRight: 5 }} />
            <Text style={[styles.smallBtnText, { color: colors.text }]}>
              Sample CS Text
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Voice & Speech Controls */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Speech Synthesizer Settings
        </Text>

        {/* Language Selection */}
        <Text style={[styles.settingLabel, { color: colors.textMuted }]}>
          {t.select_tts_lang}
        </Text>
        <View style={styles.segmentRow}>
          <TouchableOpacity
            onPress={() => setTtsLang('en-US')}
            style={[
              styles.segmentBtn,
              {
                backgroundColor:
                  ttsLang === 'en-US' ? colors.primary : colors.cardSecondary,
              },
            ]}
          >
            <Globe size={13} color={ttsLang === 'en-US' ? '#fff' : colors.textMuted} />
            <Text
              style={[
                styles.segmentText,
                { color: ttsLang === 'en-US' ? '#fff' : colors.textSecondary },
              ]}
            >
              English (US)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTtsLang('am-ET')}
            style={[
              styles.segmentBtn,
              {
                backgroundColor:
                  ttsLang === 'am-ET' ? colors.primary : colors.cardSecondary,
              },
            ]}
          >
            <Globe size={13} color={ttsLang === 'am-ET' ? '#fff' : colors.textMuted} />
            <Text
              style={[
                styles.segmentText,
                { color: ttsLang === 'am-ET' ? '#fff' : colors.textSecondary },
              ]}
            >
              አማርኛ (Amharic)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Speed / Rate Stepper */}
        <Text style={[styles.settingLabel, { color: colors.textMuted, marginTop: 14 }]}>
          {t.speed}: {speechRate}x
        </Text>
        <View style={styles.segmentRow}>
          {[0.75, 1.0, 1.25, 1.5].map((rate) => (
            <TouchableOpacity
              key={rate}
              onPress={() => setSpeechRate(rate)}
              style={[
                styles.segmentBtnSmall,
                {
                  backgroundColor:
                    speechRate === rate ? colors.primary : colors.cardSecondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: speechRate === rate ? '#fff' : colors.textSecondary },
                ]}
              >
                {rate}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Playback Controls */}
        <View style={styles.playbackRow}>
          <TouchableOpacity
            onPress={handlePlay}
            style={[
              styles.playBtn,
              { backgroundColor: isPlaying ? '#ef4444' : colors.primary },
            ]}
          >
            {isPlaying ? (
              <>
                <Square size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.playBtnText}>{t.stop}</Text>
              </>
            ) : (
              <>
                <Play size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.playBtnText}>{t.play}</Text>
              </>
            )}
          </TouchableOpacity>

          {isPlaying && (
            <TouchableOpacity
              onPress={handleStop}
              style={[styles.stopBtn, { backgroundColor: colors.cardSecondary }]}
            >
              <Square size={16} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info Callouts */}
      <View
        style={[
          styles.infoCard,
          { backgroundColor: 'rgba(2, 132, 199, 0.08)', borderColor: 'rgba(2, 132, 199, 0.2)' },
        ]}
      >
        <Info size={15} color="#0284c7" style={{ marginRight: 8, marginTop: 2 }} />
        <Text style={styles.infoText}>{t.amharic_voice_note}</Text>
      </View>

      <View
        style={[
          styles.infoCard,
          { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
        ]}
      >
        <Info size={15} color={colors.textMuted} style={{ marginRight: 8, marginTop: 2 }} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          {t.tts_export_limitation}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  headerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  textArea: {
    height: 120,
    borderRadius: 14,
    padding: 12,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  inputActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 10,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnSmall: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  playbackRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  playBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
  },
  playBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  stopBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
