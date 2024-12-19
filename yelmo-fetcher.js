import fetch from 'node-fetch';
import { JSONFilePreset } from 'lowdb/node';
import cron from 'node-cron';
import lodash from 'lodash'

export default class YelmoFetcher {
    constructor(cityKey) {
        this.cityKey = cityKey;
        this.data = null;
        this.db = null;
    }

    async setupDB() {
        this.db = await JSONFilePreset('db.json', { "madrid": {} });
        await this.fetchData();
        this.scheduleDailyUpdate();
    }


    async fetchData() {
        try {
            const response = await fetch("https://yelmocines.es/now-playing.aspx/GetNowPlaying", {
                headers: {
                    "accept": "application/json, text/javascript, */*; q=0.01",
                    "accept-language": "es-419,es;q=0.9",
                    "content-type": "application/json; charset=UTF-8",
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Brave\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"macOS\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "sec-gpc": "1",
                    "x-dtpc": "33$533251920_929h14vFPSSFSJTNBUHCKMKEBPTJBPTIVPUEMOT-0e0",
                    "x-requested-with": "XMLHttpRequest",
                    "Referer": "https://yelmocines.es/cartelera/madrid",
                    "Referrer-Policy": "strict-origin-when-cross-origin"
                },
                body: JSON.stringify({ cityKey: this.cityKey }),
                method: "POST"
            });

            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }

            this.data = await response.json();
            await this.saveData();
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
        }
    }

    async saveData() {
        console.log('Saving data...');
        await this.db.read();
        this.db.data = this.db.data || {};
        this.db.data[this.cityKey] = this.data.d || {};
        await this.db.write();
    }

    async getData() {
        console.log('Reading data...');
        await this.db.read();
        return this.db.data[this.cityKey];
    }

    scheduleDailyUpdate() {
        cron.schedule('0 0 * * *', async () => {
          console.log('Running daily update...');
          await this.fetchData();
          await this.saveData();
          console.log('Database updated.');
        });
      }
    
     async findMoviesByCinema(cinemaKey) {
        const data = await this.getData();
        const cinema = data.Cinemas.find(c => c.Key === cinemaKey);
        
        // Transformar el JSON
        const transformedJson = cinema.Dates[0].Movies.map(movie => {
            const title = movie.Title;
            const synopsis = movie.Synopsis;
            const ratingDescription = movie.RatingDescription;
            const poster = movie.Poster;
        
            // Extraer horarios con ShowtimeAMPM y formato
            const showtimes = movie.Formats.flatMap(formatEntry => {
                const formatName = formatEntry.Name;
                return formatEntry.Showtimes.map(showtime => ({
                    horario: showtime.ShowtimeAMPM,
                    formato: formatName
                }));
            });
        
            // Construir el nuevo objeto
            return {
                titulo: title,
                sinopsis: synopsis,
                clasificacion: ratingDescription,
                foto: poster,
                tandas: showtimes
            };
        });
        return {cine: cinemaKey, movies:transformedJson, date: cinema.Dates[0].ShowtimeDate};
    }

    async printData() {
        const data = await this.findMoviesByCinema("palafox-luxury");
        console.log(JSON.stringify(data));
    }
}

