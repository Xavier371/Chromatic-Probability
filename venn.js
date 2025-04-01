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
            .attr('viewBox', '0 0 800 600');

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
                        'width': '40px',
                        'height': '40px',
                        'font-size': '16px'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
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

        this.generateVennDiagram();
        this.createGraph();
        this.updatePercentages();
        this.displayRegionProbabilities();
    }

    generateVennDiagram() {
        const centerX = 400;
        const centerY = 300;
        const radius = 150;
        
        // Define the three circles' centers
        const circles = [
            { x: centerX - radius/2, y: centerY - radius/3, r: radius },
            { x: centerX + radius/2, y: centerY - radius/3, r: radius },
            { x: centerX, y: centerY + radius/3, r: radius }
        ];

        // Draw the circles
        circles.forEach((circle, i) => {
            this.vennSvg.append('circle')
                .attr('cx', circle.x)
                .attr('cy', circle.y)
                .attr('r', circle.r)
                .attr('fill', 'none')
                .attr('stroke', 'black')
                .attr('stroke-width', 2);
        });

        // Calculate region centers and areas
        this.calculateRegions(circles);
    }

    calculateRegions(circles) {
        // Define region centers (calculated based on circle intersections)
        const regionCenters = {
            'a': { x: circles[0].x - circles[0].r/2, y: circles[0].y, prob: 0.03 },
            'b': { x: circles[2].x - circles[2].r/2, y: circles[2].y + circles[2].r/3, prob: 0.11 },
            'c': { x: circles[1].x + circles[1].r/2, y: circles[1].y, prob: 0.07 },
            'd': { x: (circles[0].x + circles[1].x)/2, y: circles[0].y - circles[0].r/3, prob: 0.09 },
            'e': { x: circles[1].x - circles[1].r/4, y: circles[1].y + circles[1].r/2, prob: 0.06 },
            'f': { x: circles[0].x + circles[0].r/4, y: circles[0].y + circles[0].r/2, prob: 0.06 },
            'g': { x: circles[0].x - circles[0].r, y: circles[0].y - circles[0].r, prob: 0.57 },
            'h': { x: (circles[0].x + circles[1].x + circles[2].x)/3, 
                   y: (circles[0].y + circles[1].y + circles[2].y)/3, prob: 0.01 }
        };

        // Create regions with probabilities
        Object.entries(regionCenters).forEach(([label, data]) => {
            this.regions[label] = {
                center: { x: data.x, y: data.y },
                probability: data.prob,
                color: null
            };

            // Add region label
            this.vennSvg.append('text')
                .attr('x', data.x)
                .attr('y', data.y)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('class', 'region-label')
                .text(label);
        });

        // Create clip paths for each region
        this.createClipPaths();
    }

    createClipPaths() {
        // Define clip paths for each region
        // This will be used for coloring regions
        const defs = this.vennSvg.append('defs');

        // Add clip paths for each region
        Object.keys(this.regions).forEach(region => {
            const clipPath = defs.append('clipPath')
                .attr('id', `clip-${region}`);

            // Add appropriate paths based on region
            // This would define the exact shape of each region
            // You would need to calculate the proper paths for each region
        });
    }

    createGraph() {
        // Add nodes for each region
        Object.keys(this.regions).forEach(label => {
            this.graph.add({
                group: 'nodes',
                data: { id: label }
            });
        });

        // Define adjacency for the Venn diagram regions
        const adjacencyList = {
            'g': ['a', 'b', 'c', 'd', 'e', 'f'], // outer region connects to all except h
            'a': ['d', 'f', 'g', 'h'],
            'b': ['e', 'f', 'g', 'h'],
            'c': ['d', 'e', 'g', 'h'],
            'd': ['a', 'c', 'g', 'h', 'e'],
            'e': ['b', 'c', 'g', 'h', 'd'],
            'f': ['a', 'b', 'g', 'h'],
            'h': ['a', 'b', 'c', 'd', 'e', 'f']
        };

        // Add edges based on adjacency
        Object.entries(adjacencyList).forEach(([source, targets]) => {
            targets.forEach(target => {
                if (source < target) { // Avoid duplicate edges
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
        });

        // Apply layout
        this.graph.layout({
            name: 'cose',
            padding: 50,
            animate: false,
            nodeDimensionsIncludeLabels: true,
            idealEdgeLength: 100,
            nodeRepulsion: 10000
        }).run();
    }

    colorRegion(regionId) {
        if (!this.selectedColor) return;

        // Update region data
        this.regions[regionId].color = this.selectedColor;
        
        // Update graph node
        this.graph.$(`#${regionId}`).style('background-color', this.colors[this.selectedColor]);
        
        // Update Venn diagram region
        this.colorVennRegion(regionId, this.selectedColor);
        
        this.updatePercentages();
    }

    colorVennRegion(regionId, color) {
        // Remove any existing coloring for this region
        this.vennSvg.selectAll(`.region-${regionId}-color`).remove();

        // Add new colored region
        const region = this.regions[regionId];
        const coloredRegion = this.vennSvg.append('path')
            .attr('class', `region-${regionId}-color`)
            .attr('fill', this.colors[color])
            .attr('opacity', 0.5)
            .attr('clip-path', `url(#clip-${regionId})`);

        // Set the path data based on the region
        // This would need to match the clip path definitions
    }

    updatePercentages() {
        const totals = { red: 0, blue: 0, green: 0, yellow: 0 };
        
        Object.values(this.regions).forEach(region => {
            if (region.color) {
                totals[region.color] += region.probability;
            }
        });

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
                `<div class="region-item">
                    <span>Region ${label}:</span>
                    <span>${region.probability.toFixed(2)}</span>
                </div>`)
            .join('');
    }

    checkSolution() {
        const message = document.getElementById('message');
        message.style.display = 'block';

        // Check if all regions are colored
        const uncoloredRegions = Object.values(this.regions).some(r => !r.color);
        if (uncoloredRegions) {
            message.textContent = 'Please color all regions before checking.';
            message.style.backgroundColor = '#fff3cd';
            return;
        }

        // Check for adjacent same colors
        if (!this.isValidColoring()) {
            message.textContent = 'Invalid coloring: adjacent regions have the same color!';
            message.style.backgroundColor = '#f8d7da';
            return;
        }

        // Check if solution is optimal
        if (this.isOptimalSolution()) {
            message.textContent = 'Perfect! This is an optimal solution!';
            message.style.backgroundColor = '#d4edda';
        } else {
            message.textContent = 'Valid coloring, but not optimal. Try to maximize red first, then blue, then green, then yellow.';
            message.style.backgroundColor = '#fff3cd';
        }
    }

    isValidColoring() {
        return !this.graph.edges().some(edge => {
            const sourceColor = this.regions[edge.source().id()].color;
            const targetColor = this.regions[edge.target().id()].color;
            return sourceColor === targetColor;
        });
    }

    isOptimalSolution() {
        const colorOrder = ['red', 'blue', 'green', 'yellow'];
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
        const colorOrder = ['red', 'blue', 'green', 'yellow'];
        let remainingRegions = {...this.regions};

        // Reset all colors
        Object.keys(this.regions).forEach(regionId => {
            this.regions[regionId].color = null;
            this.graph.$(`#${regionId}`).style('background-color', '#fff');
            this.vennSvg.selectAll(`.region-${regionId}-color`).remove();
        });

        colorOrder.forEach(color => {
            const regionsToColor = this.findOptimalColoringSet(remainingRegions);
            regionsToColor.forEach(regionId => {
                this.regions[regionId].color = color;
                this.colorRegion(regionId);
                delete remainingRegions[regionId];
            });
        });

        this.updatePercentages();
    }

    findOptimalColoringSet(regions) {
        // Similar to findMaxIndependentSet but returns regions to color
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
