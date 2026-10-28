import type { PdfPageRendererModule } from './src/PdfPageRendererModule';

const PdfPageRenderer: PdfPageRendererModule = {
  async renderPages() {
    throw new Error('PDF page images are only available on Android and iOS.');
  },
};

export default PdfPageRenderer;
