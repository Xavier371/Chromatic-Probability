console.log('Game script loaded');

class VennGame {
    constructor() {
        console.log('VennGame constructor called');
        
        // Canvas setup with error checking
        // Canvas setup with error checking
        this.vennCanvas = document.getElementById('vennCanvas');
        this.currentGraphCanvas = document.getElementById('currentGraphCanvas');
        this.targetGraphCanvas = document.getElementById('targetGraphCanvas');
        
        if (!this.vennCanvas || !this.currentGraphCanvas || !this.targetGraphCanvas) {
            console.error('Could not find one or more canvas elements');
            return;
        }
        
        this.vennCtx = this.vennCanvas.getContext('2d');
        this.currentGraphCtx = this.currentGraphCanvas.getContext('2d');
        this.targetGraphCtx = this.targetGraphCanvas.getContext('2d');

        // Game state
        this.circles = [
            { x: 0, y: 0, radius: 80, label: 'A' },
            { x: 0, y: 0, radius: 80, label: 'B' },
            { x: 0, y: 0, radius: 80, label: 'C' }
        ];
        
        this.targetCircles = null;
        this.selectedCircle = null;
        this.isDragging = false;
        this.isScaling = false;
        this.lastMousePos = { x: 0, y: 0 };

        // Set canvas sizes and initialize
        this.resizeCanvases();
        window.addEventListener('resize', () => this.resizeCanvases());
        this.initializeControls();
        this.resetGame();
    }
   
    resizeCanvases() {
        // Set fixed sizes for the canvases
        this.vennCanvas.width = this.vennCanvas.offsetWidth;
        this.vennCanvas.height = this.vennCanvas.offsetHeight;
    
        this.currentGraphCanvas.width = this.currentGraphCanvas.offsetWidth;
        this.currentGraphCanvas.height = this.currentGraphCanvas.offsetHeight;
    
        this.targetGraphCanvas.width = this.targetGraphCanvas.offsetWidth;
        this.targetGraphCanvas.height = this.targetGraphCanvas.offsetHeight;
    
        // Adjust initial circle positions based on new canvas size
        if (!this.targetCircles) {
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
        }
    
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
    const baseRadius = Math.min(this.targetGraphCanvas.width, this.targetGraphCanvas.height) / 4;
    
    // Generate a configuration that ensures overlap
    const minOffset = baseRadius * 0.5;  // Minimum distance from center
    const maxOffset = baseRadius * 1.2;  // Maximum distance from center
    const minRadius = baseRadius * 0.8;  // Minimum circle radius
    const maxRadius = baseRadius * 1.2;  // Maximum circle radius

    // Generate three angles with some randomness but maintaining rough triangle formation
    const angles = [
        Math.random() * Math.PI / 3,
        Math.PI * (2/3) + Math.random() * Math.PI / 3,
        Math.PI * (4/3) + Math.random() * Math.PI / 3
    ];

    return angles.map((angle, i) => {
        const offset = minOffset + Math.random() * (maxOffset - minOffset);
        return {
            x: centerX + offset * Math.cos(angle),
            y: centerY + offset * Math.sin(angle),
            radius: minRadius + Math.random() * (maxRadius - minRadius),
            label: ['A', 'B', 'C'][i]
        };
    });
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
        ctx.fillStyle = 'white';
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
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        const regions = this.getRegions(circles);
        const nodeRadius = 25;
        
        // Calculate the bounding box of the Venn diagram
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        circles.forEach(circle => {
            minX = Math.min(minX, circle.x - circle.radius);
            maxX = Math.max(maxX, circle.x + circle.radius);
            minY = Math.min(minY, circle.y - circle.radius);
            maxY = Math.max(maxY, circle.y + circle.radius);
        });
        
        const vennWidth = maxX - minX;
        const vennHeight = maxY - minY;
        
        // Scale factor to fit in canvas while spacing out nodes
        const scaleX = (ctx.canvas.width - 4 * nodeRadius) / vennWidth;
        const scaleY = (ctx.canvas.height - 4 * nodeRadius) / vennHeight;
        const scale = Math.min(scaleX, scaleY) * 0.8; // 80% of available space
        
        const nodePositions = new Map();
        
        // Position nodes based on their centers in the Venn diagram
        regions.forEach(region => {
            const x = ctx.canvas.width/2 + (region.center.x - (minX + vennWidth/2)) * scale;
            const y = ctx.canvas.height/2 + (region.center.y - (minY + vennHeight/2)) * scale;
            nodePositions.set(region.label, { x, y });
        });
    
        // Draw edges first
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        
        nodePositions.forEach((pos1, label1) => {
            nodePositions.forEach((pos2, label2) => {
                if (label1 < label2 && (
                    this.areRegionsAdjacent(label1, label2) ||
                    (label2 === 'ABC' && label1.length === 1) ||
                    (label1 === 'ABC' && label2.length === 1)
                )) {
                    const angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
                    const startX = pos1.x + nodeRadius * Math.cos(angle);
                    const startY = pos1.y + nodeRadius * Math.sin(angle);
                    const endX = pos2.x - nodeRadius * Math.cos(angle);
                    const endY = pos2.y - nodeRadius * Math.sin(angle);
                    
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                }
            });
        });
        ctx.stroke();
    
        // Draw nodes
        nodePositions.forEach((pos, label) => {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#2196F3';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.stroke();
    
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, pos.x, pos.y);
        });
    }

   areRegionsAdjacent(label1, label2) {
        // Two regions are adjacent if they differ by exactly one character
        // or if one is a subset of the other and they differ by one character
        const set1 = new Set(label1.split(''));
        const set2 = new Set(label2.split(''));
        
        // Get symmetric difference
        const diff = new Set([...set1, ...set2]);
        for (const char of set1) {
            if (set2.has(char)) {
                diff.delete(char);
            }
        }
        
        // Regions are adjacent if symmetric difference is 1
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
