console.log('Game script loaded');

class VennGame {
    constructor() {
        console.log('VennGame constructor called');
        
        // Canvas setup with error checking
        this.vennCanvas = document.getElementById('vennCanvas');
        this.currentGraphCanvas = document.getElementById('currentGraph');
        this.targetGraphCanvas = document.getElementById('targetGraph');
        
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
    
            this.circles = [
                { x: centerX - baseRadius/2, y: centerY - baseRadius/2, radius: baseRadius, label: 'A' },
                { x: centerX + baseRadius/2, y: centerY - baseRadius/2, radius: baseRadius, label: 'B' },
                { x: centerX, y: centerY + baseRadius/2, radius: baseRadius, label: 'C' }
            ];
        }
    
        this.draw();
    }
    
    resetGame() {
        // Generate random target configuration
        this.targetCircles = this.generateRandomConfiguration();
        
        // Reset current circles to default positions
        const centerX = this.vennCanvas.width / 2;
        const centerY = this.vennCanvas.height / 2;
        const baseRadius = Math.min(this.vennCanvas.width, this.vennCanvas.height) / 4;
    
        this.circles = [
            { x: centerX - baseRadius/2, y: centerY - baseRadius/2, radius: baseRadius, label: 'A' },
            { x: centerX + baseRadius/2, y: centerY - baseRadius/2, radius: baseRadius, label: 'B' },
            { x: centerX, y: centerY + baseRadius/2, radius: baseRadius, label: 'C' }
        ];
    
        document.getElementById('winMessage').classList.add('hidden');
        this.draw();
    }
    
    generateRandomConfiguration() {
        const centerX = this.targetGraphCanvas.width / 2;
        const centerY = this.targetGraphCanvas.height / 2;
        const baseRadius = Math.min(this.targetGraphCanvas.width, this.targetGraphCanvas.height) / 4;
        
        // Generate random offsets that ensure overlap
        const maxOffset = baseRadius / 2;
        
        return [
            {
                x: centerX - baseRadius/2 + (Math.random() - 0.5) * maxOffset,
                y: centerY - baseRadius/2 + (Math.random() - 0.5) * maxOffset,
                radius: baseRadius * (0.8 + Math.random() * 0.4),
                label: 'A'
            },
            {
                x: centerX + baseRadius/2 + (Math.random() - 0.5) * maxOffset,
                y: centerY - baseRadius/2 + (Math.random() - 0.5) * maxOffset,
                radius: baseRadius * (0.8 + Math.random() * 0.4),
                label: 'B'
            },
            {
                x: centerX + (Math.random() - 0.5) * maxOffset,
                y: centerY + baseRadius/2 + (Math.random() - 0.5) * maxOffset,
                radius: baseRadius * (0.8 + Math.random() * 0.4),
                label: 'C'
            }
        ];
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
        
        // Check if clicking on a circle
        this.selectedCircle = this.circles.find(circle => 
            Math.hypot(mousePos.x - circle.x, mousePos.y - circle.y) < circle.radius
        );

        if (this.selectedCircle) {
            this.isDragging = true;
            // If clicking near the edge, enable scaling
            const distToCenter = Math.hypot(mousePos.x - this.selectedCircle.x, mousePos.y - this.selectedCircle.y);
            this.isScaling = Math.abs(distToCenter - this.selectedCircle.radius) < 20;
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
        
        // Add single circle regions
        circles.forEach(circle => {
            regions.push({
                label: circle.label,
                center: { x: circle.x, y: circle.y }
            });
        });
    
        // Add intersection regions
        const checkIntersection = (circle1, circle2) => {
            const dist = Math.hypot(circle2.x - circle1.x, circle2.y - circle1.y);
            return dist <= circle1.radius + circle2.radius;
        };
    
        if (checkIntersection(c1, c2)) {
            regions.push({
                label: 'AB',
                center: {
                    x: (c1.x + c2.x) / 2,
                    y: (c1.y + c2.y) / 2
                }
            });
        }
    
        if (checkIntersection(c2, c3)) {
            regions.push({
                label: 'BC',
                center: {
                    x: (c2.x + c3.x) / 2,
                    y: (c2.y + c3.y) / 2
                }
            });
        }
    
        if (checkIntersection(c1, c3)) {
            regions.push({
                label: 'AC',
                center: {
                    x: (c1.x + c3.x) / 2,
                    y: (c1.y + c3.y) / 2
                }
            });
        }
    
        // Check for triple intersection
        if (checkIntersection(c1, c2) && checkIntersection(c2, c3) && checkIntersection(c1, c3)) {
            regions.push({
                label: 'ABC',
                center: {
                    x: (c1.x + c2.x + c3.x) / 3,
                    y: (c1.y + c2.y + c3.y) / 3
                }
            });
        }
    
        return regions;
    }

    drawGraph(ctx, circles) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        const regions = this.getRegions(circles);
        const nodes = new Map();

        // Scale factors for the graph
        const scaleX = ctx.canvas.width / this.vennCanvas.width;
        const scaleY = ctx.canvas.height / this.vennCanvas.height;
        const scale = Math.min(scaleX, scaleY);

        // Center offset for the graph
        const offsetX = (ctx.canvas.width - this.vennCanvas.width * scale) / 2;
        const offsetY = (ctx.canvas.height - this.vennCanvas.height * scale) / 2;

        // Draw nodes
        regions.forEach(region => {
            const x = region.center.x * scale + offsetX;
            const y = region.center.y * scale + offsetY;
            
            nodes.set(region.label, { x, y });

            // Draw node circle
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#2196F3';  // Blue color for nodes
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw label
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(region.label, x, y);
        });

        // Draw edges
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        nodes.forEach((node1, label1) => {
            nodes.forEach((node2, label2) => {
                if (label1 < label2 && this.areRegionsAdjacent(label1, label2)) {
                    ctx.moveTo(node1.x, node1.y);
                    ctx.lineTo(node2.x, node2.y);
                }
            });
        });
        ctx.stroke();
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
