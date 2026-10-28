package expo.modules.pdfpagerenderer

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import kotlin.math.max
import kotlin.math.min

class PdfPageRendererModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PdfPageRenderer")

    AsyncFunction("renderPages") { uriString: String ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("Android context is unavailable.")
      val uri = Uri.parse(uriString)
      val descriptor = if (uri.scheme == "file") {
        val path = uri.path ?: throw IllegalArgumentException("Invalid PDF file URI.")
        ParcelFileDescriptor.open(File(path), ParcelFileDescriptor.MODE_READ_ONLY)
      } else {
        context.contentResolver.openFileDescriptor(uri, "r")
          ?: throw IllegalArgumentException("Unable to open the selected PDF.")
      }

      descriptor.use { fileDescriptor ->
        PdfRenderer(fileDescriptor).use { renderer ->
          val pages = ArrayList<Map<String, Any>>(renderer.pageCount)
          for (pageIndex in 0 until renderer.pageCount) {
            renderer.openPage(pageIndex).use { page ->
              val pageWidth = page.width.toDouble()
              val pageHeight = page.height.toDouble()
              val scale = min(2.0, 2400.0 / max(pageWidth, pageHeight))
              val width = max(1, (pageWidth * scale).toInt())
              val height = max(1, (pageHeight * scale).toInt())
              val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
              bitmap.eraseColor(android.graphics.Color.WHITE)
              page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)

              val output = File(context.cacheDir, "pdf-page-${UUID.randomUUID()}-$pageIndex.jpg")
              FileOutputStream(output).use { stream ->
                if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 94, stream)) {
                  throw IllegalStateException("Unable to encode PDF page ${pageIndex + 1}.")
                }
              }
              bitmap.recycle()
              pages.add(mapOf(
                "uri" to Uri.fromFile(output).toString(),
                "width" to pageWidth,
                "height" to pageHeight
              ))
            }
          }
          pages
        }
      }
    }
  }
}
