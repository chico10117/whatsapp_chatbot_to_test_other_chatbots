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
        let cleanMd = '# 🎬 Cinépolis CDMX Centro\n\n';
        
        // Process current movies
        const sections = markdown.split('[**Cinépolis');
        
        sections.slice(1).forEach(section => {
            // Get cinema name
            const cinemaMatch = section.match(/^[^*]*\*\*/);
            if (cinemaMatch) {
                const cinemaName = cinemaMatch[0].replace('**', '');
                cleanMd += `## 🏢 Cinépolis${cinemaName}\n\n`;
                
                // Extract movie blocks
                const movieBlocks = section.split('[![').slice(1);
                
                // Process current movies
                if (movieBlocks.length > 0) {
                    movieBlocks.forEach(block => {
                        // Extract movie title
                        const titleMatch = block.match(/^([^\]]+)/);
                        if (titleMatch) {
                            const title = titleMatch[1];
                            
                            // Skip if it's a promotional block
                            if (title.toLowerCase().includes('promoción')) return;
                            
                            cleanMd += `### ${title}\n`;
                            
                            // Combine language and format info
                            let info = [];
                            if (block.includes('ESP')) {
                                info.push('🗣️ Español');
                            } else if (block.includes('SUB')) {
                                info.push('🌍 SUB');
                            }
                            
                            if (block.includes('4DX')) {
                                info.push('⭐ 4DX');
                            } else if (block.includes('IMAX')) {
                                info.push('⭐ IMAX');
                            } else if (block.includes('PLUUS')) {
                                info.push('⭐ PLUUS');
                            }

                            if (info.length > 0) {
                                cleanMd += `${info.join(' | ')}\n`;
                            }
                            
                            // Extract movie ID from image URL
                            const movieIdMatch = block.match(/\/img\/peliculas\/(\d+)\/1\/1/);
                            if (movieIdMatch) {
                                const movieId = movieIdMatch[1];
                                
                                // Extract showtimes and showtime IDs
                                const timeMatches = block.match(/\[(\d{2}:\d{2})\].*?cinemaVistaId=(\d+)&showtimeVistaId=(\d+)/g);
                                let purchaseUrl = null;

                                if (timeMatches) {
                                    let times = [];
                                    timeMatches.forEach(match => {
                                        const [fullMatch, time, cinemaId, showtimeId] = match.match(/\[(\d{2}:\d{2})\].*?cinemaVistaId=(\d+)&showtimeVistaId=(\d+)/) || [];
                                        if (time) {
                                            times.push(time);
                                            if (!purchaseUrl) {
                                                purchaseUrl = `compra.cinepolis.com/?cinemaVistaId=${cinemaId}&showtimeVistaId=${showtimeId}`;
                                            }
                                        }
                                    });
                                    if (times.length > 0) {
                                        cleanMd += `⏰ ${times.join(' | ')}\n`;
                                    }
                                }

                                // Add purchase link if there are showtimes
                                if (purchaseUrl) {
                                    cleanMd += `🎟️ ${purchaseUrl}\n`;
                                }
                            }
                            
                            cleanMd += '---\n\n';
                        }
                    });
                }
            }
        });

        // Extract and process upcoming releases
        const upcomingMatch = markdown.match(/\[\*\*PRÓXIMAMENTE\*\*\](.*?)(?=\[\*\*Cinépolis|$)/s);
        if (upcomingMatch) {
            cleanMd += `## 🔜 ESTRENOS\n\n`;
            const upcomingSection = upcomingMatch[1];
            const movieRegex = /\[!\[(.*?)\]\((.*?)\)\].*?\((.*?)\)/g;
            let match;

            while ((match = movieRegex.exec(upcomingSection)) !== null) {
                const title = match[1];
                cleanMd += `### ${title}\n---\n\n`;
            }
        }
        
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