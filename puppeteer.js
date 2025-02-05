import puppeteer from 'puppeteer';

async function analyzePage() {
    console.log('Starting browser...');
    const browser = await puppeteer.launch({ 
        headless: false,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // Path to Chrome on macOS
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Enable request interception
    await page.setRequestInterception(true);
    
    // Listen for all requests
    page.on('request', request => {
        console.log('Request:', request.url());
        request.continue();
    });

    // Listen for all responses
    page.on('response', async response => {
        const url = response.url();
        if (url.includes('api') || url.includes('_next/data')) {
            console.log('Response URL:', url);
            try {
                const text = await response.text();
                console.log('Response body:', text);
            } catch (e) {
                console.error('Could not get response body:', e);
            }
        }
    });

    try {
        await page.goto('https://cinepolis.com/cartelera/cdmx-centro', {
            waitUntil: 'networkidle0'
        });

        // Wait a bit to capture all requests
        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

console.log('Script started');
analyzePage().then(() => console.log('Script finished')).catch(err => console.error('Fatal error:', err));d