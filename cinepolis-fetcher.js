import fetch from 'node-fetch';
import fs from 'fs/promises';

export default class CinepolisFetcher {
    constructor(cityKey) {
        this.cityKey = cityKey;
        this.firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
        this.lastUpdate = null;
    }

    async fetchData() {
        try {
            console.log(`[${new Date().toISOString()}] Fetching data from Firecrawl...`);
            
            // Validate API key
            if (!this.firecrawlApiKey) {
                throw new Error('Firecrawl API key is not configured');
            }

            // Validate city key
            if (!this.cityKey) {
                throw new Error('City key is not configured');
            }

            const targetUrl = `https://cinepolis.com/cartelera/${this.cityKey}`;
            console.log(`[${new Date().toISOString()}] Target URL: ${targetUrl}`);

            const requestBody = {
                url: targetUrl,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            };

            const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.firecrawlApiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            // Get the response text first
            const responseText = await response.text();
            console.log(`[${new Date().toISOString()}] Response status: ${response.status}`);

            // If not ok, log the response for debugging
            if (!response.ok) {
                console.error(`[${new Date().toISOString()}] Error response:`, responseText);
                throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
            }

            // Save raw response to file
            await fs.writeFile('firecrawl_output.json', responseText);
            console.log(`[${new Date().toISOString()}] Raw output saved to firecrawl_output.json`);
            
            // Try to parse as JSON to validate
            try {
                JSON.parse(responseText);
            } catch (e) {
                console.error(`[${new Date().toISOString()}] Invalid JSON response:`, responseText);
                throw new Error('Invalid JSON response from API');
            }
            
            return responseText;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error fetching data:`, error);
            throw error;
        }
    }

    cleanMarkdown(markdown) {
        // Split into sections by cinema
        const sections = markdown.split('[**Cinépolis');
        
        let cleanMd = '# 🎬 Cartelera Cinépolis CDMX Centro\n\n';
        
        // Process each cinema section
        sections.slice(1).forEach(section => {
            // Get cinema name
            const cinemaMatch = section.match(/^[^*]*\*\*/);
            if (cinemaMatch) {
                const cinemaName = cinemaMatch[0].replace('**', '');
                cleanMd += `## 🏢 Cinépolis${cinemaName}\n\n`;
                
                // Extract movie blocks
                const movieBlocks = section.split('[![').slice(1);
                
                // Separate current and upcoming movies
                const currentMovies = [];
                const upcomingMovies = [];
                
                movieBlocks.forEach(block => {
                    // Extract movie title
                    const titleMatch = block.match(/^([^\]]+)/);
                    if (titleMatch) {
                        const title = titleMatch[1];
                        
                        // Skip if it's a promotional block
                        if (title.toLowerCase().includes('promoción')) return;
                        
                        // Categorize movies
                        if (block.includes('Compra anticipada')) {
                            upcomingMovies.push({ title, block });
                        } else {
                            currentMovies.push({ title, block });
                        }
                    }
                });
                
                // Process current movies
                if (currentMovies.length > 0) {
                    cleanMd += `### 🎬 En Cartelera\n\n`;
                    currentMovies.forEach(({ title, block }) => {
                        cleanMd += `#### ${title}\n\n`;
                        
                        // Extract poster URL
                        const posterMatch = block.match(/https:\/\/static\.cinepolis\.com\/img\/peliculas\/[^)]+/);
                        if (posterMatch) {
                            cleanMd += `![${title}](${posterMatch[0]})\n\n`;
                        }
                        
                        // Extract language
                        if (block.includes('ESP')) {
                            cleanMd += '**Idioma:** 🗣️ Español\n\n';
                        } else if (block.includes('SUB')) {
                            cleanMd += '**Idioma:** 🌍 Subtitulada\n\n';
                        }
                        
                        // Extract format icons
                        if (block.includes('4DX')) {
                            cleanMd += '**Formato:** ⭐ 4DX\n\n';
                        } else if (block.includes('IMAX')) {
                            cleanMd += '**Formato:** ⭐ IMAX\n\n';
                        } else if (block.includes('PLUUS')) {
                            cleanMd += '**Formato:** ⭐ PLUUS\n\n';
                        }
                        
                        // Extract movie ID from image URL
                        const movieIdMatch = block.match(/\/img\/peliculas\/(\d+)\/1\/1/);
                        if (movieIdMatch) {
                            const movieId = movieIdMatch[1];
                            
                            // Extract showtimes and showtime IDs
                            cleanMd += '**Horarios Disponibles:**\n\n';
                            const timeMatches = block.match(/\[(\d{2}:\d{2})\].*?cinemaVistaId=(\d+)&showtimeVistaId=(\d+)/g);
                            let purchaseUrl = null;
                            let firstShowtime = null;

                            if (timeMatches) {
                                timeMatches.forEach(match => {
                                    const [fullMatch, time, cinemaId, showtimeId] = match.match(/\[(\d{2}:\d{2})\].*?cinemaVistaId=(\d+)&showtimeVistaId=(\d+)/) || [];
                                    if (time && cinemaId && showtimeId) {
                                        cleanMd += `⏰ ${time}\n`;
                                        if (!purchaseUrl) {
                                            purchaseUrl = `@https://compra.cinepolis.com/?cinemaVistaId=${cinemaId}&showtimeVistaId=${showtimeId}`;
                                            firstShowtime = time;
                                        }
                                    }
                                });
                                cleanMd += '\n';
                            }

                            // Add purchase link
                            if (purchaseUrl) {
                                cleanMd += `🎟️ Comprar Boletos: ${purchaseUrl.replace('@', '')}\n\n`;
                            }
                        }
                        
                        cleanMd += '---\n\n';
                    });
                }
                
                // Process upcoming movies
                if (upcomingMovies.length > 0) {
                    cleanMd += `### 🔜 PRÓXIMOS ESTRENOS\n\n`;
                    upcomingMovies.forEach(({ title, block }) => {
                        cleanMd += `#### ${title}\n\n`;
                        
                        // Extract poster URL
                        const posterMatch = block.match(/https:\/\/static\.cinepolis\.com\/img\/peliculas\/[^)]+/);
                        if (posterMatch) {
                            cleanMd += `![${title}](${posterMatch[0]})\n\n`;
                        }
                        
                        // Extract purchase link for pre-sale without markdown formatting
                        const purchaseMatch = block.match(/href="([^"]+)"/);
                        if (purchaseMatch) {
                            const purchaseUrl = purchaseMatch[1];
                            cleanMd += `🎟️ Compra Anticipada: ${purchaseUrl}\n\n`;
                        }
                        
                        cleanMd += '---\n\n';
                    });
                }
            }
        });
        
        return cleanMd;
    }

    async generateMarkdown() {
        try {
            const rawData = await this.fetchData();
            const data = JSON.parse(rawData);
            
            // Log the response structure for debugging
            console.log(`[${new Date().toISOString()}] Response structure:`, JSON.stringify(data, null, 2));
            
            // Check if data exists and has the expected structure
            if (!data) {
                throw new Error('Empty response received from API');
            }

            if (!data.success) {
                throw new Error(`API request failed: ${data.error || 'Unknown error'}`);
            }

            // Check for HTML content in data
            if (data.data?.html) {
                // If we have HTML, we can process it into markdown
                const markdown = this.cleanMarkdown(data.data.html);
                await fs.writeFile('cinepolis_cartelera.md', markdown);
                this.lastUpdate = new Date();
                console.log(`[${this.lastUpdate.toISOString()}] Markdown saved to cinepolis_cartelera.md`);
                return markdown;
            } else if (data.data?.markdown) {
                // If we have markdown directly
                const markdown = this.cleanMarkdown(data.data.markdown);
                await fs.writeFile('cinepolis_cartelera.md', markdown);
                this.lastUpdate = new Date();
                console.log(`[${this.lastUpdate.toISOString()}] Markdown saved to cinepolis_cartelera.md`);
                return markdown;
            } else {
                throw new Error('No HTML or markdown content found in response');
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error generating markdown:`, error);
            throw error;
        }
    }

    async findMoviesByCinema(cinemaKey) {
        const markdown = await this.generateMarkdown();
        return {
            cine: cinemaKey,
            markdown: markdown,
            date: new Date().toISOString()
        };
    }

    getLastUpdateTime() {
        return this.lastUpdate;
    }
} 