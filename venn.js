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
        this.width = 600;
        this.height = 600;
        this.radius = 120;
        this.initializeGame();
    }

    initializeGame() {
        // Initialize SVG with proper viewBox
        this.vennSvg = d3.select('#venn-container')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .append('g')
            .attr('transform', 'translate(0,0)');

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

        // Generate probabilities
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
        // Initialize with target probabilities
        let probs = {
            'g': 0.49, // Outer region (complement)
            'h': 0.03, // Triple intersection
            'a': 0.14, // Single set regions
            'b': 0.07,
            'c': 0.10,
            'd': 0.05, // Double intersections
            'e': 0.05,
            'f': 0.07
        };

        // Store probabilities
        Object.entries(probs).forEach(([key, prob]) => {
            this.regions[key] = {
                probability: prob,
                color: null
            };
        });
    }

    createVennDiagram() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Create unit square boundary
        this.vennSvg.append('rect')
            .attr('x', 100)
            .attr('y', 100)
            .attr('width', this.width - 200)
            .attr('height', this.height - 200)
            .attr('fill', 'none')
            .attr('stroke', 'black')
            .attr('stroke-width', 1);

        // Define circle positions for proper intersections
        const circles = [
            { 
                cx: centerX - this.radius * 0.8,
                cy: centerY - this.radius * 0.1,
                r: this.radius
            },
            { 
                cx: centerX + this.radius * 0.8,
                cy: centerY - this.radius * 0.1,
                r: this.radius
            },
            { 
                cx: centerX,
                cy: centerY + this.radius * 0.8,
                r: this.radius
            }
        ];

        // Draw circles
        circles.forEach(circle => {
            this.vennSvg.append('circle')
                .attr('class', 'venn-circle')
                .attr('cx', circle.cx)
                .attr('cy', circle.cy)
                .attr('r', circle.r)
                .attr('fill', 'none')
                .attr('stroke', 'black')
                .attr('stroke-width', 1);
        });

        // Calculate and store region centers
        this.calculateRegionCenters(circles);
        
        // Create clip paths for regions
        this.createClipPaths(circles);
    }
        calculateRegionCenters(circles) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const r = this.radius;

        // Calculate precise centers for each region
        const regionCenters = {
            // Outside all circles (g) - positioned in top left corner of unit square
            'g': { 
                x: 150, 
                y: 150
            },
            // Left circle only (a)
            'a': { 
                x: circles[0].cx - r * 0.4,
                y: circles[0].cy - r * 0.3
            },
            // Bottom circle only (b)
            'b': { 
                x: circles[2].cx,
                y: circles[2].cy + r * 0.4
            },
            // Right circle only (c)
            'c': { 
                x: circles[1].cx + r * 0.4,
                y: circles[1].cy - r * 0.3
            },
            // Left-Right intersection (d)
            'd': { 
                x: centerX,
                y: circles[0].cy - r * 0.2
            },
            // Right-Bottom intersection (e)
            'e': { 
                x: (circles[1].cx + circles[2].cx) / 2 + r * 0.1,
                y: (circles[1].cy + circles[2].cy) / 2
            },
            // Left-Bottom intersection (f)
            'f': { 
                x: (circles[0].cx + circles[2].cx) / 2 - r * 0.1,
                y: (circles[0].cy + circles[2].cy) / 2
            },
            // Triple intersection (h)
            'h': { 
                x: centerX,
                y: centerY
            }
        };

        // Add region labels and store centers
        Object.entries(regionCenters).forEach(([label, pos]) => {
            this.regions[label].center = pos;
            
            this.vennSvg.append('text')
                .attr('class', 'region-label')
                .attr('x', pos.x)
                .attr('y', pos.y)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', '16px')
                .attr('font-weight', 'bold')
                .text(label);
        });
    }

    createClipPaths(circles) {
        const defs = this.vennSvg.append('defs');

        // Helper function to create circle path
        const createCirclePath = (circle) => {
            return `M ${circle.cx - circle.r},${circle.cy} 
                    a ${circle.r},${circle.r} 0 1,0 ${circle.r * 2},0 
                    a ${circle.r},${circle.r} 0 1,0 ${-circle.r * 2},0`;
        };

        // Create clip paths for each region
        Object.keys(this.regions).forEach(region => {
            const clipPath = defs.append('clipPath')
                .attr('id', `clip-${region}`);

            let path;
            switch(region) {
                case 'g':
                    // Outer region (complement of all circles)
                    path = this.createOuterRegionPath(circles);
                    break;
                case 'a':
                    // Left circle only
                    path = this.createSingleRegionPath(circles[0], [circles[1], circles[2]]);
                    break;
                case 'b':
                    // Bottom circle only
                    path = this.createSingleRegionPath(circles[2], [circles[0], circles[1]]);
                    break;
                case 'c':
                    // Right circle only
                    path = this.createSingleRegionPath(circles[1], [circles[0], circles[2]]);
                    break;
                case 'd':
                    // Left-Right intersection
                    path = this.createDoubleIntersectionPath(circles[0], circles[1], circles[2]);
                    break;
                case 'e':
                    // Right-Bottom intersection
                    path = this.createDoubleIntersectionPath(circles[1], circles[2], circles[0]);
                    break;
                case 'f':
                    // Left-Bottom intersection
                    path = this.createDoubleIntersectionPath(circles[0], circles[2], circles[1]);
                    break;
                case 'h':
                    // Triple intersection
                    path = this.createTripleIntersectionPath(circles);
                    break;
            }

            clipPath.append('path')
                .attr('d', path);
        });
    }

    createOuterRegionPath(circles) {
        // Create path for region outside all circles
        const unitSquare = `M 100,100 H ${this.width - 100} V ${this.height - 100} H 100 Z`;
        const circlePaths = circles.map(circle => 
            `M ${circle.cx},${circle.cy} m -${circle.r},0 
             a ${circle.r},${circle.r} 0 1,0 ${circle.r * 2},0 
             a ${circle.r},${circle.r} 0 1,0 ${-circle.r * 2},0`
        ).join(' ');
        
        return `${unitSquare} ${circlePaths}`;
    }

    createSingleRegionPath(circle, excludeCircles) {
        // Create path for single circle region excluding intersections
        let path = `M ${circle.cx},${circle.cy} 
                    m -${circle.r},0 
                    a ${circle.r},${circle.r} 0 1,0 ${circle.r * 2},0 
                    a ${circle.r},${circle.r} 0 1,0 ${-circle.r * 2},0`;
        
        excludeCircles.forEach(c => {
            path += ` M ${c.cx},${c.cy} 
                     m -${c.r},0 
                     a ${c.r},${c.r} 0 1,0 ${c.r * 2},0 
                     a ${c.r},${c.r} 0 1,0 ${-c.r * 2},0`;
        });
        
        return path;
    }
        createDoubleIntersectionPath(circle1, circle2, excludeCircle) {
        // Calculate intersection of two circles excluding third circle
        const r = this.radius;
        const path = `
            M ${circle1.cx},${circle1.cy} 
            A ${r},${r} 0 0,1 ${circle2.cx},${circle2.cy}
            A ${r},${r} 0 0,1 ${circle1.cx},${circle1.cy}
            Z
            M ${excludeCircle.cx},${excludeCircle.cy}
            m -${r},0
            a ${r},${r} 0 1,0 ${r * 2},0
            a ${r},${r} 0 1,0 ${-r * 2},0
        `;
        return path;
    }

    createTripleIntersectionPath(circles) {
        // Create path for center region (triple intersection)
        const r = this.radius;
        return `
            M ${circles[0].cx},${circles[0].cy}
            A ${r},${r} 0 0,1 ${circles[1].cx},${circles[1].cy}
            A ${r},${r} 0 0,1 ${circles[2].cx},${circles[2].cy}
            A ${r},${r} 0 0,1 ${circles[0].cx},${circles[0].cy}
            Z
        `;
    }

    colorRegion(regionId) {
        if (!this.selectedColor) return;

        // Update region data
        this.regions[regionId].color = this.selectedColor;
        
        // Update graph node
        this.graph.$(`#${regionId}`).style('background-color', this.colors[this.selectedColor]);
        
        // Remove existing coloring
        this.vennSvg.selectAll(`.region-${regionId}-fill`).remove();
        
        // Add new colored region
        this.vennSvg.insert('path', '.region-label')
            .attr('class', `region-${regionId}-fill`)
            .attr('clip-path', `url(#clip-${regionId})`)
            .attr('d', `M 0,0 H ${this.width} V ${this.height} H 0 Z`)
            .attr('fill', this.colors[this.selectedColor])
            .attr('opacity', 0.6);

        this.updatePercentages();
    }

    createGraph() {
        // Add nodes
        Object.keys(this.regions).forEach(id => {
            this.graph.add({
                group: 'nodes',
                data: { id: id }
            });
        });

        // Define adjacency based on Venn diagram structure
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
                if (source < target) {
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
