package run.granite.lottie.builtin

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.net.Uri

/**
 * ContentProvider for automatic BuiltInLottieProvider initialization.
 *
 * This provider is automatically instantiated by Android before Application.onCreate(),
 * ensuring BuiltInLottieProvider is registered as the default Lottie provider early in the app lifecycle.
 *
 * No manual registration required - just include this module in your build.
 */
class BuiltInLottieContentProvider : ContentProvider() {

    override fun onCreate(): Boolean {
        BuiltInLottieInitializer.initialize()
        return true
    }

    // Required ContentProvider methods - not used for initialization
    override fun query(uri: Uri, projection: Array<String>?, selection: String?, selectionArgs: Array<String>?, sortOrder: String?): Cursor? = null
    override fun getType(uri: Uri): String? = null
    override fun insert(uri: Uri, values: ContentValues?): Uri? = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<String>?): Int = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<String>?): Int = 0
}