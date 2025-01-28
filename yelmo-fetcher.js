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
        this.scheduleHourlyUpdate();
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

    scheduleHourlyUpdate() {
        //Updte every hour
        cron.schedule('0 * * * *', async () => {
            console.log('Running  hourly update...');
            await this.fetchData();
            await this.saveData();
            console.log('Database updated.');
        });
    }
    _convertToDate(dateString) {
        const timestamp = parseInt(dateString.replace(/\/Date\((\d+)\)\//, '$1'), 10);
        return new Date(timestamp);
    }
    async findMoviesByCinema(cinemaKey) {
        const data = await this.getData();
        const cinema = data.Cinemas.find(c => c.Key === cinemaKey);
        
        // find date based on today on hour 0, minutes 0, seconds 0
        const today = new Date();
        today.setHours(7, 0, 0, 0);

        const actualDate = cinema.Dates.find(d => {
            const filterDate = this._convertToDate(d.FilterDate);
            return filterDate.toDateString() === today.toDateString();
        
        });
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
        return { cine: cinemaKey, movies: transformedJson, date: cinema.Dates[0].ShowtimeDate };
    }

    async printData() {
        const data = await this.findMoviesByCinema("palafox-luxury");
        console.log(JSON.stringify(data));
    }
    async getCinemaMenu(cinemaKey) {
        return {
            cine: cinemaKey, menu: `
MENÚ DOBLE LUXURY 27,40€ (precio total): 2uds refrescos pequeños, 2uds patatas fritas, 1 palomitas pequeñas y 2 platos a elegir, SOLO 1 entrante y 1 principal para 2 personas.
Para empezar, elige una opción:
- Chicken Fingers
- Alitas de Pollo
- Aros de Cebolla
- Tequeños con Salsa

Principales, elige una opción:
- Hot Dog Gourmet
- Hot Dog Pulled Pork
- Nachos Mexicanos
- Bacon Luxury Burger
- Crispy Chicken Luxury Burger
- Luxury Burger
- Sándwich Club Luxury
- Pizza Luxury Margarita / Prosciutto / BBQ / Bourbon
- Platos Protéicos de Pollo o Salmón
- Ensalada César
- Ensalada de Burrata

Complementos:
- Patatas / Batatas fritas / Aros de cebolla /
- Patatas fritas trufadas +1€
- Edamame +1€

Bebidas:
- Refresco / Agua
- Cerveza / Vino

Palomitas:
- Saladas
- Medianas +1€
- Dulces o Mixtas +1€

Elige tu menú:

- Bebida más grande +1€
- Postre +2€
- Haribo +1€

- Combinado +5€
- Coctelería +5€


MENÚ LUXURY 19,40€ { Refresco pequeño, palomitas pequeñas, patatas fritas pequeñas y un plato principal a elegir
    Principales (elige una opción)
	- Chicken Fingers
	- Alitas de Pollo
	- Aros de Cebolla
	- Tequeños con Salsa
	- Hot Dog Gourmet
	- Hot Dog Pulled Pork
	- Nachos Mexicanos
	- Bacon Luxury Burger
	- Crispy Chicken Luxury Burger
	- Luxury Burger
	- Sandwich Club Luxury
	- Pizza Luxury Margarita / Prosciutto / BBQ / Bourbon
	- Platos Protéicos de Pollo o Salmón
	- Ensalada César
	- Ensalada de Burrata
		
	Complementos:	
	- Patatas / Batatas fritas / Aros de cebolla /
	  Patatas fritas trufadas +1€
	- Edamame +1€

    
    Palomitas:
	- Saladas
	- Medianas +1€
	- Dulces o Mixtas +1€
	
	Bebidas:
	- Refresco / Agua
	- Cerveza / Vino
    
	Elige tu menú:
	- Bebida más grande +1€
	- Postre +2€
	- Haribo +1€

	- Combinado +5€
	- Coctelería +5€
}
MENÚ Vegano 19,40€ { Refresco pequeño, palomitas pequeñas, patatas fritas pequeñas y un plato principal a elegir
    Principales (elige una opción)
	- Nachos Veganos
	- Nuggets No Pollo
	- Hot Dog Vegano
	- Ensalada de Bulgur y Trigo
	- Vegana Luxury Bruger
		
	Complementos:	
	- Patatas / Batatas fritas / Aros de cebolla /
	  Patatas fritas trufadas +1€
	- Edamame +1€

    Palomitas:
	- Saladas
	- Medianas +1€
	- Dulces o Mixtas +1€
	
	Bebidas:
	- Refresco / Agua
	- Cerveza / Vino
    
	Elige tu menú:
	- Bebida más grande +1€
	- Postre +2€
	- Haribo +1€

	- Combinado +5€
	- Coctelería +5€
}
MENÚ CLÁSICO 11,50€
- Refresco mediano
- Palomitas medianas
MENÚ SUPER CLÁSICO 11,90€
- Refresco mediano
- Palomitas grandes
MENÚ DUO 14,70€
- 2 Refrescos medianos
- Palomitas grandes
MENÚ SUPER DUO 15,70€
- 2 Refrescos medianos
- 2 Palomitas medianas
* Palomitas dulces o mixtas +1€

Todos nuestros pescados crudos han sido tratados conforme a la legislación vigente.
Si preguntan por sushi, menciona el sushi box.

El siguiente texto encerrado en {} se encuenta en formato JSON, tiene los datos de los diferentes platillos:
{
    {
        "Categoría": "Menú",
        "Platillo": "Luxury",
        "Precio": "19,40",
        "Descripción": "Para 1 persona",
    },{
        "Categoría": "Menú",
        "Platillo": "Doble Luxury",
        "Precio": "27,40",
        "Descripción": "Para 2 personas",
    },{
        "Categoría": "Menú",
        "Platillo": "Menú Vegano",
        "Precio": "19,40",
        "Descripción": "Para 2 personas",
    },{
        "Categoría": "Palomitas",
        "Platillo": "Clásico",
        "Precio": "11,50",
        "Descripción": "Refresco mediano Palomitas medianas",
        "Contenido": "Palomitas 220gr,Refresco 50cl ",
    },{
        "Categoría": "Palomitas",
        "Platillo": "Super Clásico",
        "Precio": "11,90",
        "Descripción": "Refresco mediano Palomitas grandes",
        "Contenido": "Palomitas 350gr,Refresco 50cl",
    },{
        "Categoría": "Palomitas",
        "Platillo": "Dúo",
        "Precio": "14,70",
        "Descripción": "2 Refrescos medianos Palomitas grandes",
        "Contenido": "Refresco 50cl, Refresco 50cl,Palomitas 350gr",
    },{
        "Categoría": "Palomitas",
        "Platillo": "Super Dúo",
        "Precio": "15,70",
        "Descripción": "2 Refrescos medianos 2 Palomitas medianas",
        "Contenido": "Palomitas 220gr, Palomitas 220gr",Refresco 50cl ,Refresco 50cl,
    },{
        "Categoría": "Entrantes",
        "Platillo": "Sushi Box",
        "Precio": "18,25",
        "Descripción": "Sushi variado de nigiri, maki y roll",
        "Contenido": "10 piezas variadas de sushi de niguiri, maki y roll",
        "Alérgenos": "Crustacio,Pescado,Apio,Sulfitos,Moluscos"
    },{
        "Categoría": "Entrantes",
        "Platillo": "Steak Tartar",
        "Precio": "14,95",
        "Descripción": "Sabroso steak tartar con un toque picante ",
        "Contenido": "Carne picada aderezada, 3 perlas de wasabi, 3 julianas de cebolla morada, 1 bastón de cebollino, pizca de semillas de sésamo, 2 tostas",
        "Alérgenos": "Crustáceos,Apio,Soja,Pescado,Sulfitos,Moluscos"    
    },{
        "Categoría": "Entrantes",
        "Platillo": "Tataki de Atún",
        "Precio": "14,95",
        "Descripción": "Atún rojo marcado ligeramente en plancha con un toque picante",
        "Contenido": "Tataki de atún, 3 pizcas de wasabi y jengibre, una pizca de sal maldón, 1 bastónde cebollino cortado en 4",
        "Alérgenos": "Gluten,Pescado,Soja"
    },{
        "Categoría": "Ensaladas",
        "Platillo": "Ensalada Burrata",
        "Precio": "10,40",
        "Descripción": "con rúcula, burrata, tomate rosa, tomate seco, falso pesto casero",
        "Contenido": "",
        "Alérgenos": "Lacteo, Frutos Secos"    
    },{
        "Categoría": "Ensaladas",
        "Platillo": "Platos Proteicos",
        "Precio": "9,90",
        "Descripción": "Combina tu ensalada bulgur y trigo con tu proteina favorita, salmón o pollo",
        "Contenido": "",
        "Alérgenos": "Glúten, sésamo y soja"    
    },{
        "Categoría": "Entrantes",
        "Platillo": "Edamame",
        "Precio": "5,40",
        "Descripción": "Vainas de soja tiernas, recolectadas antes de su maduracion",
        "Contenido": "200GR Edamame, 10gr sal en escamas",
        "Alérgenos": "Soja"    
    },{
        "Categoría": "Entrantes",
        "Platillo": "Nachos Mexicanos",
        "Precio": "11,95",
        "Descripción": "Con queso Rico's, guacamole, crema agria, relish de maíz, pico de gallo y pulled pork",
        "Contenido": "100 g nachos, 50 g guacamole, 30 g salsa agia, 50 g salsa de maíz, 30 g pico de gallo, 30 g queso cheddar, 100 g pulled pork",
        "Alérgenos": "Lacteos, mostaza"    
    },{
        "Categoría": "Entrantes",
        "Platillo": "Tequeños de Queso",
        "Precio": "9,20",
        "Descripción": "Fina y deliciosa masa semi-hojaldrada, crujiente, rellena de queso fresco y sal de tomate y albahaca",
        "Contenido": "6 Tekes con salsa tomate y albahaca",
        "Alérgenos": "Glúten,Huevos,Lacteo,Mostaza"    
    },{
        "Categoría": "Entrantes",
        "Platillo": "Alitas de Pollo",
        "Precio": "8,90",
        "Descripción": "con deliciosa salsa Bourbon",
        "Contenido": "",
        "Alérgenos": "Glúten,Soja"   
    },{
        "Categoría": "Entrantes",
        "Platillo": "Aros de Cebolla",
        "Precio": "8,90",
        "Descripción": "Estilo Americano",
        "Contenido": "",
        "Alérgenos": "Glúten"   
    },{
        "Categoría": "Entrantes",
        "Platillo": "Chicken Fingers",
        "Precio": "8,90",
        "Descripción": "Tiras de pollo muy jugosas, rebozadas y especiadas con salsa de mostaza y miel",
        "Contenido": "6UDS Chicken fingers, 60gr salsa mostaza y miel",
        "Alérgenos": "Glúten,Huevos,Pescado,Lacteo,Sulfitos,Moluscos"   
    },{
        "Categoría": "Entrantes",
        "Platillo": "Nuggets No Pollo",
        "Precio": "8,90",
        "Descripción": "Nuggets veganos elaborados a partir de soja no modificada genéticamente",
        "Contenido": "6UDS De nuggets, 60gr ketchup ahumado",
        "Alérgenos": "Glúten,Soja"    
    },{
        "Categoría": "Acompañamientos",
        "Platillo": "Patatas Trufadas",
        "Precio": "5,70",
        "Descripción": "Doraditas, crujientes con sabor delicado a trufa",
        "Contenido": "255GR De patatas, 7ml de aceite de trufa",
    },{
        "Categoría": "Acompañamientos",
        "Platillo": "Patatas Fritas",
        "Precio": "4,70",
        "Descripción": "Doraditas y crujientes",
        "Contenido": "255GR DE PATATAS",
    },{
        "Categoría": "Acompañamientos",
        "Platillo": "Batatas Fritas",
        "Precio": "4,70",
        "Descripción": "",
    },{
        "Categoría": "Hamburguesas",
        "Platillo": "Hamburguesa Luxury",
        "Precio": "12,45",
        "Descripción": "Hamburguesa de carne 100% vacuno con queso de cabra, relish, rúcula y cebolla caramelizada",
        "Contenido": "",
        "Alérgenos": "Huevos,Pescado,Lacteo,Apio,Mostaza,Sesamo"   
    },{
        "Categoría": "Hamburguesas",
        "Platillo": "Hamburguesa Bacon",
        "Precio": "12,45",
        "Descripción": "con pan brioche, queso cheddar, rúcula, pepinillo y kétchup",
        "Contenido": "",
        "Alérgenos": "Gluten, Huevos, Lacteo, Apio"   
    },{
        "Categoría": "Hamburguesas",
        "Platillo": "Hamburguesa Crispy",
        "Precio": "12,45",
        "Descripción": "pollo, lechuga romana, salsa de trufa y chipotle",
        "Contenido": "",
        "Alérgenos": "Huevos,Pescado,Lacteo,Apio,Mostaza,Sesamo"
    },{
        "Categoría": "Hamburguesas",
        "Platillo": "Hamburguesa Vegana",
        "Precio": "12,45",
        "Descripción": "Hamburguesa hecha en pan de cristal, carne vegana a base de soja, rúcula, pepinillo y kétchup ahumado",
        "Contenido": "Pan de cristal vegano, carne vegana, 40gr rucula, 3 rodajas de pepinillo, ketchup ahumado, 190 gr patatas fritas",
        "Alérgenos": "Glúten,Mostaza,"    
    },{
        "Categoría": "Sándwiches",
        "Platillo": "Luxury Sándwich Club",
        "Precio": "12,45",
        "Descripción": "Hecho sobre pan de chapata con pollo, tomate, bacon ahumado, mayonesa, lechuga romana y queso cheddar",
        "Contenido": "Pan chapata, 40gr de bacon, 100gr de pollo, 40gr de queso cheddar, 80gr de lechuga romana, 1 rodaja de tomate, mayonesa, 190gr de patatas fritas",
        "Alérgenos": "Glúten,Huevos,Lacteo,Apio,Mostaza, soja"
    },{
        "Categoría": "Hot Dogs",
        "Platillo": "Hot Dog Vegano",
        "Precio": "9,20",
        "Descripción": "Hecho en pan de cristal bio, salchicha vegana elaborada a partir de soja no modificada, cebolla crujiente, kétchup y mostaza",
        "Contenido": "Pan hot dog vegano, salchicha vegana, 4 rodajas de pepinillo, 1 pizca de cebolla frita, 15gr de ketchup ahumado, 15gr de mostaza, 190gr patatas fritas ",
        "Alérgenos": "Glúten,Huevos,Lacteo,Soja"    
    },{
        "Categoría": "Hot Dogs",
        "Platillo": "Hot Dog Gourmet",
        "Precio": "9,20",
        "Descripción": "Nuestro hot dog esta hecho en pan brioche, enorme slachicha westfalia, cebolla crujiente, pepinillo, kétchup y mostaza",
        "Contenido": "Pan rock and roll, salchicha westfalia, 4 rodajas de pepinillo, 1 pizca de cebolla frita, 15gr de ketchup ahumado, 15gr de mostaza, 190gr de patatas fritas",
        "Alérgenos": "Glúten, Huevos, Lacteo, apio, Mostaza, soja"    
    },{
        "Categoría": "Hot Dogs",
        "Platillo": "Hot Dog Pulled Pork",
        "Precio": "9,90",
        "Descripción": "con pan brioche, salchicha westfalia, pulled pork, cebolla encurtida, queso Ricos y jalapeños",
        "Contenido": "",
        "Alérgenos": "Glúten, mostaza"    
    },{
        "Categoría": "Pizzas",
        "Platillo": "Margarita",
        "Precio": "10,40",
        "Descripción": "Masa de pizza ovalada hecha con masa madre y aove, tomate italiano, mozzarella y albahaca",
        "Contenido": "Base de pizza, 50gr de salsa de tomate, 45gr de queso mozzarella, 5 hojas de albahaca, pimienta y orégano ",
        "Alérgenos": "Glúten,Lacteos"    
    },{
        "Categoría": "Pizzas",
        "Platillo": "Prosciutto",
        "Precio": "12,45",
        "Descripción": "Masa de pizza ovalada hecha con masa madre y aove, tomate italiano, mozzarella, rúcula y jamón ibérico",
        "Contenido": "Base de pizza, 50 gr de salsa de tomate, 45gr de queso mozzarella, 2 lonchas de jamón serrano, 30gr rúcula, pimienta y orégano",
        "Alérgenos": "Glúten,Lacteo,Soja"    
    },{
        "Categoría": "Pizzas",
        "Platillo": "Barbacoa o BBQ",
        "Precio": "12,45",
        "Descripción": "Masa de pizza ovalada hecha con masa madre y aove, salsa bbq, pollo y mozzarella",
        "Contenido": "Base de pizza, 50gr de salsa bbq, 50gr de pollo, 45gr de queso mozzarella, pimienta y orégano",
        "Alérgenos": "Glúten,Lacteos"    
    },{
        "Categoría": "Pizzas",
        "Platillo": "3 quesos",
        "Precio": "12,45",
        "Descripción": "Masa de pizza ovalada hecha con masa madre y aove, salsa bbq, pollo y mozzarella",
        "Contenido": "Base de pizza, 50gr de salsa bbq, 50gr de pollo, 45gr de queso mozzarella, pimienta y orégano",
        "Alérgenos": "Glúten,Lacteos"    
    },{
        "Categoría": "Pizzas",
        "Platillo": "Bourbon",
        "Precio": "12,45",
        "Descripción": "mozzarella, salsa bourbon, pulled pork y cebolla encurtida",
        "Contenido": "",
        "Alérgenos": "Huevos,Pescado,Apio,Sesamo"    
    },{
        "Categoría": "Postres",
        "Platillo": "Coulant de Chocolate",
        "Precio": "6,20",
        "Descripción": "Bizcocho caliente con chocolate fundido ",
        "Contenido": "Coulant de chocolate, 1 bola de helado de vainilla, sirope de chocolate",
        "Alérgenos": "Lacteo,Sulfitos,Sesamo,Soja,Frutos secos"    
    },{
        "Categoría": "Postres",
        "Platillo": "Tarta Cremosa de Queso",
        "Precio": "6,20",
        "Descripción": "Deliciosa tarta de queso cremosa",
        "Contenido": "1 Pieza de tarta de queso",
        "Alérgenos": "Glúten,Huevos,Lacteos"    
    },{
        "Categoría": "Postres",
        "Platillo": "Tortitas Americanas",
        "Precio": "6,45",
        "Descripción": "chocolate y bola de Häagen-Dazs de vainilla",
        "Contenido": "",
        "Alérgenos": "Glúten, huevos, frutos secos"    
    },{
        "Categoría": "Postres",
        "Platillo": "Mini tarrinas Haggen Dazs",
        "Precio": "3,95",
        "Descripción": "Helados en tarrina de chocolate, mango, stracciatella o vainilla",
        "Contenido": "",
        "Alérgenos": "Lácteos, frutos secos, huevos"    
    },{
        "Categoría": "Postres",
        "Platillo": "Crepes",
        "Precio": "5,20",
        "Descripción": "Nutella / Dulce de leche / Fresa / Frutos rojos / Jamón / Mozzarella",
        "Contenido": "",
        "Alérgenos": "Glúten,Huevos,Lacteo,Soja,frutos Secos"    
    },{
        "Categoría": "Postres",
        "Platillo": "Gofres",
        "Precio": "5,20",
        "Descripción": "Crepes de nutella, dulce de leche, fresa, frutos rojos, jamón o mozarella",
        "Contenido": "Hecha con una masa muy delgada, preparada una mezcla liquida de harina de trigo, leche, mantequilla  y azucar",
        "Alérgenos": "Glúten,Huevos,Lacteo,Soja"    
    },{
        "Categoría": "Bebidas",
        "Platillo": "Refresco 50Cl",
        "Precio": "5,20",
        "Descripción": "Elige entre coca-cola, coca-cola zero, fanta naranja, fanta limón, seven up, nestea ",
    },{
        "Categoría": "Bebidas",
        "Platillo": "Refresco 75Cl",
        "Precio": "5,70",
        "Descripción": "Elige entre coca-cola, coca-cola zero, fanta naranja, fanta limón, seven up, nestea ",
    },{
        "Categoría": "Bebidas",
        "Platillo": "Appletiser",
        "Precio": "",
        "Descripción": "Refresco de zumo de manzana con gas burbujas finas",
    },{
        "Categoría": "Bebidas",
        "Platillo": "Agua 1L",
        "Precio": "2,95",
        "Descripción": "Agua de mineralización débil",
    },{
        "Categoría": "Bebidas",
        "Platillo": "Agua 50Cl",
        "Precio": "2,70",
        "Descripción": "Agua de mineralización débil",
    },{
        "Categoría": "Bebidas",
        "Platillo": "Agua Con Gas 50Cl",
        "Precio": "2,70",
        "Descripción": "Agua con suaves burbujas",
    },{
        "Categoría": "Smoothies",
        "Platillo": "Piña, Mango Y Papaya",
        "Precio": "4,95",
        "Descripción": "Smoothie base de zumo de manzana batido con piezas de fruta natural  de piña, mango y papaya ",
        "Contenido": "250ML Zumo de manzana, 1 bolsa de frutas del sabor elegido",
    },{
        "Categoría": "Smoothies",
        "Platillo": "Plátano Y Fresa",
        "Precio": "4,95",
        "Descripción": "Smoothie base de zumo de manzana batido con piezas de fruta natural de platano y fresa",
        "Contenido": "250ML Zumo de manzana, 1 bolsa de frutas del sabor elegido",
    },{
        "Categoría": "Smoothies",
        "Platillo": "Piña, Espinacas, Pepino Y Col Rizada",
        "Precio": "4,95",
        "Descripción": "Smoothie base de zumo de manzana batido con piezas de fruta natural de piña, espinacas, pepino y col rizada",
        "Contenido": "250ML Zumo de manzana, 1 bolsa de frutas del sabor elegido",
    },{
        "Categoría": "Smoothies",
        "Platillo": "Zanahoria, Mango, Piña Y Maraculla",
        "Precio": "4,95",
        "Descripción": "Smoothie base de zumo de manzana batido con piezas de fruta natural de zanahoría, mango, piña y maraculla",
        "Contenido": "250ML Zumo de manzana, 1 bolsa de frutas del sabor elegido",
    },{
        "Categoría": "Bebidas",
        "Platillo": "Café",
        "Precio": "5,60",
        "Descripción": "El frappé es una bebida de café fría elaborada y servida de forma especial",
        "Contenido": "135ML De leche, 2 cucharadas de concentrado de café, 30ml de sirope de caramelo, hielo",
        "Alérgenos": "Lacteos"    
    },{
        "Categoría": "Bebidas",
        "Platillo": "Chocolate",
        "Precio": "5,60",
        "Descripción": "El frappé es una bebida de café fría elaborada y servida de forma especial",
        "Contenido": "135ML De leche, 2 cucharadas de concentrado de chocolate, 30ml de sirope de chocolate, hielo",
        "Alérgenos": "Lacteos"    
    },{
        "Categoría": "Bebidas",
        "Platillo": "Vainilla",
        "Precio": "5,60",
        "Descripción": "El frappé es una bebida de café fría elaborada y servida de forma especial",
        "Contenido": "135ML De leche, 2 cucharadas de concentrado de vainilla, 30ml de sirope de vainilla, hielo",
        "Alérgenos": "Lacteos"    
    },{
        "Categoría": "Bebidas",
        "Platillo": "Mini Magnum",
        "Precio": "6,45",
        "Descripción": "",
        "Contenido": "",
        "Alérgenos": "Lácteos"    
    },{
        "Categoría": "Bebidas",
        "Platillo": "Capuccino",
        "Precio": "2,70",
        "Descripción": "Disfruta el sabor del café de calidad con las cápsulas de café nespresso con leche cremosa ",
        "Contenido": "",
        "Alérgenos": "Lacteos"    
    },{
        "Categoría": "Bebidas",
        "Platillo": "Café Con Leche",
        "Precio": "2,50",
        "Descripción": "Disfruta el sabor del café de calidad con las cápsulas de café nespresso con la misma proporción de leche que de café",
        "Contenido": "",
        "Alérgenos": "Lacteos"    
    },{
        "Categoría": "Bebidas",
        "Platillo": "Americano",
        "Precio": "2,20",
        "Descripción": "Disfruta el sabor del café de calidad con las cápsulas de café nespresso con la misma proporción de leche y agua caliente",
    },{
        "Categoría": "Bebidas",
        "Platillo": "Cortado",
        "Precio": "1,90",
        "Descripción": "Disfruta el sabor del café de calidad con las cápsulas de café nespresso con un toque de café",
    },{
        "Categoría": "Bebidas",
        "Platillo": "Café Solo",
        "Precio": "1,80",
        "Descripción": "Disfruta el sabor del café de calidad con las cápsulas de café nespresso ",
    },{
        "Categoría": "Bebidas",
        "Platillo": "Té Clasico",
        "Precio": "1,90",
        "Descripción": "Bebida caliente o fría hecha por infusión caliente de hojas, flores o hierbas secas en aguaSABOR RECIO E INTENSO DE HOJAS FERMENTADAS 100% NATURAL",
    },{
        "Categoría": "Bebidas",
        "Platillo": "Té Rojo",
        "Precio": "1,90",
        "Descripción": "Sabor recio e intenso de hojas fermentadas 100% natural",
    },{
        "Categoría": "Bebidas",
        "Platillo": "Manzanilla",
        "Precio": "1,90",
        "Descripción": "Sabor delicado y floral, dulce con un toque de miel y un ligero aroma de hiervas",
    },{
        "Categoría": "Bebidas",
        "Platillo": "Poleo",
        "Precio": "1,80",
        "Descripción": "Cerveza lager de color dorado brillante con un agradable y característico sabor lupulado, elección perfecta para acompañar a las hamburguesas o hot dogs",
        "Contenido": "",
        "Alérgenos": "Glúten"    
    },{
        "Categoría": "Bebidas",
        "Platillo": "Estrella Galicia",
        "Precio": "3,30",
        "Descripción": "Cerveza lager de color dorado brillante con un agradable y característico sabor lupulado, elección perfecta para acompañar a las hamburguesas o hot dogs",
        "Contenido": "",
        "Alérgenos": "Glúten"    
    },{
        "Categoría": "Bebidas",
        "Platillo": "Estrella Galicia 0,0",
        "Precio": "3,30",
        "Descripción": "CERVEZA 0,0 TOSTADA SIN ALCOHOL",
        "Contenido": "",
        "Alérgenos": "Glúten"    
    },{
        "Categoría": "Bebidas",
        "Platillo": "Estrella Galicia 1906",
        "Precio": "3,95",
        "Descripción": "Cerveza sin gluten es una cerveza apta para celíacos y cuenta con el distintivo de la “espiga barrada”, acompañalo con hummus, nachos tex-mex sin pulled pork, sushi, ensalada rúcula y canónigos , wakame",
    },{
        "Categoría": "Bebidas",
        "Platillo": "Coronita",
        "Precio": "3,95",
        "Descripción": "Cerveza lager ligera y refrescante, con aroma ligeramente afrutado la mejor pareja de los nachos tex-mex",
        "Contenido": "",
        "Alérgenos": "Glúten"    
    },{
        "Categoría": "Vinos",
        "Platillo": "Copa Alcorta Crianza-Audaz",
        "Precio": "3,70",
        "Descripción": "Es un tinto con un abanico de aromas donde destacan frutas rojas maduras, como cerezas y ciruelas, entrelazadas con toques de vainilla y especias dulces. en boca, se muestra vigoroso y pleno, persistente y equilibrado. maridaje con las hamburguesas, hot dogs",
    },{
        "Categoría": "Vinos",
        "Platillo": "Copa Azpilicueta Crianza",
        "Precio": "4,20",
        "Descripción": "elaborado a partir de tres tipos de uvas, tempranillo, graciano y mazuelo. en copa, presume de color rojo cereza de buena intensidad, vivaz, limpio y brillante, con destellos dorados. en boca se muestra goloso, dulce y frutal. maridaje pizza prosciutto, pizza bbq o 3 quesos",
    },{
        "Categoría": "Vinos",
        "Platillo": "Copa Tarsus Crianza",
        "Precio": "4,95",
        "Descripción": "Un vino profundo en nariz, donde ofrece complejos e intensos aromas de fruta roja, especias, tostados y aromas florales. en boca su entrada es agradable y se muestra elegante, afrutado y profundo, con personalidad propia. maridajesteak tartar, luxury sandwich club",
    },{
        "Categoría": "Vinos",
        "Platillo": "Alcorta Crianza-Audaz",
        "Precio": "22,90",
        "Descripción": "",
    },{
        "Categoría": "Vinos",
        "Platillo": "Azpilicueta Crianza",
        "Precio": "24,90",
        "Descripción": "Es un tinto con un abanico de aromas donde destacan frutas rojas maduras, como cerezas y ciruelas, entrelazadas con toques de vainilla y especias dulces. en boca, se muestra vigoroso y pleno, persistente y equilibrado. maridaje con las hamburguesas, hot dogs",
    },{
        "Categoría": "Vinos",
        "Platillo": "Tarsus Crianza",
        "Precio": "29,90",
        "Descripción": "Un vino profundo en nariz, donde ofrece complejos e intensos aromas de fruta roja, especias, tostados y aromas florales. en boca su entrada es agradable y se muestra elegante, afrutado y profundo, con personalidad propia. maridajesteak tartar, luxury sandwich club",
    },{
        "Categoría": "Vinos",
        "Platillo": "Azpilicueta Reserva",
        "Precio": "47,00",
        "Descripción": "Vino de fuerte personalidad, de paladar elegante y cuerpo equilibrado que se elabora con el clásico corte riojano formado por tempranillo, graciano y mazuelo. maridaje nachos tex-mex, hamburguesa classic, hot dog gourmet, steak tartar",
    },{
        "Categoría": "Vinos",
        "Platillo": "Ysios Reserva",
        "Precio": "92,00",
        "Descripción": "Aromas de frutas negras maduras como ciruelas y moras, entrelazadas con un toque de especias suaves y vainilla. en boca, su textura envolvente y su concentración de sabores se funden en un equilibrio perfecto. maridaje con la pizza prosciutto, steak tartar, luxury sandwich club",
    },{
        "Categoría": "Vinos",
        "Platillo": "Copa Alcorta Rueda",
        "Precio": "3,70",
        "Descripción": "Vino blanco joven con potente notas de flores blancas, limón y maracuyá. al probarlo, su ligereza se hace presente con una entrada suave y un final que sorprende con un sutil toque amargo. este vino blanco joven es ideal para quien busca sabores refrescantes y un carácter moderadamente aromático, acopáñalo con nuestros tequeños, rollitos crujientes de verdura y pollo",
    },{
        "Categoría": "Vinos",
        "Platillo": "Copa Azpilicueta Rioja Blanco",
        "Precio": "4,20",
        "Descripción": "Elaborado a partir de la variedad viura, la variedad blanca más cultivada en la rioja. esta uva, conocida en otras regiones como macabeo, ofrece vinos de graduación media y una acidez agradable, con rasgos afrutados y florales. las uvas que cultiva la bodega se caracterizan por una baja graduación de alcohol y una acidez bien equilibrada. maridaje perfecto chicken fingers, rollitos de pato, nachos tex-mex",
    },{
        "Categoría": "Vinos",
        "Platillo": "Copa Tarsus Verdejo",
        "Precio": "4,95",
        "Descripción": "Luminoso y atractivo color amarillo pajizo con reflejos verdosos. en boca es fresco sabroso y amplio, acidez refrescante, untuoso y muy equilibrado. maridaje perfecto para sushi, tartar de atún, ensalda de rucula y canonigos, ensalda de wakame",
    },{
        "Categoría": "Vinos",
        "Platillo": "Alcorta Rueda",
        "Precio": "22,90",
        "Descripción": "Vino blanco joven con potente notas de flores blancas, limón y maracuyá. al probarlo, su ligereza se hace presente con una entrada suave y un final que sorprende con un sutil toque amargo. este vino blanco joven es ideal para quien busca sabores refrescantes y un carácter moderadamente aromático, acopáñalo con nuestros tequeños, rollitos crujientes de verdura y pollo",
    },{
        "Categoría": "Vinos",
        "Platillo": "Azpilicueta Rioja Blanco",
        "Precio": "24,90",
        "Descripción": "Elaborado a partir de la variedad viura, la variedad blanca más cultivada en la rioja. esta uva, conocida en otras regiones como macabeo, ofrece vinos de graduación media y una acidez agradable, con rasgos afrutados y florales. las uvas que cultiva la bodega se caracterizan por una baja graduación de alcohol y una acidez bien equilibrada. maridaje perfecto chicken fingers, rollitos de pato, nachos tex-mex",
    },{
        "Categoría": "Vinos",
        "Platillo": "Tarsus Verdejo",
        "Precio": "29,90",
        "Descripción": "Luminoso y atractivo color amarillo pajizo con reflejos verdosos. en boca es fresco sabroso y amplio, acidez refrescante, untuoso y muy equilibrado. maridaje perfecto para sushi, tartar de atún, ensalda de rucula y canonigos, ensalda de wakame",
    },{
        "Categoría": "Vinos",
        "Platillo": "Azpilicueta C. P.",
        "Precio": "47,00",
        "Descripción": "",
        "Contenido": "vino que en nariz ofrece deliciosos aromas de frutas blancas y notas cítricas que le aportan frescura, acompañadas por un sutil toque floral. en boca fluye con un cuerpo agradable y una acidez precisa, muy bien equilibrada. un vino blanco refrescante, perfumado y con encanto. mariaje fantástico en los aperitivos como el hummus, rollitos de pato, rollitos crujientes de verdura y pollo",
    },{
        "Categoría": "Vinos",
        "Platillo": "Ysios",
        "Precio": "92,00",
        "Descripción": "En nariz, de intensidad media con notas de acacia, manzanilla, fruta blanca y notas cítricas; elegantes notas de hinojo, pimienta blanca, sílex y piedra caliza. en boca se muestra con tensión y nervio, y tiene textura y grasa. maridaje aperitivos ensalada cesar, ensalada wakame, ensalada de rucula y canonigos",
    },{
        "Categoría": "Vinos",
        "Platillo": "Copa Azpilicueta",
        "Precio": "4,20",
        "Descripción": "Vino que en nariz ofrece aromas de frutas como el pomelo, la lima, la piña, el albaricoque o los frutos rojos frescos. en boca se reafirma su intenso carácter frutal acompañado de una refrescante acidez. maridaje luxury sandwich club",
    },{
        "Categoría": "Vinos",
        "Platillo": "Copa Campoviejo",
        "Precio": "3,70",
        "Descripción": "En el olfato se produce una fusión de aromas de frutas: fresas, ciruelas y moras negras, con toques florales de rosas y violetas. fragante en el paladar, redondo, suave y delicado, con la justa frescura para producir un refrescante rosado. maridaje ensalada de wakame, edamame, tartar de atún",
    },{
        "Categoría": "Vinos",
        "Platillo": "Azpilicueta",
        "Precio": "24,90",
        "Descripción": "Vino que en nariz ofrece aromas de frutas como el pomelo, la lima, la piña, el albaricoque o los frutos rojos frescos. en boca se reafirma su intenso carácter frutal acompañado de una refrescante acidez. maridaje luxury sandwich club",
    },{
        "Categoría": "Vinos",
        "Platillo": "Campoviejo",
        "Precio": "22,90",
        "Descripción": "En el olfato se produce una fusión de aromas de frutas: fresas, ciruelas y moras negras, con toques florales de rosas y violetas. fragante en el paladar, redondo, suave y delicado, con la justa frescura para producir un refrescante rosado. maridaje ensalada de wakame, edamame, tartar de atún",
    },{
        "Categoría": "Licores",
        "Platillo": "Havana 3 Años",
        "Precio": "10,40",
        "Descripción": "Ron de color pajizo con destellos dorados que en nariz ofrece un completo buqué donde destacan las notas más frescas de la caña de azúcar acompañadas por aromas afrutados y matices que recuerdan al roble",
    },{
        "Categoría": "Licores",
        "Platillo": "Havana Especial Añejo",
        "Precio": "12,95",
        "Descripción": "Sutil mezcla de varios rones añejos, seleccionados para combinar sabor fuerte con aroma ligero. los aromas de caramelo, pera y tabaco ligero dan paso a un bouquet de notas de madera, fruto del añejamiento natural",
    },{
        "Categoría": "Licores",
        "Platillo": "Havana Club",
        "Precio": "12,95",
        "Descripción": "",
    },{
        "Categoría": "Licores",
        "Platillo": "Beefeater London Dry Gin",
        "Precio": "10,40",
        "Descripción": "",
    },{
        "Categoría": "Licores",
        "Platillo": "Beefeater Light",
        "Precio": "10,40",
        "Descripción": "Hecha con un intenso toque de enebro y fuertes notas cítricas, sigue fabricándose en londres según la receta original del fundador james burrough con 9 extractos naturales, como enebro, deliciosa naranja de sevilla y piel de limón",
    },{
        "Categoría": "Licores",
        "Platillo": "Beefeater Pink Light",
        "Precio": "10,40",
        "Descripción": "Beefeater pink light es reducida en alcohol (20% vol. alc.) y calorías, y con sabor a fresa.",
    },{
        "Categoría": "Licores",
        "Platillo": "Tanqueray London Dry Gin",
        "Precio": "10,40",
        "Descripción": "",
        "Contenido": "Su sabor es equilibrado y suave con notas de cítricos y enebro.",
    },{
        "Categoría": "Licores",
        "Platillo": "Tanqueray Ten",
        "Precio": "10,40",
        "Descripción": " Primera ginebra ultra premium. destilada en pequeños lotes con los cuatro botánicos originales de london dry y pomelos enteros frescos, naranjas, limas y flores de manzanilla,",
    },{
        "Categoría": "Licores",
        "Platillo": "Seagram´S Dry Gin",
        "Precio": "12,95",
        "Descripción": "",
        "Contenido": "Ginebra premium que nace de la mezcla y doble destilación en frío de finos y botánicos, juntos a los alcoholes más neutros en alambiques con más de 100 años de antigüedad",
    },{
        "Categoría": "Licores",
        "Platillo": "Plymouth",
        "Precio": "15,95",
        "Descripción": "El rico y suave sabor de plymouth gin es el resultado de una mezcla equilibrada de siete botánicos seleccionados a mano: bayas de enebro, semillas de cilantro, pieles de naranja, pieles de limón, raíz de angélica, cardamomo verde y raíz de orris.",
    },{
        "Categoría": "Licores",
        "Platillo": "Ballantine´S",
        "Precio": "10,40",
        "Descripción": "Aromas suaves y elegantes de miel de brezo con un toque de especias. con equilibrio de sabores dulces y sutiles como el chocolate con leche, la manzana roja y la vainilla. regusto fresco y floral que crea un brillo redondeado",
    },{
        "Categoría": "Licores",
        "Platillo": "Ballantine´S 10",
        "Precio": "12,95",
        "Descripción": "",
    },{
        "Categoría": "Licores",
        "Platillo": "Four Roses Bourbon",
        "Precio": "10,40",
        "Descripción": "bourbon suave, frutal y floral en nariz. elaborado con maíz, cebada y centeno única en su industria y madurado entre 5 y 8 años en barricas de roble americano quemaduras en su interior.",
    },{
        "Categoría": "Licores",
        "Platillo": "Johnnie Walker Black Label",
        "Precio": "12,95",
        "Descripción": "Rico y suave blend whisky escocés elaborado únicamente con whiskies puros de malta y de grano. pasa 12 años en barrica, lo que le da un sabor intenso. el resultado son profundas capas de fruta dulce, especias y vainilla, todo ello envuelto en un manto de humo.",
    },{
        "Categoría": "Licores",
        "Platillo": "Absolut Vodka",
        "Precio": "10,40",
        "Descripción": "Sabor rico, con cuerpo y complejo, pero suave y maduro con el carácter distintivo del grano de trigo, seguido de un toque a frutas secas.",
    },{
        "Categoría": "Licores",
        "Platillo": "Vodka Ciroc",
        "Precio": "12,95",
        "Descripción": "Posee un sabor suave, ligeramente dulce y enriquecido por el carácter natural de la uva. tiene un final fresco y limpio. cristalino. en nariz es refinado, con aromas cítricos.",
    },{
        "Categoría": "Licores",
        "Platillo": "Crema De Ruavieja",
        "Precio": "5,00",
        "Descripción": "Creada a partir de crema de leche, aguardiente de orujo seleccionado de máxima calidad, caramelo, extractos de café y cacao",
    },{
        "Categoría": "Licores",
        "Platillo": "Licor De Hiervas Ruavieja",
        "Precio": "5,00",
        "Descripción": "",
    },{
        "Categoría": "Licores",
        "Platillo": "Havana Especial Añejo",
        "Precio": "6,00",
        "Descripción": " Elaborado con diferentes hierbas naturales previamente seleccionadas y maceradas en aguardiente gallego de primera calidad. tiene un volumen de alcohol de 30º.",
    },{
        "Categoría": "Licores",
        "Platillo": "Patrón Tequila Silver",
        "Precio": "12,00",
        "Descripción": "Se caracteriza por un color transparente, de entrada suave y dulce con notas finales a pimienta. con toques cítricos y afrutados",
    },{
        "Categoría": "Licores",
        "Platillo": "Patrón Tequila Reposado",
        "Precio": "14,00",
        "Descripción": "Es de color tinte ámbar claro, con aroma de madera de roble y agave fresco, con un sabor dulce y complejo, con un final ligero floral y notas de vainilla",
    },{
        "Categoría": "Cocktails",
        "Platillo": "Margarita",
        "Precio": "10,40",
        "Descripción": "La margarita es un cóctel compuesto por tequila, triple seco y zumo de limón. a menudo se sirve con sal en el borde de la copa",
    },{
        "Categoría": "Cocktails",
        "Platillo": "Piña Colada",
        "Precio": "10,40",
        "Descripción": "La piña colada es una bebida cuyos ingredientes principales son la piña, la crema de coco y el ron",
        "Contenido": "Ingredientes principales son la piña, la crema de coco y el ron",
    },{
        "Categoría": "Cocktails",
        "Platillo": "Daiquiri Fresa",
        "Precio": "10,40",
        "Descripción": "Esta variante del daiquiri tradicional es una bebida ligera y simple",
    },{
        "Categoría": "Cocktails",
        "Platillo": "Mojito",
        "Precio": "10,40",
        "Descripción": "Cóctel popular originario de cuba, compuesto de ron, limón, azúcar y  menta o hierbabuena y agua mineral con gas.2​3​ la combinación de sabor dulce, cítrico, y menta complementa el sabor del ron, y hace del mojito una bebida popular de verano",
    },{
        "Categoría": "Dulces",
        "Platillo": "M&M",
        "Precio": "2,95",
        "Descripción": "100g",
    },{
        "Categoría": "Dulces",
        "Platillo": "Conguitos",
        "Precio": "2,95",
        "Descripción": "90GR",
    },{
        "Categoría": "Dulces",
        "Platillo": "Bolsa de Golosinas Haribo",
        "Precio": "2,90",
        "Descripción": "190g",
    },{
        "Categoría": "Dulces",
        "Platillo": "Toblerone",
        "Precio": "2,75",
        "Descripción": "50g",
    },{
        "Categoría": "Dulces",
        "Platillo": "Kit Kat",
        "Precio": "2,20",
        "Descripción": "41,5GR ",
    },{
        "Categoría": "Champán",
        "Platillo": "G. H. Mumm Cordon Rouge",
        "Precio": "98,00",
        "Descripción": "De color dorado y delicadas burbujas, despliega un aroma hipnotizante con toques de frutas amarillas y blancas combinadas con notas de con toques de lichi, piña y praliné. perfecto para acompañar una ensalada (cesar, brotes, wakame) o la tarta de queso",
    },{
        "Categoría": "Champán",
        "Platillo": "G. H. Mumm Ice",
        "Precio": "125,00",
        "Descripción": "Intenso tono amarillo dorado con sutiles destellos ámbar, y sus burbujas son chispeantes.maridaje con hummus, rollitos de pato, pizza margarita o crepes ",
    },{
        "Categoría": "Champán",
        "Platillo": "Perrier-Jouët Grand Brut",
        "Precio": "145,00",
        "Descripción": "Con un equilibrio de notas afrutadas y florales, da como resultando un champagne fresco, vivo y sutil con mucha elegancia. acompañante perfecto para ordenar sushi, tataki de atún o palomitas gourmet",
}`};
    }
}

