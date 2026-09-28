package run.granite.rncomponentview

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RNComponentViewLayoutTest {
    private val measured = RNComponentView.ContentSize(width = 200f, height = 120f)

    @Test
    fun `content height takes the height from the content and leaves the width to the layout`() {
        val sizing = RNComponentViewSizing.CONTENT_HEIGHT

        assertNull(RNComponentViewLayout.contentWidthPx(sizing, isEmpty = false, contentSize = measured, density = 2f))
        assertEquals(96, RNComponentViewLayout.contentHeightPx(sizing, isEmpty = false, contentSize = null, density = 2f))
        assertEquals(240, RNComponentViewLayout.contentHeightPx(sizing, isEmpty = false, contentSize = measured, density = 2f))
        assertEquals(0, RNComponentViewLayout.contentHeightPx(sizing, isEmpty = true, contentSize = measured, density = 2f))
    }

    @Test
    fun `content size takes both dimensions from the content`() {
        val sizing = RNComponentViewSizing.CONTENT_SIZE

        assertEquals(96, RNComponentViewLayout.contentWidthPx(sizing, isEmpty = false, contentSize = null, density = 2f))
        assertEquals(96, RNComponentViewLayout.contentHeightPx(sizing, isEmpty = false, contentSize = null, density = 2f))
        assertEquals(400, RNComponentViewLayout.contentWidthPx(sizing, isEmpty = false, contentSize = measured, density = 2f))
        assertEquals(240, RNComponentViewLayout.contentHeightPx(sizing, isEmpty = false, contentSize = measured, density = 2f))
        assertEquals(0, RNComponentViewLayout.contentWidthPx(sizing, isEmpty = true, contentSize = measured, density = 2f))
        assertEquals(0, RNComponentViewLayout.contentHeightPx(sizing, isEmpty = true, contentSize = measured, density = 2f))
    }

    @Test
    fun `constrained leaves both dimensions to the layout`() {
        val sizing = RNComponentViewSizing.CONSTRAINED

        assertNull(RNComponentViewLayout.contentWidthPx(sizing, isEmpty = false, contentSize = measured, density = 2f))
        assertNull(RNComponentViewLayout.contentHeightPx(sizing, isEmpty = false, contentSize = measured, density = 2f))
        assertNull(RNComponentViewLayout.contentHeightPx(sizing, isEmpty = true, contentSize = null, density = 2f))
    }

    @Test
    fun `measured sizes round up so the content is never clipped`() {
        val sizing = RNComponentViewSizing.CONTENT_SIZE
        val fractional = RNComponentView.ContentSize(width = 10.2f, height = 20.5f)

        assertEquals(11, RNComponentViewLayout.contentWidthPx(sizing, isEmpty = false, contentSize = fractional, density = 1f))
        assertEquals(21, RNComponentViewLayout.contentHeightPx(sizing, isEmpty = false, contentSize = fractional, density = 1f))
    }

    @Test
    fun `the placeholder lets the Portal lay out content`() {
        assertTrue(RNComponentViewLayout.PLACEHOLDER_SIZE_DP > 0f)
    }

    @Test
    fun `the placeholder covers the view until the content is ready`() {
        val contentHeight = RNComponentViewSizing.CONTENT_HEIGHT
        val constrained = RNComponentViewSizing.CONSTRAINED

        assertTrue(
            RNComponentViewLayout.showsPlaceholder(contentHeight, isEmpty = false, hasAttachedContent = false, hasContentSize = false),
        )
        assertTrue(
            RNComponentViewLayout.showsPlaceholder(contentHeight, isEmpty = false, hasAttachedContent = true, hasContentSize = false),
        )
        assertFalse(
            RNComponentViewLayout.showsPlaceholder(contentHeight, isEmpty = false, hasAttachedContent = true, hasContentSize = true),
        )
        assertTrue(
            RNComponentViewLayout.showsPlaceholder(constrained, isEmpty = false, hasAttachedContent = false, hasContentSize = false),
        )
        assertFalse(
            RNComponentViewLayout.showsPlaceholder(constrained, isEmpty = false, hasAttachedContent = true, hasContentSize = false),
        )
        assertTrue(
            RNComponentViewLayout.showsPlaceholder(contentHeight, isEmpty = false, hasAttachedContent = false, hasContentSize = true),
        )
        assertFalse(
            RNComponentViewLayout.showsPlaceholder(contentHeight, isEmpty = true, hasAttachedContent = false, hasContentSize = false),
        )
    }
}
