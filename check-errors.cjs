const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

(async () => {
    console.log("Starting server...");
    const server = spawn('npm', ['run', 'preview', '--', '--port', '4173'], { shell: true });
    
    await new Promise(r => setTimeout(r, 5000));
    
    console.log("Launching browser...");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (!msg.text().includes('React Router')) {
            console.log('PAGE LOG:', msg.text());
        }
    });
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', req => console.log('REQ FAILED:', req.url()));

    const url = 'http://localhost:4173';
    console.log('Navigating to', url);
    
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    console.log('Done waiting.');
    await browser.close();
    server.kill();
    process.exit(0);
})();
