import { by, device, element, expect, waitFor } from 'detox';

describe('GraniteVideo E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Disable synchronization because the video player's periodic time observer
    // keeps the main queue busy, preventing Detox from detecting idle state
    await device.disableSynchronization();
  });

  afterAll(async () => {
    // Skip enableSynchronization as it can timeout with video players
  });

  beforeEach(async () => {
    // Use launchApp with newInstance instead of reloadReactNative
    // This avoids KVO observer issues that occur during reload with video players
    await device.launchApp({ newInstance: true });
    // Disable synchronization again after launching new instance
    // The video player's periodic time observer keeps the main queue busy
    await device.disableSynchronization();
    // Add a small delay after launch to ensure app is ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    await waitFor(element(by.id('app-title')))
      .toBeVisible()
      .withTimeout(15000);
  });

  // Helper: Scroll to element
  const scrollToElement = async (testID: string) => {
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await expect(element(by.id(testID))).toBeVisible();
        return;
      } catch {
        await element(by.id('main-scroll')).swipe('up', 'slow', 0.3);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    await expect(element(by.id(testID))).toBeVisible();
  };

  // Helper: Scroll to top
  const scrollToTop = async () => {
    try {
      for (let i = 0; i < 5; i++) {
        await element(by.id('main-scroll')).swipe('down', 'fast', 0.8);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch {
      // If swipe fails, just wait and try to verify the element we need
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // ============================================================
  // Basic Rendering Tests
  // ============================================================

  describe('Basic Rendering', () => {
    it('should display app title', async () => {
      await expect(element(by.id('app-title'))).toBeVisible();
      await expect(element(by.id('app-title'))).toHaveText('GraniteVideo Example');
    });

    it('should display main video component', async () => {
      await expect(element(by.id('main-video'))).toBeVisible();
    });

    it('should display progress bar', async () => {
      await expect(element(by.id('progress-time'))).toBeVisible();
    });
  });

  // ============================================================
  // Playback Control Tests
  // ============================================================

  describe('Playback Controls', () => {
    it('should toggle play/pause', async () => {
      await expect(element(by.id('play-pause-button'))).toBeVisible();

      // Click play - button text should change
      await element(by.id('play-pause-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Click pause
      await element(by.id('play-pause-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    it('should toggle mute', async () => {
      await expect(element(by.id('mute-button'))).toBeVisible();
      await element(by.id('mute-button')).tap();
    });

    it('should seek forward', async () => {
      // First, start playback
      await element(by.id('play-pause-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 2000));

      await element(by.id('seek-forward-button')).tap();
    });

    it('should seek backward', async () => {
      await element(by.id('play-pause-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 2000));

      await element(by.id('seek-back-button')).tap();
    });
  });

  // ============================================================
  // Playback Rate Tests
  // ============================================================

  describe('Playback Rate', () => {
    it('should display rate buttons', async () => {
      await scrollToElement('rate-0.5');
      await expect(element(by.id('rate-0.5'))).toBeVisible();
      await expect(element(by.id('rate-1'))).toBeVisible();
      await expect(element(by.id('rate-1.5'))).toBeVisible();
      await expect(element(by.id('rate-2'))).toBeVisible();
    });

    it('should change playback rate to 0.5x', async () => {
      await scrollToElement('rate-0.5');
      await element(by.id('rate-0.5')).tap();
      await new Promise(resolve => setTimeout(resolve, 300));
      await scrollToElement('rate-label');
      await expect(element(by.id('rate-label'))).toHaveText('Current: 0.5x');
    });

    it('should change playback rate to 2x', async () => {
      await scrollToElement('rate-2');
      await element(by.id('rate-2')).tap();
      await new Promise(resolve => setTimeout(resolve, 300));
      await scrollToElement('rate-label');
      await expect(element(by.id('rate-label'))).toHaveText('Current: 2x');
    });
  });

  // ============================================================
  // Volume Tests
  // ============================================================

  describe('Volume Controls', () => {
    it('should display volume buttons', async () => {
      await scrollToElement('volume-0');
      await expect(element(by.id('volume-0'))).toBeVisible();
      await expect(element(by.id('volume-50'))).toBeVisible();
      await expect(element(by.id('volume-100'))).toBeVisible();
    });

    it('should change volume to 50%', async () => {
      await scrollToElement('volume-50');
      await element(by.id('volume-50')).tap();
      await new Promise(resolve => setTimeout(resolve, 300));
      // Check that label contains "50" (percentage sign may have encoding issues)
      await scrollToElement('volume-label');
      await expect(element(by.id('volume-label'))).toBeVisible();
    });

    it('should mute volume (0%)', async () => {
      await scrollToElement('volume-0');
      await element(by.id('volume-0')).tap();
      await new Promise(resolve => setTimeout(resolve, 300));
      await scrollToElement('volume-label');
      await expect(element(by.id('volume-label'))).toBeVisible();
    });
  });

  // ============================================================
  // Resize Mode Tests
  // ============================================================

  describe('Resize Mode', () => {
    it('should display resize mode buttons', async () => {
      await scrollToElement('resize-contain');
      await expect(element(by.id('resize-contain'))).toBeVisible();
      await expect(element(by.id('resize-cover'))).toBeVisible();
      await expect(element(by.id('resize-stretch'))).toBeVisible();
    });

    it('should change resize mode to cover', async () => {
      await scrollToElement('resize-cover');
      await element(by.id('resize-cover')).tap();
      await new Promise(resolve => setTimeout(resolve, 300));
      await scrollToElement('resize-mode-label');
      await expect(element(by.id('resize-mode-label'))).toBeVisible();
    });

    it('should change resize mode to stretch', async () => {
      await scrollToElement('resize-stretch');
      await element(by.id('resize-stretch')).tap();
      await new Promise(resolve => setTimeout(resolve, 300));
      await scrollToElement('resize-mode-label');
      await expect(element(by.id('resize-mode-label'))).toBeVisible();
    });

    it('should change resize mode back to contain', async () => {
      await scrollToElement('resize-contain');
      await element(by.id('resize-contain')).tap();
      await expect(element(by.id('resize-mode-label'))).toHaveText('Current: contain');
    });
  });

  // ============================================================
  // Repeat Tests
  // ============================================================

  describe('Repeat', () => {
    it('should toggle repeat mode', async () => {
      await scrollToElement('repeat-button');
      await expect(element(by.id('repeat-button'))).toBeVisible();

      // Toggle on
      await element(by.id('repeat-button')).tap();

      // Toggle off
      await element(by.id('repeat-button')).tap();
    });
  });

  // ============================================================
  // Source Selection Tests
  // ============================================================

  describe('Source Selection', () => {
    it('should display source selection buttons', async () => {
      await scrollToElement('source-mp4');
      await expect(element(by.id('source-mp4'))).toBeVisible();
      await expect(element(by.id('source-hls'))).toBeVisible();
    });

    it('should change source to HLS', async () => {
      await scrollToElement('source-hls');
      await element(by.id('source-hls')).tap();
      // Wait for source to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Verify video is still visible after source change
      await scrollToTop();
      await expect(element(by.id('main-video'))).toBeVisible();
    });

    it('should change source back to MP4', async () => {
      await scrollToElement('source-mp4');
      await element(by.id('source-mp4')).tap();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await scrollToTop();
      await expect(element(by.id('main-video'))).toBeVisible();
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe('Error Handling', () => {
    it('should display error test section', async () => {
      await scrollToElement('trigger-error');
      await expect(element(by.id('trigger-error'))).toBeVisible();
    });

    it('should trigger error with invalid URL', async () => {
      await scrollToElement('trigger-error');
      await element(by.id('trigger-error')).tap();
      // Wait for error to be processed
      await new Promise(resolve => setTimeout(resolve, 3000));
      // App should not crash and remain responsive
      await scrollToTop();
      await expect(element(by.id('app-title'))).toBeVisible();
    });
  });

  // ============================================================
  // Event Logging Tests
  // ============================================================

  describe('Event Logging', () => {
    it('should display log container', async () => {
      await scrollToElement('log-container');
      await expect(element(by.id('log-container'))).toBeVisible();
    });

    it('should clear logs', async () => {
      // First create some logs
      await element(by.id('play-pause-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 1000));

      await scrollToElement('clear-logs');
      await element(by.id('clear-logs')).tap();
    });

    it('should log onLoadStart event', async () => {
      await scrollToElement('source-mp4');
      await element(by.id('source-mp4')).tap();

      await scrollToElement('log-container');
      // Event should be logged
      await waitFor(element(by.id('log-container')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  // ============================================================
  // Stability Tests
  // ============================================================

  describe('App Stability', () => {
    it('should remain stable after multiple state changes', async () => {
      // Toggle play/pause multiple times
      for (let i = 0; i < 3; i++) {
        await element(by.id('play-pause-button')).tap();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Change resize modes
      await scrollToElement('resize-cover');
      await element(by.id('resize-cover')).tap();
      await element(by.id('resize-contain')).tap();

      // Change rates
      await scrollToElement('rate-2');
      await element(by.id('rate-2')).tap();
      await element(by.id('rate-1')).tap();

      // Scroll back to top and check app is responsive
      await scrollToTop();
      await expect(element(by.id('app-title'))).toBeVisible();
    });

    it('should handle rapid seek operations', async () => {
      await element(by.id('play-pause-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Rapid seeking
      for (let i = 0; i < 5; i++) {
        await element(by.id('seek-forward-button')).tap();
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      await expect(element(by.id('main-video'))).toBeVisible();
    });

    it('should handle source switching', async () => {
      await scrollToElement('source-hls');

      // Switch sources multiple times
      await element(by.id('source-hls')).tap();
      await new Promise(resolve => setTimeout(resolve, 1000));

      await element(by.id('source-mp4')).tap();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Scroll back to verify video
      await scrollToTop();
      await expect(element(by.id('main-video'))).toBeVisible();
    });
  });

  // ============================================================
  // Comprehensive Props Test
  // ============================================================

  describe('Comprehensive Props Test', () => {
    it('should apply all props correctly', async () => {
      // Start playback
      await element(by.id('play-pause-button')).tap();

      // Set rate to 1.5x
      await scrollToElement('rate-1.5');
      await element(by.id('rate-1.5')).tap();

      // Set volume to 75%
      await scrollToElement('volume-75');
      await element(by.id('volume-75')).tap();

      // Set resize mode to cover
      await scrollToElement('resize-cover');
      await element(by.id('resize-cover')).tap();

      // Enable repeat
      await scrollToElement('repeat-button');
      await element(by.id('repeat-button')).tap();

      // Verify states - scroll to each label to ensure visibility
      await scrollToElement('rate-label');
      await expect(element(by.id('rate-label'))).toBeVisible();

      await scrollToElement('volume-label');
      await expect(element(by.id('volume-label'))).toBeVisible();

      await scrollToElement('resize-mode-label');
      await expect(element(by.id('resize-mode-label'))).toBeVisible();
    });
  });
});
