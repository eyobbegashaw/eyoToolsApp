import { requireNativeModule } from 'expo-modules-core';

export interface PdfPageRendererModule {
  renderPages(uri: string): Promise<PdfPageRaster[]>;
}

export interface PdfPageRaster {
  uri: string;
  width: number;
  height: number;
}

export default requireNativeModule<PdfPageRendererModule>('PdfPageRenderer');
