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
            const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.firecrawlApiKey}`
                },
                body: JSON.stringify({
                    url: `https://cinepolis.com/cartelera/${this.cityKey}`
                })
            });

            const responseData = await response.text();
            console.log(`[${new Date().toISOString()}] Response received, saving to file...`);
            
            // Save raw response to file
            await fs.writeFile('firecrawl_output.json', responseData);
            console.log(`[${new Date().toISOString()}] Raw output saved to firecrawl_output.json`);
            
            return responseData;
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
                        
                        // Extract purchase link
                        const purchaseMatch = block.match(/\]\((https:\/\/cinepolis\.com[^)]+)\)/);
                        if (purchaseMatch) {
                            cleanMd += `🎟️ [Comprar Boletos](${purchaseMatch[1]})\n\n`;
                        }
                        
                        // Extract showtimes
                        cleanMd += '**Horarios Disponibles:**\n\n';
                        const times = block.match(/\[\d{2}:\d{2}\]/g);
                        if (times) {
                            times.forEach(time => {
                                cleanMd += `⏰ ${time.replace(/[\[\]]/g, '')}\n`;
                            });
                            cleanMd += '\n';
                        }
                        
                        // Add WhatsApp sharing link
                        if (purchaseMatch) {
                            const whatsappText = encodeURIComponent(
                                `¡Hola! 🎬 Te comparto los horarios de "${title}" en Cinépolis${cinemaName}.\n\n` +
                                `🎟️ Compra tus boletos aquí: ${purchaseMatch[1]}`
                            );
                            cleanMd += `📱 [Compartir por WhatsApp](https://wa.me/?text=${whatsappText})\n\n`;
                        }
                        
                        cleanMd += '---\n\n';
                    });
                }
                
                // Process upcoming movies
                if (upcomingMovies.length > 0) {
                    cleanMd += `### 🔜 Próximos Estrenos\n\n`;
                    upcomingMovies.forEach(({ title, block }) => {
                        cleanMd += `#### ${title}\n\n`;
                        
                        // Extract poster URL
                        const posterMatch = block.match(/https:\/\/static\.cinepolis\.com\/img\/peliculas\/[^)]+/);
                        if (posterMatch) {
                            cleanMd += `![${title}](${posterMatch[0]})\n\n`;
                        }
                        
                        // Extract purchase link for pre-sale
                        const purchaseMatch = block.match(/\]\((https:\/\/cinepolis\.com[^)]+)\)/);
                        if (purchaseMatch) {
                            cleanMd += `🎟️ [Compra Anticipada](${purchaseMatch[1]})\n\n`;
                            
                            // Add WhatsApp sharing link for upcoming movies
                            const whatsappText = encodeURIComponent(
                                `¡Hola! 🔜 Te comparto información sobre el próximo estreno "${title}" en Cinépolis${cinemaName}.\n\n` +
                                `🎟️ ¡Ya está disponible la preventa! Compra tus boletos aquí: ${purchaseMatch[1]}`
                            );
                            cleanMd += `📱 [Compartir por WhatsApp](https://wa.me/?text=${whatsappText})\n\n`;
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
            
            if (data.success && data.data?.markdown) {
                const markdown = this.cleanMarkdown(data.data.markdown);
                await fs.writeFile('cinepolis_cartelera.md', markdown);
                this.lastUpdate = new Date();
                console.log(`[${this.lastUpdate.toISOString()}] Markdown saved to cinepolis_cartelera.md`);
                return markdown;
            } else {
                throw new Error('No markdown data in response');
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