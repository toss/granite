import { device, element, by, expect } from 'detox';

describe('GraniteNaverMap', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display the app title', async () => {
    await expect(element(by.id('app-title'))).toBeVisible();
  });

  it('should navigate to Seoul when button pressed', async () => {
    await element(by.id('goto-seoul')).tap();
    await expect(element(by.id('log-container'))).toBeVisible();
  });

  it('should navigate to Gangnam when button pressed', async () => {
    await element(by.id('goto-gangnam')).tap();
    await expect(element(by.id('log-container'))).toBeVisible();
  });

  it('should navigate to Hongdae when button pressed', async () => {
    await element(by.id('goto-hongdae')).tap();
    await expect(element(by.id('log-container'))).toBeVisible();
  });

  it('should toggle markers overlay', async () => {
    await element(by.id('toggle-markers')).tap();
    await expect(element(by.id('log-container'))).toBeVisible();
  });

  it('should toggle polyline overlay', async () => {
    await element(by.id('toggle-polyline')).tap();
    await expect(element(by.id('log-container'))).toBeVisible();
  });

  it('should toggle polygon overlay', async () => {
    await element(by.id('toggle-polygon')).tap();
    await expect(element(by.id('log-container'))).toBeVisible();
  });

  it('should toggle circle overlay', async () => {
    await element(by.id('toggle-circle')).tap();
    await expect(element(by.id('log-container'))).toBeVisible();
  });

  it('should toggle path overlay', async () => {
    await element(by.id('toggle-path')).tap();
    await expect(element(by.id('log-container'))).toBeVisible();
  });

  it('should cycle map type', async () => {
    await element(by.id('toggle-maptype')).tap();
    await expect(element(by.id('log-container'))).toBeVisible();
  });

  it('should toggle night mode', async () => {
    await element(by.id('toggle-nightmode')).tap();
    await expect(element(by.id('log-container'))).toBeVisible();
  });

  it('should clear logs', async () => {
    await element(by.id('goto-seoul')).tap();
    await element(by.id('clear-logs')).tap();
    await expect(element(by.id('log-container'))).toBeVisible();
  });
});
