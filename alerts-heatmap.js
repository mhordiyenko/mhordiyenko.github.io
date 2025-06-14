
class AlertsHeatmap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        

        this.options = {
            width: 800,
            height: 300,
            margin: { top: 30, right: 80, bottom: 60, left: 80 },
            colorScheme: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'],
            cellPadding: 1,
            ...options
        };
        

        this.innerWidth = this.options.width - this.options.margin.left - this.options.margin.right;
        this.innerHeight = this.options.height - this.options.margin.top - this.options.margin.bottom;
        this.cellWidth = this.innerWidth / 24; // 24 години
        this.cellHeight = this.innerHeight / 7; // 7 днів тижня
        
        this.svg = null;
        this.g = null; // Основна група для вмісту
        this.colorScale = null;
        this.currentData = null;
        this.tooltip = null;
        

        this.dayLabels = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота', 'Неділя'];
        this.dayShortLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
        
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
        

        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.options.margin.left}, ${this.options.margin.top})`);
        
        

        this.createTooltip();
        

        this.colorScale = d3.scaleQuantize()
            .range(this.options.colorScheme);
        

        this.createAxes();
        
    }
    
    createTooltip() {

        d3.select('body').select('.heatmap-tooltip').remove();
        
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'heatmap-tooltip')
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
    
    createAxes() {

        const xScale = d3.scaleBand()
            .domain(d3.range(24)) // 0-23 години
            .range([0, this.innerWidth])
            .padding(0.05);
        
        const yScale = d3.scaleBand()
            .domain(d3.range(7)) // 0-6 дні тижня (0 = понеділок)
            .range([0, this.innerHeight])
            .padding(0.05);
        

        this.xScale = xScale;
        this.yScale = yScale;
        

        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d => `${d}:00`);
        
        this.g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${this.innerHeight})`)
            .call(xAxis)
            .selectAll('text')
            .style('font-size', '10px')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');
        

        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d => this.dayShortLabels[d]);
        
        this.g.append('g')
            .attr('class', 'y-axis')
            .call(yAxis)
            .selectAll('text')
            .style('font-size', '12px');
        

        this.svg.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', this.options.width / 2)
            .attr('y', this.options.height - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .text('Година доби');
        
        this.svg.append('text')
            .attr('class', 'y-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.options.height / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .text('День тижня');
    }
    
    updateData(heatmapData, selectedMonth) {
        
        if (!heatmapData || !heatmapData[selectedMonth]) {
            console.warn('No heatmap data for month:', selectedMonth);
            this.currentData = [];
        } else {
            this.currentData = heatmapData[selectedMonth];
        }
        
        

        const maxValue = d3.max(this.currentData, d => d.count) || 0;
        this.colorScale.domain([0, maxValue]);
        
        this.render(this.currentData);
    }
    
    render() {
        
        if (!this.currentData) {
            console.warn('Heatmap: no currentData');
            return;
        }
        

        const dataMap = new Map();
        this.currentData.forEach(d => {
            const key = `${d.dayOfWeek}-${d.hour}`;
            dataMap.set(key, d.count);
        });
        

        const cellData = [];
        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                const key = `${day}-${hour}`;
                const count = dataMap.get(key) || 0;
                cellData.push({
                    day,
                    hour,
                    count,
                    dayLabel: this.dayLabels[day]
                });
            }
        }
        
        

        this.g.selectAll('.heatmap-cell').remove();
        

        const cells = this.g.selectAll('.heatmap-cell')
            .data(cellData)
            .enter()
            .append('rect')
            .attr('class', 'heatmap-cell')
            .attr('x', d => this.xScale(d.hour))
            .attr('y', d => this.yScale(d.day))
            .attr('width', this.xScale.bandwidth())
            .attr('height', this.yScale.bandwidth())
            .attr('fill', d => this.getCellColor(d.count))
            .attr('stroke', '#333')
            .attr('stroke-width', 0.5)
            .style('cursor', 'pointer');
        

        this.addInteractivity(cells);
        
    }
    
    getCellColor(count) {
        if (count === 0) {
            return '#f5f5f5'; // Світло-сірий для нульових значень
        }
        return this.colorScale(count);
    }
    
    addInteractivity(cells) {
        const self = this;
        
        cells
            .on('mouseover', function(event, d) {

                d3.select(this)
                    .attr('stroke-width', 2)
                    .attr('stroke', '#2c3e50')
                    .style('filter', 'brightness(1.1)');
                

                self.showTooltip(event, d);
            })
            .on('mousemove', function(event, d) {
                self.moveTooltip(event);
            })
            .on('mouseout', function(event, d) {

                d3.select(this)
                    .attr('stroke-width', 0.5)
                    .attr('stroke', '#333')
                    .style('filter', 'none');
                

                self.hideTooltip();
            });
    }
    
    showTooltip(event, data) {
        const content = `
            <div style="font-weight: bold; margin-bottom: 5px;">${data.dayLabel}</div>
            <div>🕐 Час: <span style="color: #4ecdc4;">${data.hour}:00 - ${data.hour + 1}:00</span></div>
            <div>🚨 Кількість тривог: <span style="color: #ff6b6b; font-weight: bold;">${data.count}</span></div>
        `;
        
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
        
        if (!this.currentData || this.currentData.length === 0) {
            console.warn('Cannot create heatmap legend: no data available');
            return;
        }
        

        this.svg.selectAll('.heatmap-legend').remove();
        
        const legendWidth = 15;
        const legendHeight = 150;
        const legendX = this.options.width - this.options.margin.right + 20;
        const legendY = this.options.margin.top + 20;
        

        const legend = this.svg.append('g').attr('class', 'heatmap-legend');
        

        const defs = this.svg.select('defs').empty() ? this.svg.append('defs') : this.svg.select('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'heatmap-legend-gradient-' + this.containerId)
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
            .style('fill', `url(#heatmap-legend-gradient-${this.containerId})`)
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
            .attr('y', legendY - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .text('Кількість тривог');
    }
    
    resize(width, height) {
        this.options.width = width;
        this.options.height = height;
        
        this.innerWidth = this.options.width - this.options.margin.left - this.options.margin.right;
        this.innerHeight = this.options.height - this.options.margin.top - this.options.margin.bottom;
        this.cellWidth = this.innerWidth / 24;
        this.cellHeight = this.innerHeight / 7;
        
        this.svg
            .attr('width', width)
            .attr('height', height);
        
        this.init();
        if (this.currentData) {
            this.render();
            this.createLegend();
        }
    }
    

    getResponsiveSize() {
        const containerElement = this.container.node();
        if (!containerElement) {
            console.warn('Container element not found');
            return { width: 600, height: 350 };
        }
        
        const containerRect = containerElement.getBoundingClientRect();
        const containerWidth = containerRect.width;
        
        
        if (containerWidth < 100) {
            console.warn('Container width too small, using default');
            return { width: 600, height: 350 };
        }
        
        const isMobile = window.innerWidth < 768;
        const isDesktop = window.innerWidth >= 1024;
        
        let width, height;
        
        if (isMobile) {
            width = Math.min(containerWidth - 20, 350);
            height = 200;
        } else if (isDesktop) {
            
            const largeDesktop = window.innerWidth >= 1600;
            width = Math.min(containerWidth - 40, largeDesktop ? 800 : 700);
            height = largeDesktop ? 450 : 400;
        } else {
            
            width = Math.min(containerWidth - 30, 500);
            height = 280;
        }
        
        
        width = Math.max(width, 300);
        height = Math.max(height, 200);
        
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
                    if (this.currentData) {
                        this.render(this.currentData);
                    }
                    lastWindowWidth = currentWidth;
                    lastWindowHeight = currentHeight;
                }, 300);
            }
        });
    }
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertsHeatmap;
} else {
    window.AlertsHeatmap = AlertsHeatmap;
}