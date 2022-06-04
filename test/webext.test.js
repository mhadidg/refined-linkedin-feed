const path = require('path');
const puppeteer = require('puppeteer');

/**
 * To execute this test script, environment variables for LinkedIn
 * account username (IN_USERNAME) and password (IN_PASSWORD) must be
 * provided via .env file or some other method.
 */
require('dotenv').config();

let page;
let browser;

beforeAll(async () => {
  let webext_path = path.resolve(__dirname, '../src');
  browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      `--disable-extensions-except=${webext_path}`,
      `--load-extension=${webext_path}`,
      '--window-size=1920,1080',
    ],
  });

  page = await browser.newPage();
  await page.goto('https://linkedin.com/uas/login');
  await page.type('#username', process.env.IN_USERNAME);
  await page.type('#password', process.env.IN_PASSWORD);
  await Promise.all([
    page.waitForNavigation(),
    page.click('button[type=\'submit\']'),
  ]);

  await page.close();
});

//
beforeEach(async () => {
  page = await browser.newPage();
});

//
describe('Accessing newsfeed', () => {
  test('directly from address bar', async () => {
    await page.goto('https://linkedin.com/feed');

    await expect(page).toMatchElement('#filter-panel', { timeout: 5000 });
  });

  test('via navigation from a different page', async () => {
    await page.goto('https://linkedin.com/in/williamhgates');
    await Promise.all([
      page.waitForNavigation(),
      page.click('a[href=\'/feed/\']'),
    ]);

    await expect(page).toMatchElement('#filter-panel', { timeout: 5000 });
  });
});

//
describe('User preferences', () => {
  beforeEach(async () => {
    await page.goto('https://linkedin.com/feed');
  });

  test('are stored on apply', async () => {
    await page.tap('input#promoted_post.filter');
    await Promise.all([
      page.waitForNavigation(),
      page.click('a#apply_filters'),
    ]);

    await expect(page).toMatchElement('#filter-panel', { timeout: 5000 });
    await expect(page).toMatchElement(
      'input#promoted_post.filter:not(:checked)',
      { timeout: 500 },
    );
  });

  test('are restored on new tab', async () => {
    await expect(page).toMatchElement('#filter-panel', { timeout: 5000 });
    await expect(page).toMatchElement(
      'input#promoted_post.filter:not(:checked)',
      { timeout: 500 },
    );
  });
});

//
afterEach(async () => {
  await page.close();
});

//
afterAll(async () => {
  page = await browser.newPage();
  await page.goto('https://linkedin.com/m/logout');

  await browser.close();
});
