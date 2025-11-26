// Mikromedicinsk Escape Room - JavaScript
class MikromedicinskEscapeRoom {
    constructor() {
        this.data = null;
        this.currentView = 'mainView';
        this.discoveredHotspots = new Set();
        
        // DOM elementer
        this.mainView = document.getElementById('mainView');
        this.popupModal = document.getElementById('popupModal');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        
        this.init();
    }
    
    async init() {
        try {
            this.showLoading(true);
            
            // Indlæs data fra JSON
            await this.loadData();
            
            // Initialiser hovedscene
            this.initializeMainView();
            
            // Tilføj event listeners
            this.addEventListeners();
            
            this.showLoading(false);
            console.log('Mikromedicinsk Escape Room initialiseret');
        } catch (error) {
            console.error('Fejl ved initialisering:', error);
            this.showError('Der opstod en fejl ved indlæsning af applikationen');
        }
    }
    
    async loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error('Kunne ikke indlæse data.json');
            }
            this.data = await response.json();
            
            if (!this.data || !this.data.mainView) {
                throw new Error('Ugyldig data struktur');
            }
            
            console.log('Data indlæst succesfuldt:', this.data);
        } catch (error) {
            console.error('Fejl ved indlæsning af data:', error);
            // Fallback data
            this.data = this.getFallbackData();
        }
    }
    
    getFallbackData() {
        return {
            "mainView": {
                "background": "images/mogens_base.png",
                "title": "Hvad er der galt med Mogens?",
                "infoText": "Klik på de forskellige områder på Mogens for at udforske og finde ud af, hvad der er galt.",
                "hotspots": [
                    {
                        "id": "pancreas",
                        "coords": [220, 480, 60],
                        "title": "Pancreas",
                        "target": "pancreasView"
                    },
                    {
                        "id": "liver",
                        "coords": [400, 420, 70],
                        "title": "Lever",
                        "target": "liverView"
                    },
                    {
                        "id": "insulinpen",
                        "coords": [680, 520, 50],
                        "title": "Insulinpen",
                        "target": "insulinView"
                    },
                    {
                        "id": "glucosemeter",
                        "coords": [780, 600, 50],
                        "title": "Blodsukkermåler",
                        "target": "glucoseView"
                    }
                ]
            },
            "pancreasView": {
                "background": "images/organ_pancreas.png",
                "title": "Pancreas i ubalance",
                "infoText": "Betacellerne producerer for lidt insulin. Hvad sker der her?",
                "hotspots": [
                    {
                        "id": "cell1",
                        "coords": [100, 100, 40],
                        "title": "Betacelle 1",
                        "description": "Denne betacelle fungerer normalt"
                    },
                    {
                        "id": "cell2",
                        "coords": [200, 140, 40],
                        "title": "Betacelle 2",
                        "description": "Denne betacelle producerer for lidt insulin"
                    },
                    {
                        "id": "cell3",
                        "coords": [300, 180, 40],
                        "title": "Betacelle 3",
                        "description": "Denne betacelle er beskadiget"
                    },
                    {
                        "id": "cell4",
                        "coords": [400, 220, 40],
                        "title": "Betacelle 4",
                        "description": "Denne betacelle fungerer normalt"
                    }
                ]
            }
        };
    }
    
    initializeMainView() {
        const mainViewData = this.data.mainView;
        
        // Sæt baggrund
        const backgroundImg = document.getElementById('mainBackground');
        backgroundImg.src = mainViewData.background;
        backgroundImg.alt = mainViewData.title;
        
        // Sæt titel
        document.getElementById('mainTitle').textContent = mainViewData.title;
        
        // Sæt info tekst
        document.getElementById('infoText').textContent = mainViewData.infoText;
        
        // Opret hotspots
        this.createHotspots(mainViewData.hotspots, 'mainView');
    }
    
    createHotspots(hotspots, containerType) {
        const container = containerType === 'mainView' 
            ? document.getElementById('hotspotsContainer')
            : document.getElementById('modalHotspotsContainer');
        
        // Ryd eksisterende hotspots
        container.innerHTML = '';
        
        hotspots.forEach(hotspot => {
            const hotspotElement = document.createElement('div');
            hotspotElement.className = 'hotspot';
            hotspotElement.id = hotspot.id;
            
            // Sæt position og størrelse baseret på coords [x, y, radius]
            const [x, y, radius] = hotspot.coords;
            hotspotElement.style.left = `${x - radius}px`;
            hotspotElement.style.top = `${y - radius}px`;
            hotspotElement.style.width = `${radius * 2}px`;
            hotspotElement.style.height = `${radius * 2}px`;
            
            // Sæt tekst
            hotspotElement.textContent = hotspot.title || hotspot.id;
            
            // Tilføj event listener
            hotspotElement.addEventListener('click', () => {
                this.handleHotspotClick(hotspot, containerType);
            });
            
            // Tilføj hover effekt
            hotspotElement.addEventListener('mouseenter', () => {
                this.showHotspotTooltip(hotspotElement, hotspot);
            });
            
            hotspotElement.addEventListener('mouseleave', () => {
                this.hideHotspotTooltip();
            });
            
            container.appendChild(hotspotElement);
        });
    }
    
    handleHotspotClick(hotspot, containerType) {
        console.log('Hotspot klikket:', hotspot);
        
        // Marker som opdaget
        this.discoveredHotspots.add(hotspot.id);
        
        // Tilføj discovered animation
        const hotspotElement = document.getElementById(hotspot.id);
        if (hotspotElement) {
            hotspotElement.classList.add('discovered');
            setTimeout(() => {
                hotspotElement.classList.remove('discovered');
            }, 600);
        }
        
        if (containerType === 'mainView') {
            // Åbn modal med ny view
            if (hotspot.target && this.data[hotspot.target]) {
                this.openModal(this.data[hotspot.target]);
            } else {
                this.showInfo(`Du klikkede på ${hotspot.title}!`);
            }
        } else {
            // I modal - vis detaljer
            this.showHotspotDetails(hotspot);
        }
    }
    
    openModal(viewData) {
        // Sæt modal titel
        document.getElementById('modalTitle').textContent = viewData.title;
        
        // Sæt modal info tekst
        document.getElementById('modalInfoText').textContent = viewData.infoText;
        
        // Sæt modal baggrund
        const modalImg = document.getElementById('modalBackground');
        modalImg.src = viewData.background;
        modalImg.alt = viewData.title;
        
        // Opret hotspots i modal
        if (viewData.hotspots) {
            this.createHotspots(viewData.hotspots, 'modal');
        }
        
        // Vis modal
        this.popupModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        console.log('Modal åbnet:', viewData.title);
    }
    
    closeModal() {
        this.popupModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Ryd modal hotspots
        document.getElementById('modalHotspotsContainer').innerHTML = '';
        
        console.log('Modal lukket');
    }
    
    showHotspotDetails(hotspot) {
        const infoText = hotspot.description || `Du udforskede ${hotspot.title}`;
        document.getElementById('modalInfoText').textContent = infoText;
        
        // Vis feedback
        this.showFeedback(`Udforsket: ${hotspot.title}`);
    }
    
    showHotspotTooltip(element, hotspot) {
        // Opret tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'hotspot-tooltip';
        tooltip.textContent = hotspot.title;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 0.8rem;
            z-index: 1000;
            pointer-events: none;
            white-space: nowrap;
        `;
        
        // Positioner tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 30}px`;
        tooltip.style.transform = 'translateX(-50%)';
        
        document.body.appendChild(tooltip);
    }
    
    hideHotspotTooltip() {
        const tooltip = document.querySelector('.hotspot-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
    
    addEventListeners() {
        // Close modal knap
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });
        
        // Luk modal ved klik udenfor
        this.popupModal.addEventListener('click', (e) => {
            if (e.target === this.popupModal) {
                this.closeModal();
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.popupModal.classList.contains('active')) {
                this.closeModal();
            }
        });
        
        // Touch support for mobile
        this.addTouchSupport();
    }
    
    addTouchSupport() {
        let startX = 0;
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const diffX = Math.abs(startX - endX);
            const diffY = Math.abs(startY - endY);
            
            // Hvis der ikke er bevægelse, er det et tap
            if (diffX < 10 && diffY < 10) {
                // Tap event håndteres af hotspot event listeners
            }
        });
    }
    
    showLoading(show) {
        if (show) {
            this.loadingIndicator.classList.add('active');
        } else {
            this.loadingIndicator.classList.remove('active');
        }
    }
    
    showError(message) {
        alert(message); // I en rigtig app ville dette være en bedre error handling
    }
    
    showInfo(message) {
        // Simpel info visning
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3498db;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 2000;
            animation: slideInRight 0.3s ease-out;
        `;
        infoDiv.textContent = message;
        
        document.body.appendChild(infoDiv);
        
        setTimeout(() => {
            infoDiv.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(infoDiv);
            }, 300);
        }, 3000);
    }
    
    showFeedback(message) {
        console.log('Feedback:', message);
        // Her kunne man implementere mere avanceret feedback system
    }
    
    // Public API metoder
    getDiscoveredHotspots() {
        return Array.from(this.discoveredHotspots);
    }
    
    getCurrentView() {
        return this.currentView;
    }
    
    addCustomView(viewId, viewData) {
        this.data[viewId] = viewData;
        console.log('Tilføjet custom view:', viewId);
    }
}

// Initialiser app når DOM er klar
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initialiserer Mikromedicinsk Escape Room...');
    
    // Opret app instans
    window.escapeRoom = new MikromedicinskEscapeRoom();
    
    // Gør API tilgængelig globalt
    window.escapeRoomAPI = {
        getDiscovered: () => window.escapeRoom.getDiscoveredHotspots(),
        getCurrentView: () => window.escapeRoom.getCurrentView(),
        addCustomView: (id, data) => window.escapeRoom.addCustomView(id, data),
        closeModal: () => window.escapeRoom.closeModal(),
        openModal: (viewData) => window.escapeRoom.openModal(viewData)
    };
    
    console.log('Escape Room API tilgængelig via window.escapeRoomAPI');
});































