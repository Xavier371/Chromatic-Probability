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
        this.currentView = 'venn';
        this.initializeGame();
    }

    initializeGame() {
        // Initialize Cytoscape for graph
        this.graph = cytoscape({
            container: document.getElementById('graph-view'),
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
        this.regions = {};
        this.graph.elements().remove();
        d3.select('#venn-view').selectAll('*').remove();

        // Generate regions with random areas
        this.generateRegions();
        
        // Create graph representation
        this.createGraph();
        
        // Reset area totals
        this.updateAreaTotals();
    }

    generateRegions() {
        // Generate 3-4 sets with overlapping regions
        const numSets = Math.random() < 0.5 ? 3 : 4;
        const labels = ['A', 'B', 'C', 'D'].slice(0, numSets);
        
        // Generate all possible region combinations
        for (let i = 1; i <= numSets; i++) {
            this.getCombinations(labels, i).forEach(combo => {
                const regionId = combo.join('');
                this.regions[regionId] = {
                    area: Math.random() * 0.5 + 0.1, // Random area between 0.1 and 0.6
                    color: null,
                    sets: combo
                };
            });
        }

        // Normalize areas to sum to 1
        const totalArea = Object.values(this.regions).reduce((sum, r) => sum + r.area, 0);
        Object.values(this.regions).forEach(r => r.area /= totalArea);
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

    createGraph() {
        // Add nodes for each region
        Object.keys(this.regions).forEach(regionId => {
            this.graph.add({
                group: 'nodes',
                data: { id: regionId }
            });
        });

        // Add edges between adjacent regions
        Object.keys(this.regions).forEach(region1 => {
            Object.keys(this.regions).forEach(region2 => {
                if (region1 < region2 && this.areRegionsAdjacent(region1, region2)) {
                    this.graph.add({
                        group: 'edges',
                        data: { 
                            id: `${region1}-${region2}`,
                            source: region1,
                            target: region2
                        }
                    });
                }
            });
        });

        // Apply layout
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

        // Color the region
        this.regions[regionId].color = this.selectedColor;
        
        // Update graph node color
        this.graph.$(`#${regionId}`).style('background-color', this.colors[this.selectedColor]);
        
        // Update area totals
        this.updateAreaTotals();
    }

    updateAreaTotals() {
        const totals = { red: 0, blue: 0, green: 0, yellow: 0 };
        
        // Calculate totals for each color
        Object.values(this.regions).forEach(region => {
            if (region.color) {
                totals[region.color] += region.area;
            }
        });

        // Update display
        Object.entries(totals).forEach(([color, area]) => {
            const bar = document.getElementById(`${color}-total`);
            bar.style.width = `${area * 100}%`;
            bar.querySelector('.area-value').textContent = `${(area * 100).toFixed(1)}%`;
        });
    }

    checkSolution() {
        const totals = { red: 0, blue: 0, green: 0, yellow: 0 };
        
        // Calculate current totals
        Object.values(this.regions).forEach(region => {
            if (region.color) {
                totals[region.color] += region.area;
            }
        });

        // Check if solution maximizes areas in priority order
        const colorPriority = ['red', 'blue', 'green', 'yellow'];
        let remainingRegions = {...this.regions};
        let isOptimal = true;

        colorPriority.forEach(color => {
            const maxPossibleArea = this.calculateMaxPossibleArea(remainingRegions, color);
            if (Math.abs(totals[color] - maxPossibleArea) > 0.001) {
                isOptimal = false;
            }
            // Remove colored regions for next iteration
            Object.keys(remainingRegions).forEach(regionId => {
                if (this.regions[regionId].color === color) {
                    delete remainingRegions[regionId];
                }
            });
        });

        alert(isOptimal ? 'Correct! This is an optimal solution!' : 'Not optimal. Try to maximize red first, then blue, then green, then yellow.');
    }

    calculateMaxPossibleArea(regions, color) {
        // Create a graph coloring problem
        const graph = new Map();
        Object.keys(regions).forEach(region1 => {
            graph.set(region1, new Set());
            Object.keys(regions).forEach(region2 => {
                if (region1 !== region2 && this.areRegionsAdjacent(region1, region2)) {
                    graph.get(region1).add(region2);
                }
            });
        });

        // Find maximum independent set (greedy approach)
        const sortedRegions = Object.keys(regions)
            .sort((a, b) => regions[b].area - regions[a].area);
        
        let totalArea = 0;
        const colored = new Set();

        sortedRegions.forEach(region => {
            const neighbors = graph.get(region);
            if (![...neighbors].some(n => colored.has(n))) {
                colored.add(region);
                totalArea += regions[region].area;
            }
        });

        return totalArea;
    }

    showSolution() {
        // Reset all colors
        Object.keys(this.regions).forEach(regionId => {
            this.regions[regionId].color = null;
            this.graph.$(`#${regionId}`).style('background-color', '#bdc3c7');
        });

        // Apply optimal coloring
        const colorPriority = ['red', 'blue', 'green', 'yellow'];
        let remainingRegions = {...this.regions};

        colorPriority.forEach(color => {
            const solution = this.findOptimalColoring(remainingRegions, color);
            solution.forEach(regionId => {
                this.regions[regionId].color = color;
                this.graph.$(`#${regionId}`).style('background-color', this.colors[color]);
                delete remainingRegions[regionId];
            });
        });

        this.updateAreaTotals();
    }

    findOptimalColoring(regions, color) {
        // Similar to calculateMaxPossibleArea but returns regions to color
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
                document.getElementById('venn-view').style.display = 'none';
                document.getElementById('graph-view').style.display = 'block';
                this.currentView = 'graph';
            } else {
                document.getElementById('venn-view').style.display = 'block';
                document.getElementById('graph-view').style.display = 'none';
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
            this.showSolution());
        document.getElementById('reset').addEventListener('click', () => 
            this.generateNewPuzzle());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new VennGame();
});
