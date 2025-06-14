class TimelineSliderSimple {
    constructor(containerId, options = {}) {
        
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        if (!this.container.node()) {
            throw new Error(`Container ${containerId} not found`);
        }
        
        
        this.options = {
            width: 800,
            height: 80,
            margin: { top: 20, right: 40, bottom: 30, left: 40 },
            autoPlayInterval: 2000,
            ...options
        };
        
        this.months = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.onMonthChange = null;
        this.onPlayStateChange = null;
        
        
        try {
            this.init();
        } catch (error) {
            console.error('Error initializing TimelineSliderSimple:', error);
            throw error;
        }
    }
    
    init() {
        
        this.container.selectAll('*').remove();
        
        this.createSimpleControls();
        
    }
    
    createSimpleControls() {
        
        const controlsDiv = this.container
            .append('div')
            .style('text-align', 'center')
            .style('padding', '20px')
            .style('background-color', '#f8f9fa')
            .style('border-radius', '8px')
            .style('margin', '10px 0');
        
        controlsDiv
            .append('h4')
            .style('margin', '0 0 15px 0')
            .style('color', '#2c3e50')
            .text('Timeline Controls');
        
        const buttonsDiv = controlsDiv
            .append('div')
            .style('display', 'flex')
            .style('justify-content', 'center')
            .style('align-items', 'center')
            .style('gap', '10px')
            .style('margin-bottom', '15px');
        
        this.prevButton = buttonsDiv
            .append('button')
            .style('padding', '8px 12px')
            .style('border', '1px solid #ddd')
            .style('border-radius', '4px')
            .style('background-color', 'white')
            .style('cursor', 'pointer')
            .text('Попередній')
            .on('click', () => this.previousMonth());
        
        this.monthDisplay = buttonsDiv
            .append('div')
            .style('padding', '8px 15px')
            .style('background-color', '#f8f9fa')
            .style('color', '#2c3e50')
            .style('border', '1px solid #ddd')
            .style('border-radius', '4px')
            .style('font-weight', 'bold')
            .style('min-width', '150px')
            .style('text-align', 'center')
            .text('Завантаження...');
        
        this.nextButton = buttonsDiv
            .append('button')
            .style('padding', '8px 12px')
            .style('border', '1px solid #ddd')
            .style('border-radius', '4px')
            .style('background-color', 'white')
            .style('cursor', 'pointer')
            .text('Наступний')
            .on('click', () => this.nextMonth());
        
        this.playButton = buttonsDiv
            .append('button')
            .style('padding', '8px 15px')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('background-color', '#27ae60')
            .style('color', 'white')
            .style('cursor', 'pointer')
            .style('font-weight', 'bold')
            .text('▶')
            .on('click', () => this.toggleAutoPlay());
        
        this.sliderDiv = controlsDiv
            .append('div')
            .style('margin-top', '15px');
        
        
        this.slider = this.sliderDiv
            .append('input')
            .attr('type', 'range')
            .attr('min', 0)
            .attr('max', 0)
            .attr('value', 0)
            .style('width', '100%')
            .style('margin', '5px 0')
            .on('input', (event) => {
                const index = parseInt(event.target.value);
                this.setCurrentMonth(index);
            });
        
    }
    
    setMonths(months) {
        
        if (!months || !Array.isArray(months)) {
            throw new Error('Invalid months array');
        }
        
        this.months = months;
        this.currentIndex = 0;
        
        if (this.months.length === 0) {
            console.warn('No months provided');
            return;
        }
        
        if (this.slider) {
            this.slider
                .attr('max', this.months.length - 1)
                .attr('value', 0);
        }
        
        this.updateDisplay();
    }
    
    setCurrentMonth(index) {
        if (index < 0 || index >= this.months.length) return;
        
        const oldIndex = this.currentIndex;
        this.currentIndex = index;
        
        if (this.slider) {
            this.slider.property('value', index);
        }
        
        this.updateDisplay();
        
        if (this.onMonthChange && oldIndex !== this.currentIndex) {
            this.onMonthChange(this.months[this.currentIndex], this.currentIndex);
        }
    }
    
    updateDisplay() {
        if (this.monthDisplay && this.months.length > 0) {
            const currentMonth = this.months[this.currentIndex];
            this.monthDisplay.text(this.formatMonth(currentMonth));
        }
    }
    
    formatMonth(monthStr) {
        const [year, month] = monthStr.split('-');
        const monthNames = [
            'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
            'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'
        ];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
    
    previousMonth() {
        if (this.currentIndex > 0) {
            this.setCurrentMonth(this.currentIndex - 1);
        }
    }
    
    nextMonth() {
        if (this.currentIndex < this.months.length - 1) {
            this.setCurrentMonth(this.currentIndex + 1);
        } else if (this.isPlaying) {
            this.setCurrentMonth(0);
        }
    }
    
    startAutoPlay() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.updatePlayButton();
        
        this.autoPlayTimer = setInterval(() => {
            this.nextMonth();
        }, this.options.autoPlayInterval);
        
        if (this.onPlayStateChange) {
            this.onPlayStateChange(true);
        }
        
    }
    
    stopAutoPlay() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        this.updatePlayButton();
        
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
        
        
        if (this.onPlayStateChange) {
            this.onPlayStateChange(false);
        }
        
    }
    
    toggleAutoPlay() {
        if (this.isPlaying) {
            this.stopAutoPlay();
        } else {
            this.startAutoPlay();
        }
    }
    
    updatePlayButton() {
        if (!this.playButton) return;
        
        if (this.isPlaying) {
            this.playButton
                .text('⏸ Зупинити')
                .style('background-color', '#e74c3c');
        } else {
            this.playButton
                .text('▶ Автопрогравання')
                .style('background-color', '#27ae60');
        }
    }
    
    onMonthChanged(callback) {
        this.onMonthChange = callback;
    }
    
    onPlayStateChanged(callback) {
        this.onPlayStateChange = callback;
    }
    
    makeResponsive() {
        
    }
    
    getCurrentMonth() {
        return this.months[this.currentIndex];
    }
    
    getCurrentIndex() {
        return this.currentIndex;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimelineSliderSimple;
} else {
    window.TimelineSliderSimple = TimelineSliderSimple;
}