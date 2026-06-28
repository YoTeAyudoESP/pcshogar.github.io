const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (!msg.text().includes('React Router')) {
            console.log('PAGE LOG:', msg.text());
        }
    });
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', req => console.log('REQ FAILED:', req.url()));

    const url = 'https://pcshogar.es/app/';
    console.log('Navigating to', url);
    
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    console.log('Done waiting.');
    await browser.close();
})();
