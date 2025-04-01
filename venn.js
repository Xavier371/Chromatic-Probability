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
            .attr('viewBox', '0 0 400 300');

        // Initialize Cytoscape graph
        this.graph = cytoscape({
            container: document.getElementById('graph-container'),
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#fff',
                        'border-color': '#000',
                        'border-width': 1,
                        'label': 'data(id)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': '30px',
                        'height': '30px',
                        'font-size': '14px'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 1,
                        'line-color': '#000',
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

        // Generate 3-4 sets for Venn diagram
        const numSets = 3;
        this.generateVennDiagram(numSets);
        this.createGraph();
        this.updatePercentages();
        this.displayRegionProbabilities();
    }

    generateVennDiagram(numSets) {
        const centerX = 200;
        const centerY = 150;
        const radius = 80;
        
        // Generate set positions in a triangle/square formation
        const setPositions = [];
        for (let i = 0; i < numSets; i++) {
            const angle = (2 * Math.PI * i) / numSets;
            setPositions.push({
                x: centerX + radius * 0.7 * Math.cos(angle),
                y: centerY + radius * 0.7 * Math.sin(angle)
            });
        }

        // Draw circles
        setPositions.forEach((pos, i) => {
            this.vennSvg.append('circle')
                .attr('cx', pos.x)
                .attr('cy', pos.y)
                .attr('r', radius)
                .attr('fill', 'none')
                .attr('stroke', 'black')
                .attr('stroke-width', 1);
        });

        // Generate regions with probabilities
        this.generateRegions(setPositions);
    }

    generateRegions(setPositions) {
        // Generate region g (outside all sets)
        this.regions['g'] = {
            probability: 0.5,
            color: null,
            position: { x: 50, y: 50 }
        };

        // Generate other regions (a through f)
        const regionLabels = ['a', 'b', 'c', 'd', 'e', 'f'];
        let usedLabels = 0;

        // Single set regions
        setPositions.forEach((pos, i) => {
            const label = regionLabels[usedLabels++];
            this.regions[label] = {
                probability: Math.round(Math.random() * 0.15 * 100) / 100,
                color: null,
                position: pos
            };
        });

        // Intersection regions
        for (let i = 0; i < setPositions.length; i++) {
            for (let j = i + 1; j < setPositions.length; j++) {
                if (usedLabels < regionLabels.length) {
                    const label = regionLabels[usedLabels++];
                    this.regions[label] = {
                        probability: Math.round(Math.random() * 0.1 * 100) / 100,
                        color: null,
                        position: {
                            x: (setPositions[i].x + setPositions[j].x) / 2,
                            y: (setPositions[i].y + setPositions[j].y) / 2
                        }
                    };
                }
            }
        }

        // Normalize probabilities to sum to 1
        const total = Object.values(this.regions)
            .reduce((sum, region) => sum + region.probability, 0);
        
        Object.values(this.regions).forEach(region => {
            region.probability = Math.round((region.probability / total) * 100) / 100;
        });

        // Add region labels to Venn diagram
        Object.entries(this.regions).forEach(([label, region]) => {
            this.vennSvg.append('text')
                .attr('x', region.position.x)
                .attr('y', region.position.y)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', '12px')
                .text(label);
        });
    }

        createGraph() {
        // Add nodes for each region
        Object.entries(this.regions).forEach(([label, region]) => {
            this.graph.add({
                group: 'nodes',
                data: { id: label },
            });
        });

        // Add edges between adjacent regions
        const adjacencyRules = {
            'g': ['a', 'b', 'c', 'd', 'e', 'f'], // outside region connects to all
            'a': ['b', 'd', 'g'],
            'b': ['a', 'c', 'e', 'g'],
            'c': ['b', 'f', 'g'],
            'd': ['a', 'e', 'g'],
            'e': ['b', 'd', 'f', 'g'],
            'f': ['c', 'e', 'g']
        };

        Object.entries(adjacencyRules).forEach(([source, targets]) => {
            if (this.regions[source]) {  // Only add if region exists
                targets.forEach(target => {
                    if (this.regions[target] && source < target) {  // Avoid duplicate edges
                        this.graph.add({
                            group: 'edges',
                            data: {
                                id: `${source}-${target}`,
                                source: source,
                                target: target
                            }
                        });
                    }
                });
            }
        });

        // Apply layout
        this.graph.layout({
            name: 'cose',
            padding: 30,
            animate: false,
            nodeDimensionsIncludeLabels: true
        }).run();
    }

    colorRegion(regionId) {
        if (!this.selectedColor) return;

        // Update region color
        this.regions[regionId].color = this.selectedColor;
        
        // Update graph node
        this.graph.$(`#${regionId}`).style('background-color', this.colors[this.selectedColor]);
        
        // Update Venn diagram region
        this.vennSvg.select(`text[data-region="${regionId}"]`)
            .attr('fill', this.colors[this.selectedColor]);

        this.updatePercentages();
    }

    updatePercentages() {
        const totals = { red: 0, blue: 0, green: 0, yellow: 0 };
        
        // Calculate totals for each color
        Object.values(this.regions).forEach(region => {
            if (region.color) {
                totals[region.color] += region.probability;
            }
        });

        // Update percentage displays
        Object.entries(totals).forEach(([color, total]) => {
            const percentage = (total * 100).toFixed(1);
            document.getElementById(`${color}-fill`).style.width = `${percentage}%`;
            document.getElementById(`${color}-percentage`).textContent = `${percentage}%`;
        });
    }

    displayRegionProbabilities() {
        const regionList = document.getElementById('region-list');
        regionList.innerHTML = Object.entries(this.regions)
            .map(([label, region]) => 
                `<div class="region-item">${label}: ${region.probability.toFixed(2)}</div>`)
            .join('');
    }

    checkSolution() {
        const colorOrder = ['red', 'blue', 'green', 'yellow'];
        let isValid = this.isValidColoring();
        let isOptimal = isValid && this.isOptimalOrder(colorOrder);
        
        const message = document.getElementById('message');
        message.style.display = 'block';
        
        if (!isValid) {
            message.textContent = 'Invalid coloring: adjacent regions have the same color!';
            message.style.backgroundColor = '#ffebee';
        } else if (!isOptimal) {
            message.textContent = 'Valid coloring, but not optimal. Try to maximize red first, then blue, then green, then yellow.';
            message.style.backgroundColor = '#fff3e0';
        } else {
            message.textContent = 'Perfect! This is an optimal solution!';
            message.style.backgroundColor = '#e8f5e9';
        }
    }

    isValidColoring() {
        let valid = true;
        this.graph.edges().forEach(edge => {
            const sourceColor = this.regions[edge.source().id()].color;
            const targetColor = this.regions[edge.target().id()].color;
            if (sourceColor && sourceColor === targetColor) {
                valid = false;
            }
        });
        return valid;
    }

    isOptimalOrder(colorOrder) {
        let remainingRegions = {...this.regions};
        
        for (let color of colorOrder) {
            const maxPossible = this.findMaxIndependentSet(remainingRegions);
            const actualTotal = Object.values(this.regions)
                .filter(r => r.color === color)
                .reduce((sum, r) => sum + r.probability, 0);

            if (Math.abs(maxPossible - actualTotal) > 0.001) {
                return false;
            }

            // Remove colored regions for next iteration
            Object.entries(remainingRegions).forEach(([id, region]) => {
                if (this.regions[id].color === color) {
                    delete remainingRegions[id];
                }
            });
        }
        return true;
    }

    findMaxIndependentSet(regions) {
        const graph = new Map();
        Object.keys(regions).forEach(region1 => {
            graph.set(region1, new Set());
            this.graph.edges().forEach(edge => {
                if (edge.source().id() === region1) {
                    graph.get(region1).add(edge.target().id());
                } else if (edge.target().id() === region1) {
                    graph.get(region1).add(edge.source().id());
                }
            });
        });

        const sortedRegions = Object.keys(regions)
            .sort((a, b) => regions[b].probability - regions[a].probability);
        
        let maxProb = 0;
        const colored = new Set();

        sortedRegions.forEach(region => {
            if (![...graph.get(region)].some(n => colored.has(n))) {
                colored.add(region);
                maxProb += regions[region].probability;
            }
        });

        return maxProb;
    }

    solve() {
        // Reset all colors
        Object.values(this.regions).forEach(region => {
            region.color = null;
        });
        this.graph.nodes().style('background-color', '#fff');

        const colorOrder = ['red', 'blue', 'green', 'yellow'];
        let remainingRegions = {...this.regions};

        colorOrder.forEach(color => {
            const regionsToColor = this.findOptimalColoringSet(remainingRegions);
            regionsToColor.forEach(regionId => {
                this.regions[regionId].color = color;
                this.graph.$(`#${regionId}`).style('background-color', this.colors[color]);
                delete remainingRegions[regionId];
            });
        });

        this.updatePercentages();
    }

    findOptimalColoringSet(regions) {
        // Similar to findMaxIndependentSet but returns the regions to color
        const graph = new Map();
        Object.keys(regions).forEach(region1 => {
            graph.set(region1, new Set());
            this.graph.edges().forEach(edge => {
                if (edge.source().id() === region1) {
                    graph.get(region1).add(edge.target().id());
                } else if (edge.target().id() === region1) {
                    graph.get(region1).add(edge.source().id());
                }
            });
        });

        const sortedRegions = Object.keys(regions)
            .sort((a, b) => regions[b].probability - regions[a].probability);
        
        const toColor = new Set();
        const colored = new Set();

        sortedRegions.forEach(region => {
            if (![...graph.get(region)].some(n => colored.has(n))) {
                colored.add(region);
                toColor.add(region);
            }
        });

        return [...toColor];
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
        document.getElementById('check').addEventListener('click', () => this.checkSolution());
        document.getElementById('solve').addEventListener('click', () => this.solve());
        document.getElementById('restart').addEventListener('click', () => this.generateNewPuzzle());
        document.getElementById('help').addEventListener('click', () => {
            alert('Color the regions to maximize the area covered by each color in order: ' +
                  'RED first, then BLUE, then GREEN, then YELLOW. ' +
                  'Adjacent regions cannot share the same color.');
        });
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new VennGame();
});
