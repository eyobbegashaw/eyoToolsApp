export type Language = 'en' | 'am';

export type ThemeMode = 'dark' | 'light' | 'system';

export type FontSize = 'small' | 'normal' | 'large';

export type ToolId =
  | 'youtube'
  | 'pdf_extract'
  | 'pdf_audio'
  | 'ocr'
  | 'qr'
  | 'qr_reader'
  | 'steganography'
  | 'bg_remover'
  | 'file_converter'
  | 'md_editor'
  | 'pdf_to_text'
  | 'pdf_converter'
  | 'markdown_editor'
  | 'pdf_to_audio';

export type ScreenId =
  | 'home'
  | 'tools'
  | 'history'
  | 'settings'
  | 'youtube_dl'
  | 'pdf_extract'
  | 'pdf_audio'
  | 'ocr'
  | 'qr'
  | 'qr_reader'
  | 'steganography'
  | 'bg_remover'
  | 'file_converter'
  | 'md_editor'
  | 'pdf_to_text'
  | 'pdf_converter'
  | 'markdown_editor'
  | 'pdf_to_audio'
  | 'youtube';

export interface HistoryItem {
  id: string;
  toolId: ToolId;
  title: string;
  timestamp: number;
  snippet?: string;
  fileSize?: string;
  fileType?: string;
}

export interface VideoQuality {
  label: string;
  format: 'mp4' | 'mp3';
  resolution?: string;
  size: string;
  url: string;
  type?: 'video' | 'audio';
  isWatermarkFree?: boolean;
}

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  views: string;
  platform?: 'tiktok' | 'youtube' | 'direct';
  qualities: VideoQuality[];
}
