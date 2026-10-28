import ExpoModulesCore
import PDFKit
import UIKit
import CoreGraphics

public class PdfPageRendererModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PdfPageRenderer")

    AsyncFunction("renderPages") { (uri: String) throws -> [[String: Any]] in
      guard let url = URL(string: uri) ?? URL(string: "file://" + uri),
            let document = PDFDocument(url: url) else {
        throw NSError(
          domain: "PdfPageRenderer",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Unable to open the selected PDF."]
        )
      }

      let cacheDirectory = FileManager.default.urls(
        for: .cachesDirectory,
        in: .userDomainMask
      )[0]
      var pages: [[String: Any]] = []

      for index in 0..<document.pageCount {
        guard let page = document.page(at: index) else { continue }
        let bounds = page.bounds(for: .mediaBox)
        let scale = min(2.0, 2400.0 / max(bounds.width, bounds.height))
        let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
        let renderer = UIGraphicsImageRenderer(size: size)
        let image = renderer.image { context in
          UIColor.white.setFill()
          context.fill(CGRect(origin: .zero, size: size))
          context.cgContext.translateBy(x: 0, y: size.height)
          context.cgContext.scaleBy(x: scale, y: -scale)
          page.draw(with: .mediaBox, to: context.cgContext)
        }

        guard let data = image.jpegData(compressionQuality: 0.94) else {
          throw NSError(
            domain: "PdfPageRenderer",
            code: 2,
            userInfo: [NSLocalizedDescriptionKey: "Unable to encode PDF page \(index + 1)."]
          )
        }
        let output = cacheDirectory.appendingPathComponent(
          "pdf-page-\(UUID().uuidString)-\(index).jpg"
        )
        try data.write(to: output, options: .atomic)
        pages.append([
          "uri": output.absoluteString,
          "width": bounds.width,
          "height": bounds.height
        ])
      }

      return pages
    }
  }
}
