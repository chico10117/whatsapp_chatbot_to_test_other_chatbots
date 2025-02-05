import fetch from 'node-fetch';

async function analyzePage() {
    try {
        // Try the API endpoint directly
        const response = await fetch('https://cinepolis.com/api/billboard/now', {
            headers: {
                "accept": "application/json",
                "accept-language": "es-MX,es;q=0.9",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "referer": "https://cinepolis.com/cartelera/cdmx-centro"
            }
        });

        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error:', error);
        
        // If the first attempt fails, try the alternative endpoint
        try {
            const alternativeResponse = await fetch('https://cinepolis.com/_next/data/2_aGzj5ryGcZYB6fC-4ak/cartelera/cdmx-centro.json', {
                headers: {
                    "accept": "application/json",
                    "accept-language": "es-MX,es;q=0.9",
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    "referer": "https://cinepolis.com/cartelera/cdmx-centro"
                }
            });

            const alternativeData = await alternativeResponse.json();
            console.log(JSON.stringify(alternativeData, null, 2));
        } catch (alternativeError) {
            console.error('Alternative endpoint error:', alternativeError);
        }
    }
}

analyzePage();
