import CinepolisFetcher from './yelmo-fetcher.js';

const scraper = new CinepolisFetcher('cdmx');

const main = async () => {
    try {
        console.log('Setting up database...');
        await scraper.setupDB();

        console.log('\nAnalyzing APIs...');
        await scraper.analyzeAPIs();

        console.log('\nFetching movies for Cinépolis Puerta Tlatelolco...');
        const movies = await scraper.findMoviesByCinema('cinepolis-puerta-tlatelolco');
        console.log(JSON.stringify(movies, null, 2));
    } catch (error) {
        console.error('Error running scraper:', error);
    }
}

main(); 