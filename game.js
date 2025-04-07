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

        // Generate target configuration first
        this.targetCircles = this.generateRandomConfiguration();

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
        } while (this.areConfigurationsSimilar(this.circles, this.targetCircles));

        // Reset current circles to perfect overlap
        this.initializeDefaultCircles();

        // Reset win state
        document.getElementById('winMessage').classList.add('hidden');
        this.draw();
    }

    generateRandomConfiguration() {
        const centerX = this.targetGraphCanvas.width / 2;
        const centerY = this.targetGraphCanvas.height / 2;
        const baseRadius = Math.min(this.targetGraphCanvas.width, this.targetGraphCanvas.height) / 5;
        
        // Tighter constraints for better overlap
        const minOffset = baseRadius * 0.6;
        const maxOffset = baseRadius * 0.8;
        const minRadius = baseRadius * 0.9;
        const maxRadius = baseRadius * 1.1;

        // Generate three angles with controlled randomness
        const baseAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
        const angles = baseAngles.map(angle => angle + (Math.random() - 0.5) * Math.PI / 6);

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
        
        // Check for scaling first
        this.selectedCircle = this.circles.find(circle => {
            const distToCenter = Math.hypot(mousePos.x - circle.x, mousePos.y - circle.y);
            return Math.abs(distToCenter - circle.radius) < 20;
        });

        if (this.selectedCircle) {
            this.isScaling = true;
            return;
        }

        // Check for dragging
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
            this.selectedCircle.x = Math.max(this.selectedCircle.radius, 
                Math.min(this.vennCanvas.width - this.selectedCircle.radius, 
                this.selectedCircle.x + dx));
            this.selectedCircle.y = Math.max(this.selectedCircle.radius, 
                Math.min(this.vennCanvas.height - this.selectedCircle.radius, 
                this.selectedCircle.y + dy));
        } else if (this.isScaling) {
            const distToCenter = Math.hypot(mousePos.x - this.selectedCircle.x, 
                mousePos.y - this.selectedCircle.y);
            const minRadius = Math.min(this.vennCanvas.width, this.vennCanvas.height) / 8;
            const maxRadius = Math.min(this.vennCanvas.width, this.vennCanvas.height) / 3;
            this.selectedCircle.radius = Math.max(minRadius, 
                Math.min(maxRadius, distToCenter));
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
        calculateRegionCenter(circles, region) {
        const [c1, c2, c3] = circles;
        
        // Helper function to check circle overlap
        const doCirclesOverlap = (circle1, circle2) => {
            const dx = circle2.x - circle1.x;
            const dy = circle2.y - circle1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < (circle1.radius + circle2.radius);
        };

        // For single regions
        if (region.length === 1) {
            const circle = circles.find(c => c.label === region);
            const otherCircles = circles.filter(c => c.label !== region);
            
            if (!otherCircles.some(other => doCirclesOverlap(circle, other))) {
                return { x: circle.x, y: circle.y };
            }
            
            // Adjust center away from overlaps
            let centerX = circle.x;
            let centerY = circle.y;
            otherCircles.forEach(other => {
                if (doCirclesOverlap(circle, other)) {
                    const angle = Math.atan2(circle.y - other.y, circle.x - other.x);
                    const push = circle.radius * 0.3;
                    centerX += Math.cos(angle) * push;
                    centerY += Math.sin(angle) * push;
                }
            });
            return { x: centerX, y: centerY };
        }

        // For double intersections (AB, BC, AC)
        if (region.length === 2) {
            const [label1, label2] = region.split('');
            const circle1 = circles.find(c => c.label === label1);
            const circle2 = circles.find(c => c.label === label2);
            
            if (doCirclesOverlap(circle1, circle2)) {
                const midX = (circle1.x + circle2.x) / 2;
                const midY = (circle1.y + circle2.y) / 2;
                
                // Adjust away from the third circle
                const otherCircle = circles.find(c => !region.includes(c.label));
                if (doCirclesOverlap(circle1, otherCircle) && doCirclesOverlap(circle2, otherCircle)) {
                    const angle = Math.atan2(midY - otherCircle.y, midX - otherCircle.x);
                    const push = Math.min(circle1.radius, circle2.radius) * 0.2;
                    return {
                        x: midX + Math.cos(angle) * push,
                        y: midY + Math.sin(angle) * push
                    };
                }
                return { x: midX, y: midY };
            }
        }

        // For triple intersection (ABC)
        if (region.length === 3) {
            return {
                x: (c1.x + c2.x + c3.x) / 3,
                y: (c1.y + c2.y + c3.y) / 3
            };
        }

        return null;
    }

    getRegions(circles) {
        if (!circles || circles.length !== 3) return [];
        
        const regions = [];
        const [c1, c2, c3] = circles;
        
        // Helper function to check circle overlap
        const doCirclesOverlap = (circle1, circle2) => {
            const dx = circle2.x - circle1.x;
            const dy = circle2.y - circle1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < (circle1.radius + circle2.radius);
        };

        // Add single regions
        ['A', 'B', 'C'].forEach(label => {
            const center = this.calculateRegionCenter(circles, label);
            if (center) {
                regions.push({ label, center });
            }
        });

        // Add double intersections
        if (doCirclesOverlap(c1, c2)) {
            const center = this.calculateRegionCenter(circles, 'AB');
            if (center) regions.push({ label: 'AB', center });
        }
        if (doCirclesOverlap(c2, c3)) {
            const center = this.calculateRegionCenter(circles, 'BC');
            if (center) regions.push({ label: 'BC', center });
        }
        if (doCirclesOverlap(c1, c3)) {
            const center = this.calculateRegionCenter(circles, 'AC');
            if (center) regions.push({ label: 'AC', center });
        }

        // Add triple intersection
        if (doCirclesOverlap(c1, c2) && doCirclesOverlap(c2, c3) && doCirclesOverlap(c1, c3)) {
            const center = this.calculateRegionCenter(circles, 'ABC');
            if (center) regions.push({ label: 'ABC', center });
        }

        return regions;
    }

    drawCircle(ctx, circle) {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
        drawGraph(ctx, circles) {
        if (!circles) return;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        const regions = this.getRegions(circles);
        const nodeRadius = 20;
        
        // Calculate layout
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const layoutRadius = Math.min(ctx.canvas.width, ctx.canvas.height) / 3;
        
        const nodePositions = new Map();
        
        // Position single nodes in triangle
        const singleNodes = regions.filter(r => r.label.length === 1);
        singleNodes.forEach((region, i) => {
            const angle = (i * 2 * Math.PI / 3) - Math.PI / 2;
            nodePositions.set(region.label, {
                x: centerX + layoutRadius * Math.cos(angle),
                y: centerY + layoutRadius * Math.sin(angle)
            });
        });
        
        // Position intersection nodes
        regions.filter(r => r.label.length > 1).forEach(region => {
            const center = this.calculateRegionCenter(circles, region.label);
            if (center) {
                const x = centerX + (center.x - circles[0].x) * 0.5;
                const y = centerY + (center.y - circles[0].y) * 0.5;
                nodePositions.set(region.label, { x, y });
            }
        });

        // Draw edges
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        
        nodePositions.forEach((pos1, label1) => {
            nodePositions.forEach((pos2, label2) => {
                if (label1 < label2 && this.areRegionsAdjacent(circles, label1, label2)) {
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
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, pos.x, pos.y);
        });
    }

    areRegionsAdjacent(circles, label1, label2) {
        // Check physical overlap for single-letter regions
        if (label1.length === 1 && label2.length === 1) {
            const circle1 = circles.find(c => c.label === label1);
            const circle2 = circles.find(c => c.label === label2);
            const dx = circle2.x - circle1.x;
            const dy = circle2.y - circle1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < (circle1.radius + circle2.radius);
        }

        // For other cases, check if they differ by one character
        const set1 = new Set(label1.split(''));
        const set2 = new Set(label2.split(''));
        
        const diff = new Set([...set1, ...set2]);
        for (const char of set1) {
            if (set2.has(char)) diff.delete(char);
        }
        
        return diff.size === 1;
    }

    draw() {
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
