console.log('Game script loaded');

class VennGame {
    constructor() {
        console.log('VennGame constructor called');
        
        // Add debug mode
        this.debug = false;
        
        // Canvas setup with error checking
        this.vennCanvas = document.getElementById('vennCanvas');
        this.currentGraphCanvas = document.getElementById('currentGraphCanvas');
        this.targetGraphCanvas = document.getElementById('targetGraphCanvas');
        
        if (!this.vennCanvas || !this.currentGraphCanvas || !this.targetGraphCanvas) {
            console.error('Could not find one or more canvas elements');
            return;
        }
        
        // Get canvas contexts
        this.vennCtx = this.vennCanvas.getContext('2d');
        this.currentGraphCtx = this.currentGraphCanvas.getContext('2d');
        this.targetGraphCtx = this.targetGraphCanvas.getContext('2d');
    
        // Set initial canvas sizes
        this.vennCanvas.width = this.vennCanvas.offsetWidth;
        this.vennCanvas.height = this.vennCanvas.offsetHeight;
        this.currentGraphCanvas.width = this.currentGraphCanvas.offsetWidth;
        this.currentGraphCanvas.height = this.currentGraphCanvas.offsetHeight;
        this.targetGraphCanvas.width = this.targetGraphCanvas.offsetWidth;
        this.targetGraphCanvas.height = this.targetGraphCanvas.offsetHeight;
    
        // Generate target configuration first
        this.targetCircles = this.generateRandomConfiguration();
    
        // Generate a different initial configuration
        do {
            this.circles = this.generateRandomConfiguration();
        } while (this.areConfigurationsSimilar(this.circles, this.targetCircles));
    
        // Initialize interaction states
        this.selectedCircle = null;
        this.isDragging = false;
        this.isScaling = false;
        this.lastMousePos = { x: 0, y: 0 };
    
        // Add event listeners
        window.addEventListener('resize', () => {
            this.resizeCanvases();
            this.draw();
        });
    
        // Initialize controls
        this.initializeControls();
        
        // Hide win message if visible
        const winMessage = document.getElementById('winMessage');
        if (winMessage) {
            winMessage.classList.add('hidden');
        }
        
        // Initial draw
        this.draw();
    
        if (this.debug) {
            console.log('Initial circles:', this.circles);
            console.log('Target circles:', this.targetCircles);
        }
    }
    
    // Helper method to check if configurations are too similar
    areConfigurationsSimilar(config1, config2) {
        if (!config1 || !config2) return false;
        
        const threshold = Math.min(this.vennCanvas.width, this.vennCanvas.height) / 8;
        const radiusThreshold = threshold / 2;
        
        for (let i = 0; i < 3; i++) {
            const dx = config1[i].x - config2[i].x;
            const dy = config1[i].y - config2[i].y;
            const dr = Math.abs(config1[i].radius - config2[i].radius);
            
            // Check if positions and radii are too similar
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < threshold && dr < radiusThreshold) {
                if (this.debug) {
                    console.log(`Configurations too similar at circle ${i}:`, {
                        distance,
                        radiusDiff: dr,
                        threshold,
                        radiusThreshold
                    });
                }
                return true;
            }
        }
        
        // Check if the overall patterns are too similar
        const regions1 = this.getRegions(config1);
        const regions2 = this.getRegions(config2);
        if (regions1.length === regions2.length) {
            const labels1 = new Set(regions1.map(r => r.label));
            const labels2 = new Set(regions2.map(r => r.label));
            if ([...labels1].every(label => labels2.has(label))) {
                if (this.debug) {
                    console.log('Configurations have identical region patterns');
                }
                return true;
            }
        }
        
        return false;
    }
   
    resizeCanvases() {
        const setCanvasSize = (canvas) => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            canvas.style.width = canvas.offsetWidth + 'px';
            canvas.style.height = canvas.offsetHeight + 'px';
        };
    
        setCanvasSize(this.vennCanvas);
        setCanvasSize(this.currentGraphCanvas);
        setCanvasSize(this.targetGraphCanvas);
    
        this.draw();
    }
    
    resetGame() {
    // Generate random target configuration first
    this.targetCircles = this.generateRandomConfiguration();
    
    // Reset current circles to default positions with symmetric overlap
    const centerX = this.vennCanvas.width / 2;
    const centerY = this.vennCanvas.height / 2;
    const baseRadius = Math.min(this.vennCanvas.width, this.vennCanvas.height) / 4;
    const offset = baseRadius * 0.7; // Smaller offset ensures overlap

    // Position circles in an equilateral triangle formation
    const angleStep = (2 * Math.PI) / 3;
    this.circles = [
        { 
            x: centerX + offset * Math.cos(0), 
            y: centerY + offset * Math.sin(0), 
            radius: baseRadius, 
            label: 'A' 
        },
        { 
            x: centerX + offset * Math.cos(angleStep), 
            y: centerY + offset * Math.sin(angleStep), 
            radius: baseRadius, 
            label: 'B' 
        },
        { 
            x: centerX + offset * Math.cos(2 * angleStep), 
            y: centerY + offset * Math.sin(2 * angleStep), 
            radius: baseRadius, 
            label: 'C' 
        }
    ];

    document.getElementById('winMessage').classList.add('hidden');
    this.draw();
}
    initializeControls() {
    // Mouse events for Venn diagram
    this.vennCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.vennCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.vennCanvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.vennCanvas.addEventListener('mouseleave', () => this.handleMouseUp());

    // Touch events for mobile
    this.vennCanvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.vennCanvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.vennCanvas.addEventListener('touchend', () => this.handleTouchEnd());

    // Reset button
    document.getElementById('resetButton').addEventListener('click', () => this.resetGame());
}
    
    generateRandomConfiguration() {
        const centerX = this.targetGraphCanvas.width / 2;
        const centerY = this.targetGraphCanvas.height / 2;
        const minRadius = Math.min(this.targetGraphCanvas.width, this.targetGraphCanvas.height) / 6;
        const maxRadius = Math.min(this.targetGraphCanvas.width, this.targetGraphCanvas.height) / 4;
        
        // Generate three random positions within the canvas bounds
        const positions = Array(3).fill().map(() => ({
            x: centerX + (Math.random() - 0.5) * this.targetGraphCanvas.width * 0.5,
            y: centerY + (Math.random() - 0.5) * this.targetGraphCanvas.height * 0.5,
            radius: minRadius + Math.random() * (maxRadius - minRadius)
        }));
    
        return positions.map((pos, i) => ({
            x: pos.x,
            y: pos.y,
            radius: pos.radius,
            label: ['A', 'B', 'C'][i]
        }));
    }
    getMousePos(e) {
        const rect = this.vennCanvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.vennCanvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.vennCanvas.height / rect.height)
        };
    }

    handleMouseDown(e) {
    const mousePos = this.getMousePos(e);
    this.lastMousePos = mousePos;
    
    // Check if clicking near the edge of any circle first (for scaling)
    this.selectedCircle = this.circles.find(circle => {
        const distToCenter = Math.hypot(mousePos.x - circle.x, mousePos.y - circle.y);
        return Math.abs(distToCenter - circle.radius) < 20;
    });

    if (this.selectedCircle) {
        this.isScaling = true;
        return;
    }

    // If not scaling, check for dragging
    this.selectedCircle = this.circles.find(circle => 
        Math.hypot(mousePos.x - circle.x, mousePos.y - circle.y) < circle.radius
    );

    if (this.selectedCircle) {
        this.isDragging = true;
    }
}

    handleMouseMove(e) {
        if (!this.selectedCircle) return;
        
        const mousePos = this.getMousePos(e);
        const dx = mousePos.x - this.lastMousePos.x;
        const dy = mousePos.y - this.lastMousePos.y;

        if (this.isDragging && !this.isScaling) {
            // Move the circle
            this.selectedCircle.x = Math.max(this.selectedCircle.radius, 
                Math.min(this.vennCanvas.width - this.selectedCircle.radius, this.selectedCircle.x + dx));
            this.selectedCircle.y = Math.max(this.selectedCircle.radius, 
                Math.min(this.vennCanvas.height - this.selectedCircle.radius, this.selectedCircle.y + dy));
        } else if (this.isScaling) {
            // Scale the circle
            const distToCenter = Math.hypot(mousePos.x - this.selectedCircle.x, mousePos.y - this.selectedCircle.y);
            this.selectedCircle.radius = Math.max(40, Math.min(150, distToCenter));
        }

        this.lastMousePos = mousePos;
        this.draw();
        this.checkWinCondition();
    }

    handleMouseUp() {
        this.isDragging = false;
        this.isScaling = false;
        this.selectedCircle = null;
    }

    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.handleMouseDown(touch);
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.handleMouseMove(touch);
        }
    }

    handleTouchEnd() {
        this.handleMouseUp();
    }
    drawCircle(ctx, circle) {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // Make circles translucent
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    getRegions(circles) {
    const regions = [];
    const [c1, c2, c3] = circles;
    
    // Helper function to find intersection points
    const findIntersectionPoints = (circle1, circle2) => {
        const dx = circle2.x - circle1.x;
        const dy = circle2.y - circle1.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        
        if (d > circle1.radius + circle2.radius || d < Math.abs(circle1.radius - circle2.radius)) {
            return [];
        }
        
        const a = (circle1.radius * circle1.radius - circle2.radius * circle2.radius + d * d) / (2 * d);
        const h = Math.sqrt(circle1.radius * circle1.radius - a * a);
        
        const x2 = circle1.x + (dx * a) / d;
        const y2 = circle1.y + (dy * a) / d;
        
        const x3 = x2 + (h * dy) / d;
        const y3 = y2 - (h * dx) / d;
        
        const x4 = x2 - (h * dy) / d;
        const y4 = y2 + (h * dx) / d;
        
        return [{x: x3, y: y3}, {x: x4, y: y4}];
    };

    // Add single regions with better centers
    circles.forEach(circle => {
        regions.push({
            label: circle.label,
            center: { 
                x: circle.x, 
                y: circle.y 
            }
        });
    });

    // Add intersection regions with better centers
    const intersectAB = findIntersectionPoints(c1, c2);
    const intersectBC = findIntersectionPoints(c2, c3);
    const intersectAC = findIntersectionPoints(c1, c3);

    if (intersectAB.length > 0) {
        regions.push({
            label: 'AB',
            center: {
                x: (intersectAB[0].x + intersectAB[1].x) / 2,
                y: (intersectAB[0].y + intersectAB[1].y) / 2
            }
        });
    }

    if (intersectBC.length > 0) {
        regions.push({
            label: 'BC',
            center: {
                x: (intersectBC[0].x + intersectBC[1].x) / 2,
                y: (intersectBC[0].y + intersectBC[1].y) / 2
            }
        });
    }

    if (intersectAC.length > 0) {
        regions.push({
            label: 'AC',
            center: {
                x: (intersectAC[0].x + intersectAC[1].x) / 2,
                y: (intersectAC[0].y + intersectAC[1].y) / 2
            }
        });
    }

    // Triple intersection
    if (intersectAB.length > 0 && intersectBC.length > 0 && intersectAC.length > 0) {
        const centerX = (c1.x + c2.x + c3.x) / 3;
        const centerY = (c1.y + c2.y + c3.y) / 3;
        regions.push({
            label: 'ABC',
            center: { x: centerX, y: centerY }
        });
    }

    return regions;
}

  drawGraph(ctx, circles) {
    if (!circles) return; // Guard clause for null circles

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const regions = this.getRegions(circles);
    const nodeRadius = 20; // Slightly smaller for better spacing
    
    // Calculate canvas center and layout radius
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const layoutRadius = Math.min(ctx.canvas.width, ctx.canvas.height) / 3;
    
    const nodePositions = new Map();
    
    // Calculate positions for all nodes
    // 1. Position single-letter nodes (A, B, C) in a triangle
    const singleNodes = regions.filter(r => r.label.length === 1);
    singleNodes.forEach((region, i) => {
        const angle = (i * 2 * Math.PI / 3) - Math.PI / 2; // Start from top
        nodePositions.set(region.label, {
            x: centerX + layoutRadius * Math.cos(angle),
            y: centerY + layoutRadius * Math.sin(angle)
        });
    });
    
    // 2. Position double-letter nodes (AB, BC, AC) between their parents
    const doubleNodes = regions.filter(r => r.label.length === 2);
    doubleNodes.forEach(region => {
        const [c1, c2] = region.label.split('');
        const pos1 = nodePositions.get(c1);
        const pos2 = nodePositions.get(c2);
        if (pos1 && pos2) {
            // Position halfway between parent nodes, but slightly closer to center
            const midX = (pos1.x + pos2.x) / 2;
            const midY = (pos1.y + pos2.y) / 2;
            // Pull towards center by 20%
            nodePositions.set(region.label, {
                x: midX + (centerX - midX) * 0.2,
                y: midY + (centerY - midY) * 0.2
            });
        }
    });
    
    // 3. Position triple-letter node (ABC) in center
    const tripleNode = regions.find(r => r.label.length === 3);
    if (tripleNode) {
        nodePositions.set(tripleNode.label, { x: centerX, y: centerY });
    }

    // Draw edges first (so they appear behind nodes)
    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    
    // Draw edges between adjacent nodes
    nodePositions.forEach((pos1, label1) => {
        nodePositions.forEach((pos2, label2) => {
            if (label1 < label2 && this.areRegionsAdjacent(label1, label2)) {
                // Calculate angle for proper edge connection to node circumference
                const angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
                
                // Start and end points adjusted to node boundaries
                const startX = pos1.x + nodeRadius * Math.cos(angle);
                const startY = pos1.y + nodeRadius * Math.sin(angle);
                const endX = pos2.x - nodeRadius * Math.cos(angle);
                const endY = pos2.y - nodeRadius * Math.sin(angle);
                
                // Draw the edge
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
            }
        });
    });
    ctx.stroke();

    // Draw nodes
    nodePositions.forEach((pos, label) => {
        // Draw node circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#2196F3'; // Blue color for nodes
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, pos.x, pos.y);
    });

    // Optional: Add debug information
    if (this.debug) {
        console.log('Regions drawn:', regions.map(r => r.label));
        console.log('Node positions:', Object.fromEntries(nodePositions));
    }
}
    
   areRegionsAdjacent(label1, label2) {
        // Single letter regions are always adjacent
        if (label1.length === 1 && label2.length === 1) {
            return true;
        }
        
        // For other cases, check if they differ by exactly one character
        const set1 = new Set(label1.split(''));
        const set2 = new Set(label2.split(''));
        
        // Get symmetric difference
        const diff = new Set([...set1, ...set2]);
        for (const char of set1) {
            if (set2.has(char)) {
                diff.delete(char);
            }
        }
        
        return diff.size === 1;
    }
    
    draw() {
        // Clear canvases
        this.vennCtx.clearRect(0, 0, this.vennCanvas.width, this.vennCanvas.height);
        
        // Draw Venn diagram
        this.circles.forEach(circle => this.drawCircle(this.vennCtx, circle));
        
        // Draw region labels
        const regions = this.getRegions(this.circles);
        this.vennCtx.font = '16px Arial';
        this.vennCtx.textAlign = 'center';
        this.vennCtx.textBaseline = 'middle';
        this.vennCtx.fillStyle = 'black';
        regions.forEach(region => {
            this.vennCtx.fillText(region.label, region.center.x, region.center.y);
        });
        
        // Draw graphs
        this.drawGraph(this.currentGraphCtx, this.circles);
        this.drawGraph(this.targetGraphCtx, this.targetCircles);
    }

    checkWinCondition() {
        const currentRegions = this.getRegions(this.circles);
        const targetRegions = this.getRegions(this.targetCircles);

        // Compare region sets
        const currentLabels = new Set(currentRegions.map(r => r.label));
        const targetLabels = new Set(targetRegions.map(r => r.label));

        const isMatch = 
            currentLabels.size === targetLabels.size &&
            [...currentLabels].every(label => targetLabels.has(label));

        if (isMatch) {
            document.getElementById('winMessage').classList.remove('hidden');
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new VennGame();
});
