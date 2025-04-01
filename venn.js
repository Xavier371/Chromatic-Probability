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
            .attr('viewBox', '0 0 800 600')
            .append('g')
            .attr('transform', 'translate(50, 50)');

        // Initialize Cytoscape graph
        this.graph = cytoscape({
            container: document.getElementById('graph-container'),
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#fff',
                        'border-color': '#000',
                        'border-width': 2,
                        'label': 'data(id)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': '45px',
                        'height': '45px',
                        'font-size': '18px',
                        'font-weight': 'bold'
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

        // Generate initial probabilities
        this.generateProbabilities();
        
        // Create Venn diagram
        this.createVennDiagram();
        
        // Create graph
        this.createGraph();
        
        // Update displays
        this.updatePercentages();
        this.displayRegionProbabilities();
    }

    generateProbabilities() {
        // Generate random probabilities that sum to 1
        // with constraints on relative sizes
        let probs = {
            'g': 0.45 + Math.random() * 0.15,  // Outer region (0.45-0.60)
            'h': 0.01 + Math.random() * 0.04,  // Center region (0.01-0.05)
            'a': 0.03 + Math.random() * 0.12,
            'b': 0.03 + Math.random() * 0.12,
            'c': 0.03 + Math.random() * 0.12,
            'd': 0.03 + Math.random() * 0.12,
            'e': 0.03 + Math.random() * 0.12,
            'f': 0.03 + Math.random() * 0.12
        };

        // Normalize to sum to 1
        const total = Object.values(probs).reduce((a, b) => a + b, 0);
        Object.keys(probs).forEach(key => {
            probs[key] = Math.round((probs[key] / total) * 100) / 100;
        });

        // Store probabilities
        Object.entries(probs).forEach(([key, prob]) => {
            this.regions[key] = {
                probability: prob,
                color: null
            };
        });
    }

    createVennDiagram() {
        const width = 700;
        const height = 500;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = 150;

        // Define circle positions
        const circles = [
            { cx: centerX - radius/2, cy: centerY - radius/3, r: radius },
            { cx: centerX + radius/2, cy: centerY - radius/3, r: radius },
            { cx: centerX, cy: centerY + radius/3, r: radius }
        ];

        // Draw circles
        circles.forEach((circle, i) => {
            this.vennSvg.append('circle')
                .attr('class', 'venn-circle')
                .attr('cx', circle.cx)
                .attr('cy', circle.cy)
                .attr('r', circle.r);
        });

        // Define region centers
        const regionCenters = {
            'g': { x: centerX - radius*1.2, y: centerY - radius*1.2 },  // Outer region
            'a': { x: centerX - radius, y: centerY - radius/2 },
            'b': { x: centerX, y: centerY + radius*0.8 },
            'c': { x: centerX + radius, y: centerY - radius/2 },
            'd': { x: centerX, y: centerY - radius/2 },
            'e': { x: centerX + radius/3, y: centerY + radius/3 },
            'f': { x: centerX - radius/3, y: centerY + radius/3 },
            'h': { x: centerX, y: centerY }  // Center intersection
        };

        // Add region labels with probabilities
        Object.entries(regionCenters).forEach(([label, pos]) => {
            this.vennSvg.append('text')
                .attr('class', 'region-label')
                .attr('x', pos.x)
                .attr('y', pos.y)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .text(label);

            // Store center positions for later use
            this.regions[label].center = pos;
        });

        // Create clip paths for region coloring
        this.createClipPaths(circles);
    }
        createClipPaths(circles) {
        const defs = this.vennSvg.append('defs');

        // Create paths for each region
        const regions = {
            'g': this.createOuterRegionPath(circles),
            'a': this.createSingleSetPath(circles[0]),
            'b': this.createSingleSetPath(circles[2]),
            'c': this.createSingleSetPath(circles[1]),
            'd': this.createIntersectionPath([circles[0], circles[1]]),
            'e': this.createIntersectionPath([circles[1], circles[2]]),
            'f': this.createIntersectionPath([circles[0], circles[2]]),
            'h': this.createTripleIntersectionPath(circles)
        };

        // Add clip paths
        Object.entries(regions).forEach(([id, pathData]) => {
            defs.append('clipPath')
                .attr('id', `clip-${id}`)
                .append('path')
                .attr('d', pathData);
        });
    }

    createGraph() {
        // Add nodes
        Object.keys(this.regions).forEach(id => {
            this.graph.add({
                group: 'nodes',
                data: { id: id }
            });
        });

        // Define adjacency relationships
        const adjacencyList = {
            'g': ['a', 'b', 'c', 'd', 'e', 'f'],  // outer region connects to all except h
            'a': ['d', 'f', 'g', 'h'],
            'b': ['e', 'f', 'g', 'h'],
            'c': ['d', 'e', 'g', 'h'],
            'd': ['a', 'c', 'g', 'h', 'e'],
            'e': ['b', 'c', 'g', 'h', 'd'],
            'f': ['a', 'b', 'g', 'h'],
            'h': ['a', 'b', 'c', 'd', 'e', 'f']
        };

        // Add edges
        Object.entries(adjacencyList).forEach(([source, targets]) => {
            targets.forEach(target => {
                if (source < target) {  // Avoid duplicate edges
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
        this.vennSvg.selectAll(`.region-${regionId}-fill`).remove();
        this.vennSvg.append('path')
            .attr('class', `region-${regionId}-fill`)
            .attr('clip-path', `url(#clip-${regionId})`)
            .attr('d', this.getRegionPath(regionId))
            .attr('fill', this.colors[this.selectedColor])
            .attr('opacity', 0.6);

        this.updatePercentages();
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
            .map(([id, region]) => 
                `<div class="region-item">
                    <span>Region ${id}:</span>
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
            this.vennSvg.selectAll(`.region-${regionId}-fill`).remove();
        });

        colorOrder.forEach(color => {
            const regionsToColor = this.findOptimalColoringSet(remainingRegions);
            regionsToColor.forEach(regionId => {
                this.selectedColor = color;
                this.colorRegion(regionId);
                delete remainingRegions[regionId];
            });
        });

        this.updatePercentages();
    }

    findOptimalColoringSet(regions) {
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

    // Helper methods for path generation
    createOuterRegionPath(circles) {
        // Create path for region g (outer region)
        return `M 0,0 H 800 V 600 H 0 Z`;
    }

    createSingleSetPath(circle) {
        return `M ${circle.cx},${circle.cy} m -${circle.r},0 a ${circle.r},${circle.r} 0 1,0 ${circle.r*2},0 a ${circle.r},${circle.r} 0 1,0 -${circle.r*2},0`;
    }

    createIntersectionPath(circles) {
        // Simplified intersection path
        const [c1, c2] = circles;
        return `M ${c1.cx},${c1.cy} A ${c1.r},${c1.r} 0 0,1 ${c2.cx},${c2.cy} A ${c2.r},${c2.r} 0 0,1 ${c1.cx},${c1.cy}`;
    }

    createTripleIntersectionPath(circles) {
        // Simplified triple intersection path
        const [c1, c2, c3] = circles;
        return `M ${c1.cx},${c1.cy} A ${c1.r},${c1.r} 0 0,1 ${c2.cx},${c2.cy} 
                A ${c2.r},${c2.r} 0 0,1 ${c3.cx},${c3.cy} 
                A ${c3.r},${c3.r} 0 0,1 ${c1.cx},${c1.cy}`;
    }

    getRegionPath(regionId) {
        // Return full path for region coloring
        return `M 0,0 H 800 V 600 H 0 Z`;
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
            alert('Color the regions to maximize the area covered by each color in order:\n\n' +
                  '1. RED (maximize first)\n' +
                  '2. BLUE (maximize in remaining regions)\n' +
                  '3. GREEN (maximize in remaining regions)\n' +
                  '4. YELLOW (maximize in remaining regions)\n\n' +
                  'Adjacent regions cannot share the same color.');
        });
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new VennGame();
});
