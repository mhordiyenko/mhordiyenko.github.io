

class OblastMapping {
    constructor() {
        this.csvOblasts = new Set();
        this.geoOblasts = new Set();
        this.mapping = {};
    }


    getCsvOblasts(csvData) {
        const oblasts = new Set();
        csvData.forEach(record => {
            if (record.level === 'oblast' && record.oblast && record.oblast.trim()) {
                oblasts.add(record.oblast.trim());
            }
        });
        this.csvOblasts = oblasts;
        return Array.from(oblasts).sort();
    }


    getGeoOblasts(topoData) {
        const oblasts = new Set();
        if (topoData.objects && topoData.objects.UKR_adm1) {
            topoData.objects.UKR_adm1.geometries.forEach(feature => {
                if (feature.properties && feature.properties.NAME_1) {
                    oblasts.add(feature.properties.NAME_1.trim());
                }
            });
        }
        this.geoOblasts = oblasts;
        return Array.from(oblasts).sort();
    }


    createMapping() {

        const knownMappings = {
            'Вінницька область': 'Vinnytsya',
            'Волинська область': 'Volyn',
            'Дніпропетровська область': 'Dnipropetrovs\'k',
            'Донецька область': 'Donets\'k',
            'Житомирська область': 'Zhytomyr',
            'Закарпатська область': 'Transcarpathia',
            'Запорізька область': 'Zaporizhzhya',
            'Івано-Франківська область': 'Ivano-Frankivs\'k',
            'Київська область': 'Kiev',
            'Кіровоградська область': 'Kirovohrad',
            'Луганська область': 'Luhans\'k',
            'Львівська область': 'L\'viv',
            'Миколаївська область': 'Mykolayiv',
            'Одеська область': 'Odessa',
            'Полтавська область': 'Poltava',
            'Рівненська область': 'Rivne',
            'Сумська область': 'Sumy',
            'Тернопільська область': 'Ternopil\'',
            'Харківська область': 'Kharkiv',
            'Херсонська область': 'Kherson',
            'Хмельницька область': 'Khmel\'nyts\'kyy',
            'Черкаська область': 'Cherkasy',
            'Чернівецька область': 'Chernivtsi',
            'Чернігівська область': 'Chernihiv',
            'м. Київ': 'Kiev City',
            'АР Крим': 'Crimea'
        };

        this.mapping = knownMappings;
        return knownMappings;
    }


    findMismatches() {
        const csvArray = Array.from(this.csvOblasts);
        const geoArray = Array.from(this.geoOblasts);
        
        const unmappedCsv = csvArray.filter(oblast => !this.mapping[oblast]);
        const unmappedGeo = geoArray.filter(oblast => !Object.values(this.mapping).includes(oblast));

        return {
            csvOblasts: csvArray,
            geoOblasts: geoArray,
            unmappedCsv,
            unmappedGeo,
            mapping: this.mapping
        };
    }


    validateMapping() {
        const results = this.findMismatches();
        const isValid = results.unmappedCsv.length === 0 && results.unmappedGeo.length === 0;
        
        return {
            isValid,
            ...results,
            stats: {
                csvCount: this.csvOblasts.size,
                geoCount: this.geoOblasts.size,
                mappedCount: Object.keys(this.mapping).length
            }
        };
    }


    getGeoName(csvName) {
        return this.mapping[csvName] || csvName;
    }


    getCsvName(geoName) {
        const entry = Object.entries(this.mapping).find(([csv, geo]) => geo === geoName);
        return entry ? entry[0] : geoName;
    }
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = OblastMapping;
} else {
    window.OblastMapping = OblastMapping;
}