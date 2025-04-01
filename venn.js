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
        this.vennSvg = null;
        this.initializeGame();
    }

    initializeGame() {
        // Initialize Venn diagram
        this.vennSvg = d3.select('#venn-container')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', '0 0 600 400');

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
                        'width': '50px',
                        'height': '50px',
                        'font-size': '18px',
                        'color': 'white',
                        'text-outline-width': 2,
                        'text-outline-color': '#2c3e50'
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
        this.vennSvg.selectAll('*').remove();
        this.graph.elements().remove();
        this.regions = {};

        // Generate random number of sets (2-3 for 4-8 regions)
        const numSets = Math.floor(Math.random() * 2) + 2;
        this.generateVennRegions(numSets);
        this.createGraph();
        this.updateAreaTotals();
        this.displayRegionInfo();
    }

    generateVennRegions(numSets) {
        const centerX = 300;
        const centerY = 200;
        const radius = 120;
        const setPositions = [];

        // Generate set positions in a grid
        for (let i = 0; i < numSets; i++) {
            const angle = (2 * Math.PI * i) / numSets;
            setPositions.push({
                x: centerX + radius * 0.5 * Math.cos(angle),
                y: centerY + radius * 0.5 * Math.sin(angle),
                radius: radius
            });
        }

        // Generate regions including the complement
        let regionId = 'a';
        const usedCombinations = new Set();

        // Add complement region first
        this.regions[regionId] = {
            area: 0.2,
            color: null,
            sets: [],
            label: regionId
        };
        regionId = String.fromCharCode(regionId.charCodeAt(0) + 1);

        // Generate all possible combinations of sets
        for (let i = 1; i <= numSets; i++) {
            this.getCombinations([...Array(numSets).keys()], i).forEach(combo => {
                if (this.regions.length < 8) {
                    const key = combo.sort().join(',');
                    if (!usedCombinations.has(key)) {
                        usedCombinations.add(key);
                        this.regions[regionId] = {
                            area: Math.random() * 0.3 + 0.1,
                            color: null,
                            sets: combo,
                            label: regionId
                        };
                        regionId = String.fromCharCode(regionId.charCodeAt(0) + 1);
                    }
                }
            });
        }

        // Normalize areas to sum to 1
        const totalArea = Object.values(this.regions).reduce((sum, r) => sum + r.area, 0);
        Object.values(this.regions).forEach(r => r.area /= totalArea);

        // Draw the Venn diagram
        this.drawVennDiagram(setPositions);
    }

    drawVennDiagram(setPositions) {
        // Draw set circles
        setPositions.forEach((pos, i) => {
            this.vennSvg.append('circle')
                .attr('cx', pos.x)
                .attr('cy', pos.y)
                .attr('r', pos.radius)
                .attr('fill', 'none')
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .style('opacity', 0.3);
        });

        // Add region labels
        Object.entries(this.regions).forEach(([id, region]) => {
            const pos = this.calculateRegionCenter(region, setPositions);
            this.vennSvg.append('text')
                .attr('x', pos.x)
                .attr('y', pos.y)
                .attr('class', 'region-label')
                .text(id);
        });
    }

    calculateRegionCenter(region, setPositions) {
        if (region.sets.length === 0) {
            // Complement region
            return { x: 50, y: 50 };
        }
        
        const x = region.sets.reduce((sum, setIndex) => sum + setPositions[setIndex].x, 0) / region.sets.length;
        const y = region.sets.reduce((sum, setIndex) => sum + setPositions[setIndex].y, 0) / region.sets.length;
        return { x, y };
    }

    createGraph() {
        // Add nodes
        Object.entries(this.regions).forEach(([id, region]) => {
            this.graph.add({
                group: 'nodes',
                data: { id: id }
            });
        });

        // Add edges between adjacent regions
        Object.entries(this.regions).forEach(([id1, region1]) => {
            Object.entries(this.regions).forEach(([id2, region2]) => {
                if (id1 < id2 && this.areRegionsAdjacent(region1, region2)) {
                    this.graph.add({
                        group: 'edges',
                        data: { source: id1, target: id2 }
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
        // Check if regions share a boundary
        if (region1.sets.length === 0 || region2.sets.length === 0) {
            // Handle complement region
            return true;
        }
        return region1.sets.some(set => region2.sets.includes(set));
    }

    colorRegion(regionId) {
        if (!this.selectedColor) return;

        this.regions[regionId].color = this.selectedColor;
        
        // Update graph node color
        this.graph.$(`#${regionId}`).style('background-color', this.colors[this.selectedColor]);
        
        // Update Venn diagram region color
        this.vennSvg.selectAll(`.region-${regionId}`)
            .style('fill', this.colors[this.selectedColor]);

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

    displayRegionInfo() {
        const regionList = document.getElementById('region-list');
        regionList.innerHTML = '<h3>Region Areas</h3>';
        
        Object.entries(this.regions).forEach(([id, region]) => {
            const item = document.createElement('div');
            item.className = 'region-item';
            item.innerHTML = `
                <span>Region ${id}:</span>
                <span>${(region.area * 100).toFixed(1)}%</span>
            `;
            regionList.appendChild(item);
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

        const message = isOptimal ? 
            'Perfect! You found an optimal solution!' : 
            'Not optimal. Try to maximize red first, then blue, then green, then yellow.';
        
        this.showTooltip(message);
    }

    showTooltip(message) {
        const tooltip = document.querySelector('.tooltip');
        tooltip.textContent = message;
        tooltip.style.display = 'block';
        
        setTimeout(() => {
            tooltip.style.display = 'none';
        }, 3000);
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
        document.getElementById('check-solution').addEventListener('click', () => 
            this.checkSolution());
        document.getElementById('show-solution').addEventListener('click', () => 
            this.showSolution());
        document.getElementById('new-puzzle').addEventListener('click', () => 
            this.generateNewPuzzle());
    }

    getCombinations(arr, len) {
        const result = [];
        
        function combine(current, start) {
            if (current.length === len) {
                result.push([...current]);
                return;
            }
            
            for (let i = start; i < arr.length; i++) {
                current.push(arr[i]);
                combine(current, i + 1);
                current.pop();
            }
        }
        
        combine([], 0);
        return result;
    }

    findMaxIndependentSet(regions) {
        // Implementation of maximum independent set algorithm
        // Returns the maximum possible area that can be colored
        // with the same color while respecting adjacency constraints
        const graph = new Map();
        Object.keys(regions).forEach(region1 => {
            graph.set(region1, new Set());
            Object.keys(regions).forEach(region2 => {
                if (region1 !== region2 && this.areRegionsAdjacent(regions[region1], regions[region2])) {
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

    showSolution() {
        // Reset colors
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
                this.colorRegion(regionId);
                delete remainingRegions[regionId];
            });
        });
    }

    findOptimalColoring(regions) {
        // Similar to findMaxIndependentSet but returns regions to color
        const graph = new Map();
        Object.keys(regions).forEach(region1 => {
            graph.set(region1, new Set());
            Object.keys(regions).forEach(region2 => {
                if (region1 !== region2 && this.areRegionsAdjacent(regions[region1], regions[region2])) {
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
