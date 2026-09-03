package run.granite.microfrontend

import android.content.res.AssetManager
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.io.ByteArrayInputStream
import java.io.File

class BundleEvaluatorTest {
    @Test
    fun `asset bundle locator reads the built-in bundle through AssetManager`() {
        val assetManager = mock(AssetManager::class.java)
        val scriptData = "built-in bundle".toByteArray()
        `when`(assetManager.open("bundles/example.hbc")).thenReturn(ByteArrayInputStream(scriptData))

        val source = resolveBundleSource(assetManager, "assets://bundles/example.hbc")

        assertTrue(source is ResolvedBundleSource.Asset)
        assertArrayEquals(scriptData, (source as ResolvedBundleSource.Asset).scriptData)
        assertEquals("assets://bundles/example.hbc", source.sourceUrl)
        verify(assetManager).open("bundles/example.hbc")
    }

    @Test
    fun `absolute file path keeps filesystem bundle evaluation`() {
        val bundleFile = File.createTempFile("granite-micro-frontend", ".hbc")
        try {
            val source = resolveBundleSource(mock(AssetManager::class.java), bundleFile.absolutePath)

            assertTrue(source is ResolvedBundleSource.FilePath)
            assertEquals(bundleFile.absolutePath, (source as ResolvedBundleSource.FilePath).filePath)
            assertEquals(bundleFile.toURI().toString(), source.sourceUrl)
        } finally {
            bundleFile.delete()
        }
    }
}
