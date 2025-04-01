class VennGame {
    constructor() {
        this.colors = {
            red: '#e74c3c',
            blue: '#3498db',
            green: '#2ecc71',
            yellow: '#f1c40f'
        };
        this.selectedColor = null;
        this.regions = {};
        this.graph = null;
        this.vennDiagram = null;
        this.currentView = 'venn';
        this.initializeGame();
    }

    initializeGame() {
        // Initialize Venn diagram
        this.vennDiagram = d3.select('#venn-container')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%');

        // Initialize Cytoscape graph
        this.graph = cytoscape({
            container: document.getElementById('graph-container'),
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#bdc3c7',
                        'label': 'data(id)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': '60px',
                        'height': '60px',
                        'font-size': '20px',
                        'color': '#2c3e50'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 3,
                        'line-color': '#95a5a6',
                        'curve-style': 'bezier'
                    }
                }
            ]
        });

        this.setupEventListeners();
        this.generateNewPuzzle();
    }

    generateNewPuzzle() {
        // Clear previous state
        this.vennDiagram.selectAll('*').remove();
        this.graph.elements().remove();
        this.regions = {};

        // Generate sets and regions
        const numSets = Math.random() < 0.5 ? 3 : 4;
        this.generateSets(numSets);
        this.createGraph();
        this.updateAreaTotals();
    }

    generateSets(numSets) {
        const width = document.getElementById('venn-container').clientWidth;
        const height = document.getElementById('venn-container').clientHeight;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 4;

        // Generate set positions
        for (let i = 0; i < numSets; i++) {
            const angle = (2 * Math.PI * i) / numSets;
            const x = centerX + (radius * 0.5 * Math.cos(angle));
            const y = centerY + (radius * 0.5 * Math.sin(angle));
            
            const setName = String.fromCharCode(65 + i); // A, B, C, D
            this.vennDiagram.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', radius)
                .attr('class', 'venn-circle')
                .attr('fill', '#bdc3c7')
                .attr('id', `set-${setName}`);

            // Generate regions for this set
            this.generateRegions(setName, x, y, radius);
        }
    }

    generateRegions(setName, x, y, radius) {
        // Create single set region
        const regionId = setName;
        this.regions[regionId] = {
            area: Math.random() * 0.3 + 0.1, // Random area between 0.1 and 0.4
            color: null,
            sets: [setName],
            center: { x, y }
        };

        // Create intersections with existing sets
        Object.keys(this.regions).forEach(existingRegion => {
            if (existingRegion.length === 1 && existingRegion !== setName) {
                const intersectionId = [existingRegion, setName].sort().join('');
                this.regions[intersectionId] = {
                    area: Math.random() * 0.2, // Random intersection area
                    color: null,
                    sets: [existingRegion, setName],
                    center: {
                        x: (x + this.regions[existingRegion].center.x) / 2,
                        y: (y + this.regions[existingRegion].center.y) / 2
                    }
                };
            }
        });

        // Normalize areas to sum to 1
        const totalArea = Object.values(this.regions).reduce((sum, r) => sum + r.area, 0);
        Object.values(this.regions).forEach(r => r.area /= totalArea);
    }

    createGraph() {
        // Add nodes for each region
        Object.keys(this.regions).forEach(regionId => {
            this.graph.add({
                group: 'nodes',
                data: { id: regionId },
                position: {
                    x: this.regions[regionId].center.x,
                    y: this.regions[regionId].center.y
                }
            });
        });

        // Add edges between adjacent regions
        Object.keys(this.regions).forEach(region1 => {
            Object.keys(this.regions).forEach(region2 => {
                if (region1 < region2 && this.areRegionsAdjacent(region1, region2)) {
                    this.graph.add({
                        group: 'edges',
                        data: { source: region1, target: region2 }
                    });
                }
            });
        });

        this.graph.layout({
            name: 'cose',
            padding: 50,
            animate: false
        }).run();
    }

    areRegionsAdjacent(region1, region2) {
        const sets1 = region1.split('');
        const sets2 = region2.split('');
        return sets1.some(set => sets2.includes(set));
    }

    colorRegion(regionId) {
        if (!this.selectedColor) return;

        this.regions[regionId].color = this.selectedColor;
        
        // Update Venn diagram
        const sets = regionId.split('');
        sets.forEach(set => {
            this.vennDiagram.select(`#set-${set}`)
                .attr('fill', this.colors[this.selectedColor]);
        });

        // Update graph
        this.graph.$(`#${regionId}`).style('background-color', this.colors[this.selectedColor]);
        
        this.updateAreaTotals();
    }

    updateAreaTotals() {
        const totals = { red: 0, blue: 0, green: 0, yellow: 0 };
        
        Object.values(this.regions).forEach(region => {
            if (region.color) {
                totals[region.color] += region.area;
            }
        });

        Object.entries(totals).forEach(([color, area]) => {
            const bar = document.getElementById(`${color}-total`);
            bar.style.width = `${area * 100}%`;
            bar.parentElement.querySelector('.area-value').textContent = 
                `${(area * 100).toFixed(1)}%`;
        });
    }

    checkSolution() {
        const colorOrder = ['red', 'blue', 'green', 'yellow'];
        let isOptimal = true;
        let remainingRegions = {...this.regions};

        colorOrder.forEach(color => {
            const maxArea = this.findMaxIndependentSet(remainingRegions);
            const actualArea = Object.values(this.regions)
                .filter(r => r.color === color)
                .reduce((sum, r) => sum + r.area, 0);

            if (Math.abs(maxArea - actualArea) > 0.001) {
                isOptimal = false;
            }

            // Remove colored regions for next iteration
            Object.keys(remainingRegions).forEach(regionId => {
                if (this.regions[regionId].color === color) {
                    delete remainingRegions[regionId];
                }
            });
        });

        alert(isOptimal ? 
            'Correct! This is an optimal solution!' : 
            'Not optimal. Try to maximize red first, then blue, then green, then yellow.');
    }

    findMaxIndependentSet(regions) {
        const graph = new Map();
        Object.keys(regions).forEach(region1 => {
            graph.set(region1, new Set());
            Object.keys(regions).forEach(region2 => {
                if (region1 !== region2 && this.areRegionsAdjacent(region1, region2)) {
                    graph.get(region1).add(region2);
                }
            });
        });

        const sortedRegions = Object.keys(regions)
            .sort((a, b) => regions[b].area - regions[a].area);
        
        let maxArea = 0;
        const colored = new Set();

        sortedRegions.forEach(region => {
            const neighbors = graph.get(region);
            if (![...neighbors].some(n => colored.has(n))) {
                colored.add(region);
                maxArea += regions[region].area;
            }
        });

        return maxArea;
    }

    setupEventListeners() {
        // Color selection
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-btn').forEach(b => 
                    b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedColor = e.target.dataset.color;
            });
        });

        // Graph node clicking
        this.graph.on('tap', 'node', (evt) => {
            if (this.selectedColor) {
                const nodeId = evt.target.id();
                this.colorRegion(nodeId);
            }
        });

        // Button handlers
        document.getElementById('toggle-view').addEventListener('click', () => {
            if (this.currentView === 'venn') {
                document.getElementById('venn-container').style.display = 'none';
                document.getElementById('graph-container').style.display = 'block';
                this.currentView = 'graph';
            } else {
                document.getElementById('venn-container').style.display = 'block';
                document.getElementById('graph-container').style.display = 'none';
                this.currentView = 'venn';
            }
        });

        document.getElementById('show-probs').addEventListener('click', () => {
            const probList = document.getElementById('prob-list');
            probList.style.display = probList.style.display === 'none' ? 'block' : 'none';
            
            if (probList.style.display === 'block') {
                probList.innerHTML = '<h3>Region Probabilities:</h3>';
                Object.entries(this.regions).forEach(([regionId, region]) => {
                    const item = document.createElement('div');
                    item.className = 'prob-item';
                    item.innerHTML = `
                        <span>Region ${regionId}:</span>
                        <span>${(region.area * 100).toFixed(1)}%</span>
                    `;
                    probList.appendChild(item);
                });
            }
        });

        document.getElementById('check-solution').addEventListener('click', () => 
            this.checkSolution());
        document.getElementById('solve').addEventListener('click', () => 
            this.showOptimalSolution());
        document.getElementById('reset').addEventListener('click', () => 
            this.generateNewPuzzle());
    }

    showOptimalSolution() {
        // Reset all colors
        Object.keys(this.regions).forEach(regionId => {
            this.regions[regionId].color = null;
            this.graph.$(`#${regionId}`).style('background-color', '#bdc3c7');
        });

        const colorOrder = ['red', 'blue', 'green', 'yellow'];
        let remainingRegions = {...this.regions};

        colorOrder.forEach(color => {
            const solution = this.findOptimalColoring(remainingRegions);
            solution.forEach(regionId => {
                this.regions[regionId].color = color;
                this.graph.$(`#${regionId}`).style('background-color', this.colors[color]);
                delete remainingRegions[regionId];
            });
        });

        this.updateAreaTotals();
    }

    findOptimalColoring(regions) {
        const graph = new Map();
        Object.keys(regions).forEach(region1 => {
            graph.set(region1, new Set());
            Object.keys(regions).forEach(region2 => {
                if (region1 !== region2 && this.areRegionsAdjacent(region1, region2)) {
                    graph.get(region1).add(region2);
                }
            });
        });

        const sortedRegions = Object.keys(regions)
            .sort((a, b) => regions[b].area - regions[a].area);
        
        const toColor = new Set();
        const colored = new Set();

        sortedRegions.forEach(region => {
            const neighbors = graph.get(region);
            if (![...neighbors].some(n => colored.has(n))) {
                colored.add(region);
                toColor.add(region);
            }
        });

        return [...toColor];
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new VennGame();
});
