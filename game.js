class VennGame {
    constructor() {
        console.log('VennGame constructor called');
        
        // Get canvas elements
        this.vennCanvas = document.getElementById('vennCanvas');
        this.currentGraphCanvas = document.getElementById('currentGraphCanvas');
        this.targetGraphCanvas = document.getElementById('targetGraphCanvas');
        
        if (!this.vennCanvas || !this.currentGraphCanvas || !this.targetGraphCanvas) {
            console.error('Canvas elements not found');
            return;
        }

        // Initialize game state
        this.circles = [];
        this.selectedCircle = null;
        this.dragOffset = { x: 0, y: 0 };
        this.scaling = false;

        // Set up event listeners
        this.initializeControls();
        
        // Generate initial target configuration
        this.generateNewTarget();
        
        // Initialize default circles
        this.initializeDefaultCircles();
        
        // Initial draw
        this.resizeCanvases();
    }

    isPointInCircle(point, circle) {
        const dx = point.x - circle.x;
        const dy = point.y - circle.y;
        return dx * dx + dy * dy <= circle.radius * circle.radius;
    }

    isCircleContained(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance + circle1.radius <= circle2.radius;
    }

    isCirclesTouching(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const sumRadii = circle1.radius + circle2.radius;
        return Math.abs(distance - sumRadii) < 2; // Small threshold for touching
    }

    hasOverlapArea(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < circle1.radius + circle2.radius - 2; // Small threshold for overlap
    }

    hasTripleOverlap(circles) {
        const [c1, c2, c3] = circles;
        const centers = [
            { x: c1.x, y: c1.y },
            { x: c2.x, y: c2.y },
            { x: c3.x, y: c3.y }
        ];
        
        // Check if any point exists that's inside all three circles
        for (let x = Math.min(c1.x, c2.x, c3.x); x <= Math.max(c1.x, c2.x, c3.x); x += 5) {
            for (let y = Math.min(c1.y, c2.y, c3.y); y <= Math.max(c1.y, c2.y, c3.y); y += 5) {
                const point = { x, y };
                if (circles.every(circle => this.isPointInCircle(point, circle))) {
                    return true;
                }
            }
        }
        return false;
    }

    generateNewTarget() {
        do {
            this.targetCircles = this.generateRandomConfiguration();
        } while (!this.isValidTargetConfiguration(this.targetCircles));
    }

    initializeDefaultCircles() {
        const centerX = this.vennCanvas.width / 2;
        const centerY = this.vennCanvas.height / 2;
        const baseRadius = Math.min(this.vennCanvas.width, this.vennCanvas.height) / 4;
        const offset = baseRadius * 0.7;

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
        generateRandomConfiguration() {
        const centerX = this.vennCanvas.width / 2;
        const centerY = this.vennCanvas.height / 2;
        const maxRadius = Math.min(this.vennCanvas.width, this.vennCanvas.height) / 5;
        const minRadius = maxRadius * 0.6;
        
        const circles = [];
        for (let i = 0; i < 3; i++) {
            const radius = minRadius + Math.random() * (maxRadius - minRadius);
            const angle = (i * 2 * Math.PI / 3) + (Math.random() * Math.PI / 2 - Math.PI / 4);
            const distance = maxRadius * (1.2 + Math.random() * 0.8);
            
            circles.push({
                x: centerX + distance * Math.cos(angle),
                y: centerY + distance * Math.sin(angle),
                radius: radius,
                label: ['A', 'B', 'C'][i]
            });
        }
        
        return circles;
    }

    isValidTargetConfiguration(circles) {
        // Ensure circles are not completely overlapping or too far apart
        let hasConnection = false;
        let allDisjoint = true;
        
        for (let i = 0; i < circles.length; i++) {
            for (let j = i + 1; j < circles.length; j++) {
                const c1 = circles[i];
                const c2 = circles[j];
                
                // Check if circles are too close or overlapping completely
                if (this.isCircleContained(c1, c2) || this.isCircleContained(c2, c1)) {
                    return false;
                }
                
                // Check if circles are touching or overlapping
                if (this.isCirclesTouching(c1, c2) || this.hasOverlapArea(c1, c2)) {
                    hasConnection = true;
                    allDisjoint = false;
                }
            }
        }
        
        // Valid if there's at least one connection but not all circles overlap
        return hasConnection && !this.hasTripleOverlap(circles);
    }

    resizeCanvases() {
        const setCanvasSize = (canvas) => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };

        setCanvasSize(this.vennCanvas);
        setCanvasSize(this.currentGraphCanvas);
        setCanvasSize(this.targetGraphCanvas);

        this.draw();
    }

    resetGame() {
        // Generate new target configuration
        this.generateNewTarget();
        
        // Reset current circles to initial positions
        this.initializeDefaultCircles();
        
        // Hide win message
        document.getElementById('winMessage').classList.add('hidden');
        
        // Redraw everything
        this.draw();
    }

    initializeControls() {
        this.vennCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.vennCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.vennCanvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.vennCanvas.addEventListener('mouseleave', () => this.handleMouseUp());

        this.vennCanvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.vennCanvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.vennCanvas.addEventListener('touchend', () => this.handleTouchEnd());

        document.getElementById('resetButton').addEventListener('click', () => this.resetGame());
        
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvases());
    }

    getRegions(circles) {
        const regions = [];
        const processed = new Set();
        
        // Add single circle regions (A, B, C)
        circles.forEach(circle => {
            // Only add if not contained within another circle
            const isContained = circles.some(other => 
                other !== circle && this.isCircleContained(circle, other)
            );
            
            if (!isContained) {
                regions.push({
                    label: circle.label,
                    center: { x: circle.x, y: circle.y }
                });
            }
        });
                // Two circle intersections
        const pairs = [['A', 'B'], ['B', 'C'], ['A', 'C']];
        pairs.forEach(([label1, label2]) => {
            const circle1 = circles.find(c => c.label === label1);
            const circle2 = circles.find(c => c.label === label2);
            
            if (this.hasOverlapArea(circle1, circle2) && 
                !this.isCircleContained(circle1, circle2) && 
                !this.isCircleContained(circle2, circle1)) {
                const center = this.calculateRegionCenter([circle1, circle2], circles);
                if (center) {
                    regions.push({ label: label1 + label2, center });
                }
            }
        });

        // Three circle intersection
        if (this.hasTripleOverlap(circles)) {
            const center = this.calculateRegionCenter(circles, circles);
            if (center) {
                regions.push({ label: 'ABC', center });
            }
        }

        return regions;
    }

    calculateRegionCenter(regionCircles, allCircles) {
        const points = this.generatePointGrid(regionCircles[0]);
        let validPoints = points.filter(point => {
            const inRegionCircles = regionCircles.every(circle => 
                this.isPointInCircle(point, circle));
            
            const outsideOtherCircles = allCircles
                .filter(c => !regionCircles.includes(c))
                .every(circle => !this.isPointInCircle(point, circle));
            
            return inRegionCircles && outsideOtherCircles;
        });

        if (validPoints.length === 0) return null;

        // Calculate center of mass
        const centerX = validPoints.reduce((sum, p) => sum + p.x, 0) / validPoints.length;
        const centerY = validPoints.reduce((sum, p) => sum + p.y, 0) / validPoints.length;
        
        return { x: centerX, y: centerY };
    }

    generatePointGrid(circle) {
        const points = [];
        const gridSize = 5; // Smaller grid size for more precise center calculation
        const boundingBox = {
            minX: circle.x - circle.radius,
            maxX: circle.x + circle.radius,
            minY: circle.y - circle.radius,
            maxY: circle.y + circle.radius
        };

        for (let x = boundingBox.minX; x <= boundingBox.maxX; x += gridSize) {
            for (let y = boundingBox.minY; y <= boundingBox.maxY; y += gridSize) {
                points.push({ x, y });
            }
        }
        return points;
    }

    drawCircle(ctx, circle) {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    }

    drawGraph(ctx, circles) {
        const regions = this.getRegions(circles);
        
        // Calculate layout positions for nodes
        const nodePositions = this.calculateGraphLayout(regions);
        
        // Draw edges
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < regions.length; i++) {
            for (let j = i + 1; j < regions.length; j++) {
                if (this.areRegionsAdjacent(regions[i].label, regions[j].label, circles)) {
                    const pos1 = nodePositions[regions[i].label];
                    const pos2 = nodePositions[regions[j].label];
                    ctx.moveTo(pos1.x, pos1.y);
                    ctx.lineTo(pos2.x, pos2.y);
                }
            }
        }
        ctx.stroke();

        // Draw nodes
        regions.forEach(region => {
            const pos = nodePositions[region.label];
            
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#1a73e8';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(region.label, pos.x, pos.y);
        });
    }

    calculateGraphLayout(regions) {
        const positions = {};
        const centerX = this.currentGraphCanvas.width / 2;
        const centerY = this.currentGraphCanvas.height / 2;
        const radius = Math.min(this.currentGraphCanvas.width, this.currentGraphCanvas.height) * 0.35;
        
        regions.forEach((region, i) => {
            const angle = (i * 2 * Math.PI / regions.length) - Math.PI / 2;
            positions[region.label] = {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            };
        });
        
        return positions;
    }

    areRegionsAdjacent(label1, label2, circles) {
        if (label1.length === 1 && label2.length === 1) {
            const circle1 = circles.find(c => c.label === label1);
            const circle2 = circles.find(c => c.label === label2);
            return this.isCirclesTouching(circle1, circle2) || this.hasOverlapArea(circle1, circle2);
        }
        
        const set1 = new Set(label1.split(''));
        const set2 = new Set(label2.split(''));
        return [...set1].some(circle => set2.has(circle));
    }

    draw() {
        const vennCtx = this.vennCanvas.getContext('2d');
        const currentGraphCtx = this.currentGraphCanvas.getContext('2d');
        const targetGraphCtx = this.targetGraphCanvas.getContext('2d');

        // Clear all canvases
        vennCtx.clearRect(0, 0, this.vennCanvas.width, this.vennCanvas.height);
        currentGraphCtx.clearRect(0, 0, this.currentGraphCanvas.width, this.currentGraphCanvas.height);
        targetGraphCtx.clearRect(0, 0, this.targetGraphCanvas.width, this.targetGraphCanvas.height);

        // Draw Venn diagram
        this.circles.forEach(circle => this.drawCircle(vennCtx, circle));
        
        // Draw region labels
        const regions = this.getRegions(this.circles);
        regions.forEach(region => {
            vennCtx.fillStyle = 'black';
            vennCtx.font = 'bold 16px Arial';
            vennCtx.textAlign = 'center';
            vennCtx.textBaseline = 'middle';
            vennCtx.fillText(region.label, region.center.x, region.center.y);
        });

        // Draw graphs
        this.drawGraph(currentGraphCtx, this.circles);
        this.drawGraph(targetGraphCtx, this.targetCircles);
        
        // Check win condition
        this.checkWinCondition();
    }

    checkWinCondition() {
        const currentRegions = this.getRegions(this.circles);
        const targetRegions = this.getRegions(this.targetCircles);
        
        if (currentRegions.length !== targetRegions.length) return;
        
        const currentLabels = new Set(currentRegions.map(r => r.label));
        const targetLabels = new Set(targetRegions.map(r => r.label));
        
        if (currentLabels.size === targetLabels.size && 
            [...currentLabels].every(label => targetLabels.has(label))) {
            document.getElementById('winMessage').classList.remove('hidden');
        }
    }

    // Mouse and touch event handlers remain unchanged
    getMousePos(e) {
        const rect = this.vennCanvas.getBoundingClientRect();
        const scaleX = this.vennCanvas.width / rect.width;
        const scaleY = this.vennCanvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        this.selectedCircle = null;
        this.scaling = false;

        for (const circle of this.circles) {
            const dist = Math.sqrt((pos.x - circle.x) ** 2 + (pos.y - circle.y) ** 2);
            if (Math.abs(dist - circle.radius) < 10) {
                this.selectedCircle = circle;
                this.scaling = true;
                return;
            }
        }

        for (const circle of this.circles) {
            if (this.isPointInCircle(pos, circle)) {
                this.selectedCircle = circle;
                this.dragOffset = {
                    x: pos.x - circle.x,
                    y: pos.y - circle.y
                };
                return;
            }
        }
    }

    handleMouseMove(e) {
        if (!this.selectedCircle) return;
        const pos = this.getMousePos(e);

        if (this.scaling) {
            const dx = pos.x - this.selectedCircle.x;
            const dy = pos.y - this.selectedCircle.y;
            this.selectedCircle.radius = Math.sqrt(dx * dx + dy * dy);
        } else {
            this.selectedCircle.x = pos.x - this.dragOffset.x;
            this.selectedCircle.y = pos.y - this.dragOffset.y;
        }

        this.draw();
    }

    handleMouseUp() {
        this.selectedCircle = null;
        this.scaling = false;
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseDown(touch);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseMove(touch);
    }

    handleTouchEnd() {
        this.handleMouseUp();
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new VennGame();
});
