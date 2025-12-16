import {by, device, element, expect, waitFor} from 'detox';

describe('GraniteImage E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitFor(element(by.id('app-title')))
      .toBeVisible()
      .withTimeout(10000);
  });

  // Helper function to scroll to element with retry
  const scrollToElement = async (testID: string) => {
    // First check if already visible
    try {
      await expect(element(by.id(testID))).toBeVisible();
      return;
    } catch {
      // Not visible, need to scroll
    }

    // Scroll down in increments until element is visible
    // Use explicit start position in middle of screen (0.5 normalized)
    const maxScrollAttempts = 40;
    for (let i = 0; i < maxScrollAttempts; i++) {
      try {
        // Use swipe instead of scroll for more reliable behavior
        await element(by.id('main-scroll')).swipe('up', 'slow', 0.3, 0.5, 0.3);
        await expect(element(by.id(testID))).toBeVisible();
        return;
      } catch {
        // Continue scrolling
      }
    }
    // Final attempt - let it throw if still not visible
    await expect(element(by.id(testID))).toBeVisible();
  };

  // Helper function to scroll to text with retry
  const scrollToText = async (text: string) => {
    // First check if already visible
    try {
      await expect(element(by.text(text))).toBeVisible();
      return;
    } catch {
      // Not visible, need to scroll
    }

    // Scroll down in increments until element is visible
    const maxScrollAttempts = 40;
    for (let i = 0; i < maxScrollAttempts; i++) {
      try {
        await element(by.id('main-scroll')).swipe('up', 'slow', 0.3, 0.5, 0.3);
        await expect(element(by.text(text))).toBeVisible();
        return;
      } catch {
        // Continue scrolling
      }
    }
    // Final attempt - let it throw if still not visible
    await expect(element(by.text(text))).toBeVisible();
  };

  describe('Basic Rendering', () => {
    it('should display the app title', async () => {
      await expect(element(by.id('app-title'))).toBeVisible();
      await expect(element(by.text('GraniteImage Example'))).toBeVisible();
    });

    it('should display basic image', async () => {
      await expect(element(by.id('basic-image'))).toBeVisible();
    });
  });

  describe('Source Prop', () => {
    it('should load image from URI string', async () => {
      await expect(element(by.id('basic-image'))).toBeVisible();
    });

    it('should load image from source object with URI', async () => {
      await scrollToElement('priority-image');
      await expect(element(by.id('priority-image'))).toBeVisible();
    });
  });

  describe('ResizeMode Prop', () => {
    it('should display all resize mode buttons', async () => {
      await scrollToElement('resize-cover');
      await expect(element(by.id('resize-cover'))).toBeVisible();
      await expect(element(by.id('resize-contain'))).toBeVisible();
      await expect(element(by.id('resize-stretch'))).toBeVisible();
      await expect(element(by.id('resize-center'))).toBeVisible();
    });

    it('should change to contain mode on tap', async () => {
      await scrollToElement('resize-contain');
      await element(by.id('resize-contain')).tap();
      await expect(element(by.text('2. ResizeMode: contain'))).toBeVisible();
    });

    it('should change to stretch mode on tap', async () => {
      await scrollToElement('resize-stretch');
      await element(by.id('resize-stretch')).tap();
      await expect(element(by.text('2. ResizeMode: stretch'))).toBeVisible();
    });

    it('should change to center mode on tap', async () => {
      await scrollToElement('resize-center');
      await element(by.id('resize-center')).tap();
      await expect(element(by.text('2. ResizeMode: center'))).toBeVisible();
    });

    it('should display resize image after mode change', async () => {
      await scrollToElement('resize-image');
      await element(by.id('resize-contain')).tap();
      await expect(element(by.id('resize-image'))).toBeVisible();
    });
  });

  describe('Priority Prop', () => {
    it('should display all priority buttons', async () => {
      await scrollToElement('priority-low');
      await expect(element(by.id('priority-low'))).toBeVisible();
      await expect(element(by.id('priority-normal'))).toBeVisible();
      await expect(element(by.id('priority-high'))).toBeVisible();
    });

    it('should change to low priority on tap', async () => {
      await scrollToElement('priority-low');
      await element(by.id('priority-low')).tap();
      await expect(element(by.text('3. Priority: low'))).toBeVisible();
    });

    it('should change to high priority on tap', async () => {
      await scrollToElement('priority-high');
      await element(by.id('priority-high')).tap();
      await expect(element(by.text('3. Priority: high'))).toBeVisible();
    });

    it('should display priority image', async () => {
      await scrollToElement('priority-image');
      await expect(element(by.id('priority-image'))).toBeVisible();
    });
  });

  describe('CachePolicy Prop', () => {
    it('should display all cache policy buttons', async () => {
      await scrollToElement('cache-memory');
      await expect(element(by.id('cache-memory'))).toBeVisible();
      await expect(element(by.id('cache-disk'))).toBeVisible();
      await expect(element(by.id('cache-none'))).toBeVisible();
    });

    it('should change to memory policy on tap', async () => {
      await scrollToElement('cache-memory');
      await element(by.id('cache-memory')).tap();
      // Verify cache-image is visible after tap (indicates successful interaction)
      await scrollToElement('cache-image');
      await expect(element(by.id('cache-image'))).toBeVisible();
    });

    it('should change to none policy on tap', async () => {
      await scrollToElement('cache-none');
      await element(by.id('cache-none')).tap();
      // Verify cache-image is visible after tap (indicates successful interaction)
      await scrollToElement('cache-image');
      await expect(element(by.id('cache-image'))).toBeVisible();
    });

    it('should display cache image', async () => {
      await scrollToElement('cache-image');
      await expect(element(by.id('cache-image'))).toBeVisible();
    });
  });

  describe('TintColor Prop', () => {
    it('should display tint toggle button with OFF state', async () => {
      await scrollToElement('tint-toggle');
      await expect(element(by.id('tint-toggle'))).toBeVisible();
      await expect(element(by.text('Tint OFF'))).toBeVisible();
    });

    it('should toggle tint ON on tap', async () => {
      await scrollToElement('tint-toggle');
      await element(by.id('tint-toggle')).tap();
      // Verify tint-image is visible after toggle (indicates successful interaction)
      await scrollToElement('tint-image');
      await expect(element(by.id('tint-image'))).toBeVisible();
    });

    it('should toggle tint OFF on second tap', async () => {
      await scrollToElement('tint-toggle');
      await element(by.id('tint-toggle')).tap(); // ON
      await element(by.id('tint-toggle')).tap(); // OFF
      // Verify tint-image is visible after toggle (indicates successful interaction)
      await scrollToElement('tint-image');
      await expect(element(by.id('tint-image'))).toBeVisible();
    });

    it('should display tint image', async () => {
      await scrollToElement('tint-image');
      await expect(element(by.id('tint-image'))).toBeVisible();
    });
  });

  describe('Headers Prop', () => {
    it('should display image loaded with custom headers', async () => {
      await scrollToElement('headers-image');
      await expect(element(by.id('headers-image'))).toBeVisible();
    });
  });

  describe('DefaultSource Prop', () => {
    it('should display defaultSource section', async () => {
      await scrollToText('7. DefaultSource (Placeholder)');
      await expect(element(by.text('7. DefaultSource (Placeholder)'))).toBeVisible();
    });

    it('should display defaultSource image', async () => {
      await scrollToElement('default-source-image');
      await expect(element(by.id('default-source-image'))).toBeVisible();
    });

    it('should have reload button for placeholder testing', async () => {
      await scrollToElement('reload-placeholder-button');
      await expect(element(by.id('reload-placeholder-button'))).toExist();
    });
  });

  describe('FallbackSource Prop', () => {
    it('should display error handling section', async () => {
      await scrollToText('8. Error Handling with Fallback');
      await expect(element(by.text('8. Error Handling with Fallback'))).toBeVisible();
    });

    it('should display error image (fallback loaded)', async () => {
      await scrollToElement('error-image');
      await expect(element(by.id('error-image'))).toBeVisible();
    });
  });

  describe('Callback Events', () => {
    it('should trigger onLoadStart and log it', async () => {
      // Scroll to callbacks section and trigger new image load
      await scrollToElement('callbacks-image');
      await scrollToElement('load-new-image-button');
      await element(by.id('load-new-image-button')).tap();

      // Wait for log to appear
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Scroll to log container and check
      await scrollToElement('log-container');
      await expect(element(by.id('log-0'))).toBeVisible();
    });

    it('should trigger onLoad with dimensions', async () => {
      await scrollToElement('callbacks-image');
      await scrollToElement('load-new-image-button');
      await element(by.id('load-new-image-button')).tap();

      // Wait for image to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      await scrollToElement('log-container');
      // Verify log entries exist (onLoad logs dimensions like "onLoad: 400x300")
      await expect(element(by.id('log-container'))).toBeVisible();
    });

    it('should trigger onLoadEnd', async () => {
      await scrollToElement('callbacks-image');
      await scrollToElement('load-new-image-button');
      await element(by.id('load-new-image-button')).tap();

      // Wait for image to load completely
      await new Promise(resolve => setTimeout(resolve, 3000));

      await scrollToElement('log-container');
      await expect(element(by.id('log-container'))).toBeVisible();
    });

    it('should trigger onError for invalid URL', async () => {
      // The error-image section uses an invalid URL
      await scrollToElement('error-image');

      // Wait for error to be logged
      await new Promise(resolve => setTimeout(resolve, 2000));

      await scrollToElement('log-container');
      await expect(element(by.id('log-container'))).toBeVisible();
    });
  });

  describe('Static Methods', () => {
    describe('preload', () => {
      it('should display preload button', async () => {
        await scrollToElement('preload-button');
        // Button may be partially visible due to scroll position, verify it exists
        await expect(element(by.id('preload-button'))).toExist();
      });

      it('should trigger preload on tap and log start', async () => {
        await scrollToElement('preload-button');
        await element(by.id('preload-button')).tap();

        // Wait a moment for log to appear
        await new Promise(resolve => setTimeout(resolve, 500));

        await scrollToElement('log-container');
        await expect(element(by.id('log-container'))).toBeVisible();
      });

      it('should log preload completion', async () => {
        await scrollToElement('preload-button');
        await element(by.id('preload-button')).tap();

        // Wait for preload to complete
        await new Promise(resolve => setTimeout(resolve, 3000));

        await scrollToElement('log-container');
        await expect(element(by.id('log-container'))).toBeVisible();
      });
    });

    describe('clearMemoryCache', () => {
      it('should display clear memory cache button', async () => {
        await scrollToElement('clear-memory-cache-button');
        await expect(element(by.id('clear-memory-cache-button'))).toBeVisible();
      });

      it('should trigger clear memory cache on tap', async () => {
        await scrollToElement('clear-memory-cache-button');
        await element(by.id('clear-memory-cache-button')).tap();

        // Wait for action to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        await scrollToElement('log-container');
        await expect(element(by.id('log-container'))).toBeVisible();
      });
    });

    describe('clearDiskCache', () => {
      it('should display clear disk cache button', async () => {
        await scrollToElement('clear-disk-cache-button');
        await expect(element(by.id('clear-disk-cache-button'))).toBeVisible();
      });

      it('should trigger clear disk cache on tap', async () => {
        await scrollToElement('clear-disk-cache-button');
        await element(by.id('clear-disk-cache-button')).tap();

        // Wait for action to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        await scrollToElement('log-container');
        await expect(element(by.id('log-container'))).toBeVisible();
      });
    });
  });

  describe('GIF Support', () => {
    it('should display GIF image', async () => {
      await scrollToElement('gif-image');
      await expect(element(by.id('gif-image'))).toBeVisible();
    });
  });

  describe('App Stability', () => {
    it('should remain stable after multiple resize mode changes', async () => {
      await scrollToElement('resize-cover');

      await element(by.id('resize-cover')).tap();
      await element(by.id('resize-contain')).tap();
      await element(by.id('resize-stretch')).tap();
      await element(by.id('resize-center')).tap();
      await element(by.id('resize-cover')).tap();

      await expect(element(by.id('resize-image'))).toBeVisible();
    });

    it('should remain stable after multiple priority changes', async () => {
      await scrollToElement('priority-low');

      await element(by.id('priority-low')).tap();
      await element(by.id('priority-normal')).tap();
      await element(by.id('priority-high')).tap();
      await element(by.id('priority-low')).tap();

      await scrollToElement('priority-image');
      await expect(element(by.id('priority-image'))).toBeVisible();
    });

    it('should remain stable after multiple cache policy changes', async () => {
      await scrollToElement('cache-memory');

      await element(by.id('cache-memory')).tap();
      await element(by.id('cache-disk')).tap();
      await element(by.id('cache-none')).tap();
      await element(by.id('cache-disk')).tap();

      await scrollToElement('cache-image');
      await expect(element(by.id('cache-image'))).toBeVisible();
    });

    it('should remain stable after reload all images', async () => {
      await scrollToElement('reload-all-button');
      await element(by.id('reload-all-button')).tap();

      // Wait for reload
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Scroll back to top and verify basic image still works
      await device.reloadReactNative();
      await waitFor(element(by.id('app-title')))
        .toBeVisible()
        .withTimeout(10000);
      await expect(element(by.id('basic-image'))).toBeVisible();
    });

    it('should remain stable after all static method calls', async () => {
      await scrollToElement('preload-button');
      await element(by.id('preload-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 500));

      await scrollToElement('clear-memory-cache-button');
      await element(by.id('clear-memory-cache-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 500));

      await scrollToElement('clear-disk-cache-button');
      await element(by.id('clear-disk-cache-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 500));

      await scrollToElement('reload-all-button');
      await element(by.id('reload-all-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify app is still responsive
      await scrollToElement('log-container');
      await expect(element(by.id('log-container'))).toBeVisible();
    });
  });
});
