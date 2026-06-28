const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('HTTP ERROR:', response.status(), response.url());
    }
  });

  try {
    console.log('Navigating...');
    await page.goto('https://pcshogar.es/app/', { waitUntil: 'networkidle0' });
    console.log('Page loaded. Wait 2 seconds...');
    await page.waitForTimeout(2000);
  } catch (err) {
    console.log('Error navigating:', err.message);
  }

  await browser.close();
})();
