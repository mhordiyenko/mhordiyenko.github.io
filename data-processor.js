
class DataProcessor {
    constructor() {
        this.rawData = [];
        this.processedData = {
            months: [],
            mapData: {},
            heatmapData: {}
        };
    }


    async loadCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        
        this.rawData = lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const record = {};
            headers.forEach((header, index) => {
                record[header] = values[index] || '';
            });
            return record;
        });
        
        return this.rawData;
    }


    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }


    calculateDuration(startedAt, finishedAt) {
        if (!startedAt || !finishedAt) return 0;
        
        const start = new Date(startedAt);
        const end = new Date(finishedAt);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        
        const durationMs = end.getTime() - start.getTime();
        return Math.max(0, Math.round(durationMs / (1000 * 60))); // хвилини
    }


    filterOblastRecords() {
        return this.rawData.filter(record => 
            record.level === 'oblast' && 
            record.oblast && 
            record.started_at && 
            record.finished_at
        );
    }


    getUniqueMonths(data) {
        const months = new Set();
        
        data.forEach(record => {
            const date = new Date(record.started_at);
            if (!isNaN(date.getTime())) {
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                months.add(monthKey);
            }
        });
        
        return Array.from(months).sort();
    }


    aggregateMapData(oblastData) {
        const mapData = {};
        
        oblastData.forEach(record => {
            const date = new Date(record.started_at);
            if (isNaN(date.getTime())) return;
            
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const oblast = record.oblast;
            const duration = this.calculateDuration(record.started_at, record.finished_at);
            
            if (!mapData[monthKey]) {
                mapData[monthKey] = {};
            }
            
            if (!mapData[monthKey][oblast]) {
                mapData[monthKey][oblast] = {
                    count: 0,
                    totalDuration: 0,
                    durations: []
                };
            }
            
            mapData[monthKey][oblast].count++;
            mapData[monthKey][oblast].totalDuration += duration;
            mapData[monthKey][oblast].durations.push(duration);
        });
        

        Object.keys(mapData).forEach(month => {
            Object.keys(mapData[month]).forEach(oblast => {
                const data = mapData[month][oblast];
                data.averageDuration = data.durations.length > 0 
                    ? Math.round(data.totalDuration / data.durations.length) 
                    : 0;
            });
        });
        
        return mapData;
    }


    aggregateHeatmapData(oblastData) {
        const heatmapData = {};
        
        oblastData.forEach(record => {
            const date = new Date(record.started_at);
            if (isNaN(date.getTime())) return;
            
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;


            let dayOfWeek = date.getDay() - 1;
            if (dayOfWeek < 0) dayOfWeek = 6; // неділя стає 6
            
            const hour = date.getHours();
            
            if (!heatmapData[monthKey]) {
                heatmapData[monthKey] = {};
            }
            
            const key = `${dayOfWeek}-${hour}`;
            if (!heatmapData[monthKey][key]) {
                heatmapData[monthKey][key] = {
                    dayOfWeek,
                    hour,
                    count: 0
                };
            }
            
            heatmapData[monthKey][key].count++;
        });
        

        Object.keys(heatmapData).forEach(month => {
            heatmapData[month] = Object.values(heatmapData[month]);
        });
        
        return heatmapData;
    }


    async processData() {
        

        const oblastData = this.filterOblastRecords();
        

        this.processedData.months = this.getUniqueMonths(oblastData);
        

        this.processedData.mapData = this.aggregateMapData(oblastData);
        

        this.processedData.heatmapData = this.aggregateHeatmapData(oblastData);
        
        return this.processedData;
    }


    exportProcessedData() {
        return JSON.stringify(this.processedData, null, 2);
    }


    getOblastStats() {
        const stats = {};
        const oblastData = this.filterOblastRecords();
        
        oblastData.forEach(record => {
            const oblast = record.oblast;
            if (!stats[oblast]) {
                stats[oblast] = 0;
            }
            stats[oblast]++;
        });
        
        return Object.entries(stats)
            .sort((a, b) => b[1] - a[1])
            .map(([oblast, count]) => ({ oblast, count }));
    }
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataProcessor;
} else {
    window.DataProcessor = DataProcessor;
}