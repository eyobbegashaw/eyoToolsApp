/**
 * Ambient type declarations for standalone Expo and React Native modules.
 * Ensures zero compiler errors during strict validation and offline inspection.
 */

declare module 'react-native' {
  export const StyleSheet: any;
  export const View: any;
  export const Text: any;
  export const ScrollView: any;
  export const TextInput: any;
  export const TouchableOpacity: any;
  export const Image: any;
  export const ActivityIndicator: any;
  export const Alert: any;
  export const Modal: any;
  export const StatusBar: any;
  export const Animated: any;
  export const Platform: any;
  export const Dimensions: any;
  export const SafeAreaView: any;
  export const Linking: any;
  export function useColorScheme(): 'light' | 'dark' | null | undefined;
  export type StyleSheet = any;
  export type ViewStyle = any;
  export type TextStyle = any;
  export type ImageStyle = any;
  export default any;
}

declare module 'expo-status-bar' {
  export const StatusBar: any;
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
    getAllKeys: () => Promise<string[]>;
    multiGet: (keys: string[]) => Promise<[string, string | null][]>;
    clear: () => Promise<void>;
  };
  export default AsyncStorage;
}

declare module 'expo-document-picker' {
  export function getDocumentAsync(options?: any): Promise<{
    canceled: boolean;
    assets: Array<{
      uri: string;
      name: string;
      size?: number;
      mimeType?: string;
    }> | null;
  }>;
}

declare module 'expo-file-system' {
  export const documentDirectory: string;
  export const cacheDirectory: string;
  export enum EncodingType {
    UTF8 = 'utf8',
    Base64 = 'base64',
    Latin1 = 'latin1',
  }
  export function readAsStringAsync(fileUri: string, options?: any): Promise<string>;
  export function writeAsStringAsync(fileUri: string, contents: string, options?: any): Promise<void>;
  export function getInfoAsync(fileUri: string, options?: any): Promise<{ exists: boolean; size: number; isDirectory: boolean }>;
  export function deleteAsync(fileUri: string, options?: any): Promise<void>;
  export function downloadAsync(
    url: string,
    fileUri: string,
    options?: any
  ): Promise<{ uri: string; status: number }>;
  export function createDownloadResumable(
    url: string,
    fileUri: string,
    options?: any,
    callback?: (progress: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void
  ): {
    downloadAsync: () => Promise<{ uri: string } | undefined>;
    pauseAsync: () => Promise<void>;
  };
}

declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(url: string, options?: any): Promise<void>;
}

declare module 'expo-speech' {
  export function speak(text: string, options?: any): void;
  export function stop(): void;
  export function isSpeakingAsync(): Promise<boolean>;
  export function getAvailableVoicesAsync(): Promise<Array<{ identifier: string; name: string; language: string; quality: string }>>;
}

declare module 'expo-camera' {
  export const Camera: any;
  export const CameraView: any;
  export function requestCameraPermissionsAsync(): Promise<{ granted: boolean }>;
}

declare module 'expo-image-picker' {
  export function requestCameraPermissionsAsync(): Promise<{ granted: boolean }>;
  export function requestMediaLibraryPermissionsAsync(): Promise<{ granted: boolean }>;
  export function launchCameraAsync(options?: any): Promise<{ canceled: boolean; assets: Array<{ uri: string; width: number; height: number }> }>;
  export function launchImageLibraryAsync(options?: any): Promise<{ canceled: boolean; assets: Array<{ uri: string; width: number; height: number }> }>;
}

declare module 'expo-clipboard' {
  export function setStringAsync(text: string): Promise<boolean>;
  export function getStringAsync(): Promise<string>;
}

declare module 'expo-linear-gradient' {
  export const LinearGradient: any;
}

declare module 'react-native-safe-area-context' {
  export const SafeAreaView: any;
  export const SafeAreaProvider: any;
  export function useSafeAreaInsets(): { top: number; bottom: number; left: number; right: number };
}

declare module 'lucide-react-native' {
  export type LucideIcon = any;
  export const Video: any;
  export const Download: any;
  export const CheckCircle2: any;
  export const AlertCircle: any;
  export const Sparkles: any;
  export const Info: any;
  export const XCircle: any;
  export const Music: any;
  export const Share2: any;
  export const FileText: any;
  export const Upload: any;
  export const Copy: any;
  export const Trash2: any;
  export const Search: any;
  export const ArrowRightLeft: any;
  export const Presentation: any;
  export const FileCode: any;
  export const RefreshCw: any;
  export const Eye: any;
  export const ScanText: any;
  export const Camera: any;
  export const Image: any;
  export const Columns: any;
  export const BookOpen: any;
  export const Bold: any;
  export const Italic: any;
  export const Heading1: any;
  export const Heading2: any;
  export const List: any;
  export const Code: any;
  export const Quote: any;
  export const Clock: any;
  export const Play: any;
  export const Pause: any;
  export const Square: any;
  export const Volume2: any;
  export const Sliders: any;
  export const Globe: any;
  export const Moon: any;
  export const Sun: any;
  export const Type: any;
  export const QrCode: any;
  export const Key: any;
  export const Scissors: any;
  export const Lock: any;
  export const Unlock: any;
  export const Home: any;
  export const Layers: any;
  export const History: any;
  export const Settings: any;
  export const ArrowLeft: any;
  export const ArrowRight: any;
  export const ExternalLink: any;
  export const Check: any;
  export const X: any;
  export const ChevronRight: any;
  export const RotateCcw: any;
  export const LayoutGrid: any;
  export const ShieldCheck: any;
  export const Scan: any;
  export const Palette: any;
  export const Smartphone: any;
  export const EyeOff: any;
}

declare module 'react-native-svg' {
  export const Svg: any;
  export default any;
}

declare module 'react-native-qrcode-svg' {
  const QRCode: any;
  export default QRCode;
}

declare module 'qrcode';

declare module 'jsqr';
