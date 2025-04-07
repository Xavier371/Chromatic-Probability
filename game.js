console.log('Game script loaded');

class VennGame {
    constructor() {
        console.log('VennGame constructor called');
        
        this.debug = false;
        
        // Canvas setup
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

        // Generate target configuration first (different from initial)
        do {
            this.targetCircles = this.generateRandomConfiguration();
        } while (!this.isValidTargetConfiguration(this.targetCircles));

        // Initialize with perfect overlap
        this.initializeDefaultCircles();

        // Initialize interaction states
        this.selectedCircle = null;
        this.isDragging = false;
        this.isScaling = false;
        this.lastMousePos = { x: 0, y: 0 };

        // Setup event listeners and controls
        window.addEventListener('resize', () => {
            this.resizeCanvases();
            this.draw();
        });

        this.initializeControls();
        
        // Hide win message
        const winMessage = document.getElementById('winMessage');
        if (winMessage) {
            winMessage.classList.add('hidden');
        }
        
        this.draw();
    }

    // Geometric helper functions
    isCirclesTouching(circle1, circle2) {
        const dx = circle2.x - circle1.x;
        const dy = circle2.y - circle1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const sumRadii = circle1.radius + circle2.radius;
        
        // Check if circles are touching or overlapping
        const epsilon = 0.1;
        return distance <= sumRadii + epsilon;
    }

    hasOverlapArea(circle1, circle2) {
        const dx = circle2.x - circle1.x;
        const dy = circle2.y - circle1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Must have real overlap area, not just touching
        return distance < circle1.radius + circle2.radius - 0.1;
    }

    isCircleInside(circle1, circle2) {
        const dx = circle2.x - circle1.x;
        const dy = circle2.y - circle1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance + Math.min(circle1.radius, circle2.radius) <= Math.max(circle1.radius, circle2.radius);
    }

    isValidTargetConfiguration(circles) {
        if (!circles) return false;
        
        // Must be different from perfect overlap
        const perfectOverlap = this.getRegions(this.circles).map(r => r.label).sort().join(',');
        const targetOverlap = this.getRegions(circles).map(r => r.label).sort().join(',');
        
        return perfectOverlap !== targetOverlap;
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
        const baseRadius = Math.min(this.targetGraphCanvas.width, this.targetGraphCanvas.height) / 5;
        
        // Generate random positions ensuring some variation
        const positions = [];
        const minDistance = baseRadius * 0.5; // Minimum distance between circle centers
        const maxDistance = baseRadius * 2.5; // Maximum distance between circle centers
        
        for (let i = 0; i < 3; i++) {
            let x, y, valid;
            do {
                valid = true;
                // Generate position within canvas bounds
                x = centerX + (Math.random() - 0.5) * maxDistance;
                y = centerY + (Math.random() - 0.5) * maxDistance;
                
                // Check distance from other circles
                for (const pos of positions) {
                    const dx = x - pos.x;
                    const dy = y - pos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < minDistance) {
                        valid = false;
                        break;
                    }
                }
            } while (!valid);
            
            positions.push({
                x: x,
                y: y,
                radius: baseRadius * (0.8 + Math.random() * 0.4), // Random radius variation
                label: ['A', 'B', 'C'][i]
            });
        }
        
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
        const labels = ['A', 'B', 'C'];

        // Single circle regions
        circles.forEach((circle, i) => {
            const label = labels[i];
            const center = this.calculateRegionCenter([circle], circles);
            if (center) {
                regions.push({ label, center });
            }
        });

        // Two circle intersections
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

    // Touch event handlers mirror mouse events
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
        
        // Calculate scaling factor to fit nodes in canvas
        const boundingBox = this.calculateGraphBoundingBox(regions);
        const scale = Math.min(
            (ctx.canvas.width * 0.8) / (boundingBox.maxX - boundingBox.minX),
            (ctx.canvas.height * 0.8) / (boundingBox.maxY - boundingBox.minY)
        );
        
        // Draw edges first
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < regions.length; i++) {
            for (let j = i + 1; j < regions.length; j++) {
                if (this.areRegionsAdjacent(regions[i].label, regions[j].label)) {
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
            
            // Draw node
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#1a73e8';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw label
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
        
        // Add padding
        const padding = 50;
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
        // Convert labels to sets of circles
        const set1 = new Set(label1.split(''));
        const set2 = new Set(label2.split(''));
        
        // Check if regions share at least one circle
        for (const circle of set1) {
            if (set2.has(circle)) {
                return true;
            }
        }
        return false;
    }

    draw() {
        const vennCtx = this.vennCanvas.getContext('2d');
        const currentGraphCtx = this.currentGraphCanvas.getContext('2d');
        const targetGraphCtx = this.targetGraphCanvas.getContext('2d');

        // Clear canvases
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
