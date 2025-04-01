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
        this.currentView = 'venn';
        this.initializeGame();
    }

    initializeGame() {
        // Initialize D3 for Venn diagram
        this.vennSvg = d3.select('#venn-view')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%');

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
                        'text-halign': 'center'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#95a5a6'
                    }
                }
            ]
        });

        this.setupEventListeners();
        this.generateNewPuzzle();
    }

    generateNewPuzzle() {
        // Clear previous puzzle
        this.regions = {};
        this.graph.elements().remove();
        this.vennSvg.selectAll('*').remove();

        // Generate random sets (3-4 sets)
        const numSets = Math.random() < 0.5 ? 3 : 4;
        const sets = this.generateRandomSets(numSets);
        
        // Calculate regions and their areas
        this.calculateRegions(sets);
        
        // Create Venn diagram
        this.drawVennDiagram(sets);
        
        // Create corresponding graph
        this.createGraph();
        
        // Update area totals
        this.updateAreaTotals();
    }

    generateRandomSets(numSets) {
        const sets = [];
        const centerX = 400;
        const centerY = 300;
        const radius = 150;

        for (let i = 0; i < numSets; i++) {
            const angle = (2 * Math.PI * i) / numSets;
            const offset = radius * 0.5; // Adjust for overlap
            sets.push({
                x: centerX + Math.cos(angle) * offset,
                y: centerY + Math.sin(angle) * offset,
                radius: radius,
                label: String.fromCharCode(65 + i) // A, B, C, D
            });
        }
        return sets;
    }

    calculateRegions(sets) {
        // Calculate intersections and areas
        let totalArea = 0;
        let regions = {};
        
        // Generate all possible combinations of sets
        for (let i = 1; i <= sets.length; i++) {
            this.getCombinations(sets, i).forEach(combo => {
                const region = this.calculateIntersection(combo);
                if (region.area > 0) {
                    const label = combo.map(set => set.label).join('');
                    regions[label] = {
                        area: region.area,
                        color: null,
                        sets: combo
                    };
                    totalArea += region.area;
                }
            });
        }

        // Normalize areas to sum to 1
        Object.keys(regions).forEach(key => {
            regions[key].area /= totalArea;
        });

        this.regions = regions;
    }

    calculateIntersection(sets) {
        // Simplified intersection area calculation
        // In a real implementation, this would use proper circle intersection formulas
        const baseArea = Math.PI * sets[0].radius * sets[0].radius;
        return {
            area: baseArea / (Math.pow(2, sets.length))
        };
    }

    drawVennDiagram(sets) {
        sets.forEach((set, i) => {
            this.vennSvg.append('circle')
                .attr('cx', set.x)
                .attr('cy', set.y)
                .attr('r', set.radius)
                .attr('fill', 'none')
                .attr('stroke', 'black')
                .attr('stroke-width', 2);

            // Add region labels
            Object.keys(this.regions).forEach(key => {
                if (key.includes(set.label)) {
                    const region = this.regions[key];
                    this.vennSvg.append('text')
                        .attr('x', region.sets[0].x)
                        .attr('y', region.sets[0].y)
                        .text(key)
                        .attr('text-anchor', 'middle');
                }
            });
        });
    }

    createGraph() {
        // Create nodes for each region
        Object.keys(this.regions).forEach(key => {
            this.graph.add({
                group: 'nodes',
                data: { id: key }
            });
        });

        // Create edges between adjacent regions
        Object.keys(this.regions).forEach(key1 => {
            Object.keys(this.regions).forEach(key2 => {
                if (key1 < key2 && this.areRegionsAdjacent(key1, key2)) {
                    this.graph.add({
                        group: 'edges',
                        data: { source: key1, target: key2 }
                    });
                }
            });
        });

        this.graph.layout({
            name: 'cose',
            padding: 50
        }).run();
    }

    areRegionsAdjacent(region1, region2) {
        // Check if regions share sets
        const sets1 = region1.split('');
        const sets2 = region2.split('');
        return sets1.some(set => sets2.includes(set));
    }

    colorRegion(regionId, color) {
        this.regions[regionId].color = color;
        
        // Update Venn diagram
        this.vennSvg.selectAll(`[data-region="${regionId}"]`)
            .attr('fill', this.colors[color]);
        
        // Update graph
        this.graph.$(`#${regionId}`).style('background-color', this.colors[color]);
        
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
            document.getElementById(`${color}-total`).style.width = `${area * 100}%`;
        });
    }

    checkSolution() {
        // Implement solution checking logic
        // Returns true if coloring maximizes areas in priority order
        return this.calculateOptimalSolution();
    }

    calculateOptimalSolution() {
        // Implement optimal solution calculation
        // This would use a greedy algorithm to assign colors
        // based on area sizes and color priority
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

        // View toggle
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

        // Other buttons
        document.getElementById('show-probs').addEventListener('click', () => 
            this.toggleProbabilities());
        document.getElementById('check-solution').addEventListener('click', () => 
            this.checkSolution());
        document.getElementById('solve').addEventListener('click', () => 
            this.showSolution());
        document.getElementById('reset').addEventListener('click', () => 
            this.generateNewPuzzle());

        // Node clicking
        this.graph.on('tap', 'node', (evt) => {
            if (this.selectedColor) {
                const nodeId = evt.target.id();
                this.colorRegion(nodeId, this.selectedColor);
            }
        });
    }

    toggleProbabilities() {
        const probList = document.getElementById('prob-list');
        probList.style.display = probList.style.display === 'none' ? 'block' : 'none';
        
        if (probList.style.display === 'block') {
            probList.innerHTML = '';
            Object.entries(this.regions).forEach(([key, region]) => {
                const item = document.createElement('div');
                item.className = 'prob-item';
                item.innerHTML = `
                    <span>Region ${key}:</span>
                    <span>${(region.area * 100).toFixed(1)}%</span>
                `;
                probList.appendChild(item);
            });
        }
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new VennGame();
});
