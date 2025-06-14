let ukraineMap;
let alertsHeatmap;
let timelineSlider;
let dataProcessor;
let oblastMapping;
let processedData;
let currentMonth;

async function initializeOptimizedDashboard() {
    try {
        
        const csvResponse = await fetch('air_alerts.csv');
        if (!csvResponse.ok) throw new Error(`CSV loading failed: ${csvResponse.status}`);
        const csvText = await csvResponse.text();
        
        dataProcessor = new DataProcessor();
        await dataProcessor.loadCSV(csvText);
        processedData = await dataProcessor.processData();
        
        if (!processedData || !processedData.months || processedData.months.length === 0) {
            throw new Error('Не вдалося обробити дані або немає даних за жоден місяць');
        }
        
        
        oblastMapping = new OblastMapping();
        oblastMapping.getCsvOblasts(dataProcessor.rawData);
        oblastMapping.createMapping();
        
        const geoResponse = await fetch('ukraine-regions.json');
        if (!geoResponse.ok) throw new Error(`GeoJSON loading failed: ${geoResponse.status}`);
        const geoData = await geoResponse.json();
        oblastMapping.getGeoOblasts(geoData);
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('main-content').style.display = 'flex';
        
        setTimeout(async () => {
            try {
                timelineSlider = new TimelineSliderSimple('timeline-slider', {
                    width: 1000,
                    height: 80,
                    autoPlayInterval: 2500,
                    animationDuration: 400
                });
                
                timelineSlider.makeResponsive();
                timelineSlider.setMonths(processedData.months);
                
                timelineSlider.onMonthChanged((month, index) => {
                    updateAllVisualizations(month);
                });
                
                timelineSlider.onPlayStateChanged((isPlaying) => {
                });
                
                ukraineMap = new UkraineMap('ukraine-map', {
                    width: 1000,
                    height: 650,
                    colorScheme: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'],
                    strokeColor: '#333333',
                    strokeWidth: 0.8,
                    hoverStrokeWidth: 2,
                    hoverStrokeColor: '#2c3e50'
                });
                
                await ukraineMap.loadTopoData('ukraine-regions.json');
                ukraineMap.setOblastMapping(oblastMapping);
                ukraineMap.makeResponsive();
                
                alertsHeatmap = new AlertsHeatmap('alerts-heatmap', {
                    width: 1000,
                    height: 400,
                    colorScheme: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d']
                });
                
                alertsHeatmap.makeResponsive();
                
                if (processedData && processedData.months && processedData.months.length > 0) {
                    currentMonth = processedData.months[0];
                    updateAllVisualizations(currentMonth);
                }
                
                
            } catch (componentError) {
                console.error(' Помилка створення компонентів:', componentError);
                console.error(' Stack trace:', componentError.stack);
                showError(`Помилка створення візуалізацій: ${componentError.message}<br><br>Детальна інформація в консолі браузера (F12)`);
            }
        }, 300);
        
    } catch (error) {
        console.error(' Помилка ініціалізації панелі:', error);
        showError(`Помилка завантаження: ${error.message}`);
    }
}

function updateAllVisualizations(month) {
    
    if (!processedData || !processedData.mapData || !processedData.heatmapData) {
        console.error('processedData or visualization data is null/undefined');
        showError('Дані не завантажено або не оброблено правильно');
        return;
    }
    
    currentMonth = month;
    
    ukraineMap.updateData(processedData.mapData, month);
    ukraineMap.createLegend();
    
    alertsHeatmap.updateData(processedData.heatmapData, month);
    alertsHeatmap.createLegend();
    
    updateStatistics(month);
    
}

function updateStatistics(month) {
    const mapData = processedData.mapData[month] || {};
    const heatmapData = processedData.heatmapData[month] || [];
    
    document.getElementById('currentMonth').textContent = formatMonth(month);
    
    const activeOblasts = Object.keys(mapData).length;
    document.getElementById('activeOblasts').textContent = activeOblasts;
    
    const totalAlerts = Object.values(mapData).reduce((sum, oblast) => sum + (oblast.count || 0), 0);
    document.getElementById('totalAlerts').textContent = totalAlerts.toLocaleString();
    
    let mostActive = '';
    let maxCount = 0;
    Object.entries(mapData).forEach(([oblast, data]) => {
        if (data.count > maxCount) {
            maxCount = data.count;
            mostActive = oblast;
        }
    });
    
    const mostActiveText = mostActive ? 
        `${mostActive.replace('область', '').trim()} (${maxCount})` : 
        'Немає даних';
    document.getElementById('mostActiveOblast').textContent = mostActiveText;
    
    const dayStats = {};
    const hourStats = {};
    const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота', 'Неділя'];
    
    heatmapData.forEach(item => {
        const dayName = dayNames[item.dayOfWeek];
        dayStats[dayName] = (dayStats[dayName] || 0) + item.count;
        hourStats[item.hour] = (hourStats[item.hour] || 0) + item.count;
    });
    
    let mostActiveDay = 'Немає даних';
    let maxDayCount = 0;
    Object.entries(dayStats).forEach(([day, count]) => {
        if (count > maxDayCount) {
            maxDayCount = count;
            mostActiveDay = `${day} (${count})`;
        }
    });
    
    let mostActiveHour = 'Немає даних';
    let maxHourCount = 0;
    Object.entries(hourStats).forEach(([hour, count]) => {
        if (count > maxHourCount) {
            maxHourCount = count;
            mostActiveHour = `${hour}:00 (${count})`;
        }
    });
    
    document.getElementById('mostActiveDay').textContent = mostActiveDay;
    document.getElementById('mostActiveHour').textContent = mostActiveHour;
}

function formatMonth(monthStr) {
    const [year, month] = monthStr.split('-');
    const monthNames = [
        'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
        'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}


function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main-content').style.display = 'none';
    const errorDiv = document.getElementById('error');
    errorDiv.innerHTML = `<strong>Помилка:</strong> ${message}`;
    errorDiv.style.display = 'block';
    
    console.error('Error displayed to user:', message);
}

document.addEventListener('DOMContentLoaded', initializeOptimizedDashboard);

document.addEventListener('visibilitychange', () => {
    if (timelineSlider) {
        if (document.hidden) {
            if (timelineSlider.isPlaying) {
                timelineSlider.stopAutoPlay();
            }
        }
    }
});