
class UkraineMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        
        this.options = {
            width: 800,
            height: 600,
            margin: { top: 20, right: 20, bottom: 40, left: 20 },
            colorScheme: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'],
            strokeColor: '#555555',
            strokeWidth: 1,
            hoverStrokeWidth: 2,
            hoverStrokeColor: '#2c3e50',
            ...options
        };
        
        this.svg = null;
        this.projection = null;
        this.path = null;
        this.colorScale = null;
        this.topoData = null;
        this.geoData = null;
        this.currentData = null;
        this.oblastMapping = null;
        this.tooltip = null;
        
        this.init();
    }
    
    init() {
        
        
        this.container.selectAll('*').remove();
        
        
        this.svg = this.container
            .append('svg')
            .attr('width', this.options.width)
            .attr('height', this.options.height)
            .style('background-color', '#f8f9fa')
            .style('display', 'block'); 
        
        
       
        this.createTooltip();
        
      
        this.colorScale = d3.scaleQuantize()
            .range(this.options.colorScheme);
        
    }
    
    createTooltip() {

        d3.select('body').select('.ukraine-map-tooltip').remove();
        
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'ukraine-map-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('font-size', '12px')
            .style('max-width', '200px')
            .style('z-index', '1000')
            .style('pointer-events', 'none')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.3)');
    }
    
    async loadTopoData(topoDataUrl) {
        try {
            const response = await fetch(topoDataUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.topoData = await response.json();
            
            if (!this.topoData.objects || !this.topoData.objects.UKR_adm1) {
                throw new Error('Invalid TopoJSON structure');
            }
            
            
            this.geoData = topojson.feature(this.topoData, this.topoData.objects.UKR_adm1);
            
            if (!this.geoData.features || this.geoData.features.length === 0) {
                throw new Error('No features found in GeoJSON');
            }
            
            
            this.createProjection();
            
            return this.topoData;
        } catch (error) {
            console.error('Помилка завантаження TopoJSON:', error);
            throw error;
        }
    }
    
    createProjection() {
        
        this.projection = d3.geoAlbers()
            .rotate([-30, 0, 0]) 
            .fitSize([this.options.width * 0.9, this.options.height * 0.9], this.geoData); 
        
        
        this.path = d3.geoPath().projection(this.projection);
        
    }
    
    setOblastMapping(mapping) {
        this.oblastMapping = mapping;
    }
    
    updateData(mapData, selectedMonth) {
        
        if (!mapData) {
            console.warn('mapData is null or undefined');
            this.currentData = {};
        } else if (!mapData[selectedMonth]) {
            console.warn(`No data for month ${selectedMonth}. Available months:`, Object.keys(mapData));
            this.currentData = {};
        } else {
            this.currentData = mapData[selectedMonth];
        }
        
        
        
        const values = Object.values(this.currentData).map(d => d && d.count || 0);
        const maxValue = d3.max(values) || 0;
        
        if (maxValue > 0) {
            this.colorScale.domain([0, maxValue]);
        }
        
        this.render();
    }
    
    render() {
        
        if (!this.geoData) {
            console.warn('GeoJSON дані не завантажено');
            return;
        }
        
        if (!this.projection) {
            console.warn('Projection не створено');
            return;
        }
        
        if (!this.path) {
            console.warn('Path generator не створено');
            return;
        }
        
        this.svg.selectAll('.oblast').remove();
        
        
        
        const oblasts = this.svg.selectAll('.oblast')
            .data(this.geoData.features)
            .enter()
            .append('path')
            .attr('class', 'oblast')
            .attr('d', d => {
                const pathStr = this.path(d);
                if (!pathStr) {
                    console.warn('Empty path for:', d.properties.NAME_1);
                }
                return pathStr;
            })
            .attr('stroke', this.options.strokeColor)
            .attr('stroke-width', this.options.strokeWidth)
            .attr('fill', d => this.getOblastColor(d))
            .style('cursor', 'pointer')
            .style('transition', 'all 0.2s ease'); 
        
        this.addInteractivity(oblasts);
        
    }
    
    getOblastColor(feature) {
        const geoName = feature.properties.NAME_1;
        
        if (!this.currentData) {
            return '#f0f0f0';
        }
        
        let csvName = geoName;
        if (this.oblastMapping && this.oblastMapping.mapping) {
            const mappingEntry = Object.entries(this.oblastMapping.mapping).find(([csv, geo]) => geo === geoName);
            if (mappingEntry) {
                csvName = mappingEntry[0];
            }
        }
        
        const oblastData = this.currentData[csvName];
        
        if (!oblastData || !oblastData.count || oblastData.count === 0) {
            return '#f0f0f0'; 
        }
        
        return this.colorScale(oblastData.count);
    }
    
    addInteractivity(oblasts) {
        const self = this;
        
        oblasts
            .on('mouseover', function(event, d) {
                
                d3.select(this)
                    .attr('stroke-width', self.options.hoverStrokeWidth)
                    .attr('stroke', self.options.hoverStrokeColor)
                    .style('filter', 'brightness(1.1)'); 
                
                
                self.showTooltip(event, d);
            })
            .on('mousemove', function(event, d) {
                self.moveTooltip(event);
            })
            .on('mouseout', function(event, d) {
                
                d3.select(this)
                    .attr('stroke-width', self.options.strokeWidth)
                    .attr('stroke', self.options.strokeColor)
                    .style('filter', 'none');
                
                
                self.hideTooltip();
            });
    }
    
    showTooltip(event, feature) {
        const geoName = feature.properties.NAME_1;
        
        if (!this.currentData) {
            return;
        }
        
        
        let csvName = geoName;
        if (this.oblastMapping && this.oblastMapping.mapping) {
            const mappingEntry = Object.entries(this.oblastMapping.mapping).find(([csv, geo]) => geo === geoName);
            if (mappingEntry) {
                csvName = mappingEntry[0];
            }
        }
        
        const oblastData = this.currentData[csvName];
        
        let content = `<div style="font-weight: bold; margin-bottom: 5px;">${csvName}</div>`;
        
        if (oblastData && oblastData.count) {
            content += `<div>🚨 Кількість тривог: <span style="color: #ff6b6b; font-weight: bold;">${oblastData.count}</span></div>`;
            content += `<div>⏱️ Середня тривалість: <span style="color: #4ecdc4;">${oblastData.averageDuration || 0} хв</span></div>`;
            content += `<div>🕒 Загальна тривалість: <span style="color: #45b7d1;">${Math.round((oblastData.totalDuration || 0) / 60)} год</span></div>`;
        } else {
            content += '<div style="color: #95a5a6;">Немає даних про тривоги</div>';
        }
        
        this.tooltip
            .html(content)
            .style('visibility', 'visible');
        
        this.moveTooltip(event);
    }
    
    moveTooltip(event) {
        const tooltipWidth = this.tooltip.node().getBoundingClientRect().width;
        const tooltipHeight = this.tooltip.node().getBoundingClientRect().height;
        
        let left = event.pageX + 10;
        let top = event.pageY - 10;
        
        
        if (left + tooltipWidth > window.innerWidth) {
            left = event.pageX - tooltipWidth - 10;
        }
        if (top + tooltipHeight > window.innerHeight) {
            top = event.pageY - tooltipHeight - 10;
        }
        
        this.tooltip
            .style('top', top + 'px')
            .style('left', left + 'px');
    }
    
    hideTooltip() {
        this.tooltip.style('visibility', 'hidden');
    }
    
    createLegend() {
        
        if (!this.currentData || Object.keys(this.currentData).length === 0) {
            console.warn('Cannot create legend: no data available');
            return;
        }
        
        this.svg.selectAll('.legend').remove();
        
        const legendWidth = 20;
        const legendHeight = 200;
        const legendX = this.options.width - this.options.margin.right - legendWidth - 20;
        const legendY = this.options.margin.top + 30;
        
        
        const legend = this.svg.append('g').attr('class', 'legend');
        
        
        const defs = this.svg.select('defs').empty() ? this.svg.append('defs') : this.svg.select('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'legend-gradient-' + this.containerId)
            .attr('x1', '0%')
            .attr('y1', '100%')
            .attr('x2', '0%')
            .attr('y2', '0%');
        
        
        const colorRange = this.colorScale.range();
        colorRange.forEach((color, i) => {
            gradient.append('stop')
                .attr('offset', `${(i / (colorRange.length - 1)) * 100}%`)
                .attr('stop-color', color);
        });
        
        
        legend.append('rect')
            .attr('x', legendX)
            .attr('y', legendY)
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', `url(#legend-gradient-${this.containerId})`)
            .style('stroke', '#333')
            .style('stroke-width', 1);
        
        
        const domain = this.colorScale.domain();
        const scale = d3.scaleLinear()
            .domain(domain)
            .range([legendY + legendHeight, legendY]);
        
        const legendAxis = d3.axisRight(scale)
            .ticks(5)
            .tickFormat(d3.format('d'));
        
        legend.append('g')
            .attr('transform', `translate(${legendX + legendWidth}, 0)`)
            .call(legendAxis)
            .selectAll('text')
            .style('font-size', '10px')
            .style('fill', '#333');
        
        
        legend.append('text')
            .attr('x', legendX + legendWidth / 2)
            .attr('y', legendY - 15)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .text('Кількість тривог');
    }
    
    resize(width, height) {
        this.options.width = width;
        this.options.height = height;
        
        this.svg
            .attr('width', width)
            .attr('height', height);
        
        if (this.geoData) {
            
            this.projection
                .fitSize([width * 0.9, height * 0.9], this.geoData);
            
            this.render();
            this.createLegend();
        }
    }
    
    
    getResponsiveSize() {
        const containerElement = this.container.node();
        if (!containerElement) {
            console.warn('Container element not found');
            return { width: 600, height: 450 };
        }
        
        const containerRect = containerElement.getBoundingClientRect();
        const containerWidth = containerRect.width;
        
        
        if (containerWidth < 100) {
            console.warn('Container width too small, using default');
            return { width: 600, height: 450 };
        }
        
        const isMobile = window.innerWidth < 768;
        const isDesktop = window.innerWidth >= 1024;
        
        let width, height;
        
        if (isMobile) {
            width = Math.min(containerWidth - 20, 350);
            height = 300;
        } else if (isDesktop) {
            
            const largeDesktop = window.innerWidth >= 1600;
            width = Math.min(containerWidth - 40, largeDesktop ? 800 : 700);
            height = largeDesktop ? 550 : 500;
        } else {
            
            width = Math.min(containerWidth - 30, 500);
            height = 400;
        }
        
        
        width = Math.max(width, 300);
        height = Math.max(height, 250);
        
        return { width, height };
    }
    
    makeResponsive() {
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        
        const { width, height } = this.getResponsiveSize();
        this.resize(width, height);
        
        
        let lastWindowWidth = window.innerWidth;
        let lastWindowHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const currentWidth = window.innerWidth;
            const currentHeight = window.innerHeight;
            
            
            if (Math.abs(currentWidth - lastWindowWidth) > 50 || Math.abs(currentHeight - lastWindowHeight) > 50) {
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => {
                    const { width: newWidth, height: newHeight } = this.getResponsiveSize();
                    this.resize(newWidth, newHeight);
                    lastWindowWidth = currentWidth;
                    lastWindowHeight = currentHeight;
                }, 300);
            }
        });
    }
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = UkraineMap;
} else {
    window.UkraineMap = UkraineMap;
}