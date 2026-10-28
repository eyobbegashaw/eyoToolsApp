// Re-export the native module. On web, it will be resolved to PdfPageRendererModule.web.ts
// and on native platforms to PdfPageRendererModule.ts
export { default } from './src/PdfPageRendererModule';
export type { PdfPageRendererModule, PdfPageRaster } from './src/PdfPageRendererModule';
