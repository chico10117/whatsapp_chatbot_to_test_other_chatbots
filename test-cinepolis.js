import CinepolisFetcher from './cinepolis-fetcher.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('Starting Cinepolis scraper test...');
    const scraper = new CinepolisFetcher('cdmx-centro');
    
    console.log('Generating markdown for Cinépolis CDMX Centro...');
    await scraper.generateMarkdown();
    console.log('Done! Check cinepolis_cartelera.md for the output.');
}

try {
    await main();
} catch (error) {
    console.error('Error running scraper:', error);
} 