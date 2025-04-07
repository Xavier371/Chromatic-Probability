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
        this.targetCircles = [];
        this.selectedCircle = null;
        this.dragOffset = { x: 0, y: 0 };
        this.scaling = false;

        // Set up event listeners
        this.initializeControls();
        
        // Generate initial target configuration
        this.targetCircles = this.generateRandomConfiguration();
        
        // Initialize default circles
        this.initializeDefaultCircles();
        
        // Initial draw
        this.resizeCanvases();
    }

    // Helper functions for geometric calculations
    isPointInCircle(point, circle) {
        const dx = point.x - circle.x;
        const dy = point.y - circle.y;
        return dx * dx + dy * dy <= circle.radius * circle.radius;
    }

    isCirclesTouching(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // More precise touching detection
        return Math.abs(distance - (circle1.radius + circle2.radius)) < 5;
    }

    hasOverlapArea(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Require significant overlap to create a region
        return distance < (circle1.radius + circle2.radius - 20);
    }

    hasTripleOverlap(circles) {
        return circles.every((circle1, i) => 
            circles.slice(i + 1).every(circle2 => 
                this.hasOverlapArea(circle1, circle2)
            )
        );
    }

    isValidTargetConfiguration(circles) {
        // Check if at least two circles are touching or overlapping
        let touchingCount = 0;
        for (let i = 0; i < circles.length; i++) {
            for (let j = i + 1; j < circles.length; j++) {
                if (this.isCirclesTouching(circles[i], circles[j]) || 
                    this.hasOverlapArea(circles[i], circles[j])) {
                    touchingCount++;
                }
            }
        }
        return touchingCount >= 1;
    }
        initializeDefaultCircles() {
        const centerX = this.vennCanvas.width / 2;
        const centerY = this.vennCanvas.height / 2;
        const baseRadius = Math.min(this.vennCanvas.width, this.vennCanvas.height) / 4;
        const offset = baseRadius * 0.7; // Ensures proper overlap

        // Position circles in perfect overlapping triangle formation
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
        const centerX = this.targetGraphCanvas.width / 2;
        const centerY = this.targetGraphCanvas.height / 2;
        const radius = Math.min(this.targetGraphCanvas.width, this.targetGraphCanvas.height) / 3;
        
        // Generate positions in a more distributed way
        const positions = [];
        for (let i = 0; i < 3; i++) {
            // Use golden angle for better distribution
            const angle = i * (2 * Math.PI / 3) + Math.random() * 0.5;
            const distance = radius * (0.6 + Math.random() * 0.4);
            
            positions.push({
                x: centerX + distance * Math.cos(angle),
                y: centerY + distance * Math.sin(angle),
                radius: radius * 0.3 * (0.8 + Math.random() * 0.4),
                label: ['A', 'B', 'C'][i]
            });
        }
        
        // Add some random jitter to prevent alignment
        positions.forEach(pos => {
            pos.x += (Math.random() - 0.5) * radius * 0.2;
            pos.y += (Math.random() - 0.5) * radius * 0.2;
        });
        
        return positions;
    }

    resizeCanvases() {
        const setCanvasSize = (canvas) => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };

        setCanvasSize(this.vennCanvas);
        setCanvasSize(this.currentGraphCanvas);
        setCanvasSize(this.targetGraphCanvas);

        // Reinitialize circle positions after resize
        this.initializeDefaultCircles();
        this.draw();
    }

    resetGame() {
        // Generate new random target configuration
        do {
            this.targetCircles = this.generateRandomConfiguration();
        } while (!this.isValidTargetConfiguration(this.targetCircles));

        // Reset current circles to perfect overlap
        this.initializeDefaultCircles();

        // Reset win state
        document.getElementById('winMessage').classList.add('hidden');
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
    }
        getRegions(circles) {
        const regions = [];
        
        // Always add single circle regions (A, B, C)
        circles.forEach(circle => {
            regions.push({
                label: circle.label,
                center: { x: circle.x, y: circle.y }
            });
        });

        // Two circle intersections - only if there's significant overlap
        const pairs = [['A', 'B'], ['B', 'C'], ['A', 'C']];
        pairs.forEach(([label1, label2]) => {
            const circle1 = circles.find(c => c.label === label1);
            const circle2 = circles.find(c => c.label === label2);
            if (this.hasOverlapArea(circle1, circle2)) {
                const center = this.calculateRegionCenter([circle1, circle2], circles);
                if (center) {
                    regions.push({ label: label1 + label2, center });
                }
            }
        });

        // Three circle intersection - only if all three overlap significantly
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
            // Point must be inside all circles of the region
            const inRegionCircles = regionCircles.every(circle => 
                this.isPointInCircle(point, circle));
            
            // Point must be outside all other circles
            const outsideOtherCircles = allCircles
                .filter(c => !regionCircles.includes(c))
                .every(circle => !this.isPointInCircle(point, circle));
            
            return inRegionCircles && outsideOtherCircles;
        });

        if (validPoints.length === 0) return null;

        // Calculate center of mass of valid points
        const centerX = validPoints.reduce((sum, p) => sum + p.x, 0) / validPoints.length;
        const centerY = validPoints.reduce((sum, p) => sum + p.y, 0) / validPoints.length;
        
        return { x: centerX, y: centerY };
    }

    generatePointGrid(circle) {
        const points = [];
        const gridSize = 10; // Adjust for precision vs performance
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

        // Check if click is near circle edge (for scaling)
        for (const circle of this.circles) {
            const dist = Math.sqrt((pos.x - circle.x) ** 2 + (pos.y - circle.y) ** 2);
            if (Math.abs(dist - circle.radius) < 10) {
                this.selectedCircle = circle;
                this.scaling = true;
                return;
            }
        }

        // Check if click is inside circle (for dragging)
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
            // Update radius based on distance from center
            const dx = pos.x - this.selectedCircle.x;
            const dy = pos.y - this.selectedCircle.y;
            this.selectedCircle.radius = Math.sqrt(dx * dx + dy * dy);
        } else {
            // Update position for dragging
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
        drawCircle(ctx, circle) {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawGraph(ctx, circles) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        const regions = this.getRegions(circles);
        
        // Calculate scaling factor to fit nodes in canvas with more spacing
        const boundingBox = this.calculateGraphBoundingBox(regions);
        const scale = Math.min(
            (ctx.canvas.width * 0.7) / (boundingBox.maxX - boundingBox.minX),
            (ctx.canvas.height * 0.7) / (boundingBox.maxY - boundingBox.minY)
        );
        
        // Draw edges first
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        
        // Draw edges between regions that share circles or between touching circles
        for (let i = 0; i < regions.length; i++) {
            for (let j = i + 1; j < regions.length; j++) {
                // For single circles, check both touching and overlap
                if (regions[i].label.length === 1 && regions[j].label.length === 1) {
                    const circle1 = circles.find(c => c.label === regions[i].label);
                    const circle2 = circles.find(c => c.label === regions[j].label);
                    if (this.isCirclesTouching(circle1, circle2) || 
                        this.hasOverlapArea(circle1, circle2)) {
                        const pos1 = this.scalePosition(regions[i].center, boundingBox, scale);
                        const pos2 = this.scalePosition(regions[j].center, boundingBox, scale);
                        ctx.moveTo(pos1.x, pos1.y);
                        ctx.lineTo(pos2.x, pos2.y);
                    }
                }
                // For regions sharing circles
                else if (this.areRegionsAdjacent(regions[i].label, regions[j].label)) {
                    const pos1 = this.scalePosition(regions[i].center, boundingBox, scale);
                    const pos2 = this.scalePosition(regions[j].center, boundingBox, scale);
                    ctx.moveTo(pos1.x, pos1.y);
                    ctx.lineTo(pos2.x, pos2.y);
                }
            }
        }
        ctx.stroke();

        // Draw nodes
        regions.forEach(region => {
            const pos = this.scalePosition(region.center, boundingBox, scale);
            
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

    calculateGraphBoundingBox(regions) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        regions.forEach(region => {
            minX = Math.min(minX, region.center.x);
            minY = Math.min(minY, region.center.y);
            maxX = Math.max(maxX, region.center.x);
            maxY = Math.max(maxY, region.center.y);
        });
        
        // Add more padding for better spacing
        const padding = Math.max(maxX - minX, maxY - minY) * 0.3;
        return {
            minX: minX - padding,
            minY: minY - padding,
            maxX: maxX + padding,
            maxY: maxY + padding
        };
    }

    scalePosition(pos, boundingBox, scale) {
        return {
            x: (pos.x - boundingBox.minX) * scale + (this.currentGraphCanvas.width - 
                (boundingBox.maxX - boundingBox.minX) * scale) / 2,
            y: (pos.y - boundingBox.minY) * scale + (this.currentGraphCanvas.height - 
                (boundingBox.maxY - boundingBox.minY) * scale) / 2
        };
    }

    areRegionsAdjacent(label1, label2) {
        // For single circles, check both touching and overlap
        if (label1.length === 1 && label2.length === 1) {
            const circle1 = this.circles.find(c => c.label === label1);
            const circle2 = this.circles.find(c => c.label === label2);
            return this.isCirclesTouching(circle1, circle2) || 
                   this.hasOverlapArea(circle1, circle2);
        }
        
        // For regions with a shared circle, they're adjacent
        const set1 = new Set(label1.split(''));
        const set2 = new Set(label2.split(''));
        return [...set1].some(circle => set2.has(circle));
    }

    draw() {
        const vennCtx = this.vennCanvas.getContext('2d');
        const currentGraphCtx = this.currentGraphCanvas.getContext('2d');
        const targetGraphCtx = this.targetGraphCanvas.getContext('2d');

        // Clear canvases
        vennCtx.clearRect(0, 0, this.vennCanvas.width, this.vennCanvas.height);
        currentGraphCtx.clearRect(0, 0, this.currentGraphCanvas.width, this.currentGraphCanvas.height);
        targetGraphCtx.clearRect(0, 0, this.targetGraphCanvas.width, this.targetGraphCanvas.height);

        // Draw Venn diagram circles
        this.circles.forEach(circle => this.drawCircle(vennCtx, circle));
        
        // Draw region labels
        const regions = this.getRegions(this.circles);
        regions.forEach(region => {
            if (region.label.length > 1) {  // Only draw intersection labels
                vennCtx.fillStyle = 'black';
                vennCtx.font = 'bold 16px Arial';
                vennCtx.textAlign = 'center';
                vennCtx.textBaseline = 'middle';
                vennCtx.fillText(region.label, region.center.x, region.center.y);
            }
        });

        // Draw A, B, C labels at circle centers
        this.circles.forEach(circle => {
            vennCtx.fillStyle = 'black';
            vennCtx.font = 'bold 16px Arial';
            vennCtx.textAlign = 'center';
            vennCtx.textBaseline = 'middle';
            vennCtx.fillText(circle.label, circle.x, circle.y);
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
        
        // Check if both graphs have the same number of regions
        if (currentRegions.length !== targetRegions.length) {
            return;
        }
        
        // Check if all regions match
        const currentLabels = new Set(currentRegions.map(r => r.label));
        const targetLabels = new Set(targetRegions.map(r => r.label));
        
        if (currentLabels.size === targetLabels.size && 
            [...currentLabels].every(label => targetLabels.has(label))) {
            document.getElementById('winMessage').classList.remove('hidden');
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new VennGame();
});
