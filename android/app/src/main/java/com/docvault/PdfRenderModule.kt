package com.docvault

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.ReactPackage
import com.facebook.react.uimanager.ViewManager
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors

/**
 * Renders PDF pages to JPEG files at a size that suits OCR.
 * Android's PdfRenderer is built in, so this adds no library to the APK.
 */
class PdfRenderModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  private val worker = Executors.newSingleThreadExecutor()

  override fun getName() = "PdfRender"

  private fun open(uri: String): ParcelFileDescriptor =
    ctx.contentResolver.openFileDescriptor(Uri.parse(uri), "r")
      ?: throw IllegalStateException("Cannot open file")

  @ReactMethod
  fun pageCount(uri: String, promise: Promise) {
    worker.execute {
      try {
        open(uri).use { fd -> PdfRenderer(fd).use { promise.resolve(it.pageCount) } }
      } catch (e: SecurityException) {
        promise.reject("PASSWORD", "This PDF is password protected.", e)
      } catch (e: Exception) {
        promise.reject("PDF_OPEN", "Could not open this PDF.", e)
      }
    }
  }

  @ReactMethod
  fun renderPage(uri: String, index: Int, targetWidth: Int, promise: Promise) {
    worker.execute {
      var bitmap: Bitmap? = null
      try {
        open(uri).use { fd ->
          PdfRenderer(fd).use { renderer ->
            renderer.openPage(index).use { page ->
              val scale = targetWidth.toFloat() / page.width
              val w = targetWidth
              val h = minOf((page.height * scale).toInt(), 3200)
              bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
              // PdfRenderer draws on a transparent canvas; OCR needs a white page
              Canvas(bitmap!!).drawColor(Color.WHITE)
              page.render(bitmap!!, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            }
          }
        }
        val out = File(ctx.cacheDir, "pdfpage_${System.nanoTime()}.jpg")
        FileOutputStream(out).use { bitmap!!.compress(Bitmap.CompressFormat.JPEG, 88, it) }
        promise.resolve(out.absolutePath)
      } catch (e: OutOfMemoryError) {
        promise.reject("OOM", "Not enough memory to read this page.")
      } catch (e: Exception) {
        promise.reject("PDF_RENDER", "Could not read page ${index + 1}.", e)
      } finally {
        bitmap?.recycle()
      }
    }
  }
}

class PdfRenderPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(PdfRenderModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
