class ChromaticVenn {
  constructor() {
    this.vennCanvas = document.getElementById('vennCanvas');
    this.targetGraphCanvas = document.getElementById('targetGraphCanvas');
    this.currentGraphCanvas = document.getElementById('currentGraphCanvas');
    this.debugMode = false;

    this.ctx = this.vennCanvas.getContext('2d');
    this.targetCtx = this.targetGraphCanvas.getContext('2d');
    this.currentCtx = this.currentGraphCanvas.getContext('2d');

    this.circles = [];
    this.dragging = null;
    this.scaling = false;
    this.dragOffset = { x: 0, y: 0 };

    this.init();
  }

  init() {
    this.setCanvasSizes();
    this.createCircles();
    this.attachEvents();
    this.generateTargetGraph();
    this.draw();
  }

  setCanvasSizes() {
    [this.vennCanvas, this.targetGraphCanvas, this.currentGraphCanvas].forEach(canvas => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
  }

  createCircles() {
    const w = this.vennCanvas.width;
    const h = this.vennCanvas.height;
    const r = Math.min(w, h) / 4;
    const offset = r * 0.7;

    this.circles = [
      { x: w / 2, y: h / 2 - offset, r, label: 'A' },
      { x: w / 2 + offset * Math.cos(Math.PI / 6), y: h / 2 + offset * Math.sin(Math.PI / 6), r, label: 'B' },
      { x: w / 2 - offset * Math.cos(Math.PI / 6), y: h / 2 + offset * Math.sin(Math.PI / 6), r, label: 'C' }
    ];
  }

  attachEvents() {
    const canvas = this.vennCanvas;

    canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    canvas.addEventListener('mouseup', () => this.handleMouseUp());
    canvas.addEventListener('mouseleave', () => this.handleMouseUp());

    canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    canvas.addEventListener('touchend', () => this.handleTouchEnd());

    document.getElementById('resetButton').addEventListener('click', () => this.resetGame());
    document.getElementById('debugToggle').addEventListener('change', (e) => {
      this.debugMode = e.target.checked;
      this.draw();
    });

    window.addEventListener('resize', () => {
      this.setCanvasSizes();
      this.draw();
    });
  }

  resetGame() {
    this.createCircles();
    this.generateTargetGraph();
    this.draw();
    document.getElementById('winMessage').classList.add('hidden');
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
    for (const circle of this.circles) {
      const dx = pos.x - circle.x;
      const dy = pos.y - circle.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(dist - circle.r) < 10) {
        this.dragging = circle;
        this.scaling = true;
        return;
      } else if (dist < circle.r) {
        this.dragging = circle;
        this.scaling = false;
        this.dragOffset = { x: pos.x - circle.x, y: pos.y - circle.y };
        return;
      }
    }
  }

  handleMouseMove(e) {
    if (!this.dragging) return;
    const pos = this.getMousePos(e);

    if (this.scaling) {
      const dx = pos.x - this.dragging.x;
      const dy = pos.y - this.dragging.y;
      this.dragging.r = Math.max(10, Math.sqrt(dx * dx + dy * dy));
    } else {
      this.dragging.x = pos.x - this.dragOffset.x;
      this.dragging.y = pos.y - this.dragOffset.y;
    }

    this.draw();
  }

  handleMouseUp() {
    this.dragging = null;
    this.scaling = false;
  }

  handleTouchStart(e) {
    e.preventDefault();
    this.handleMouseDown(e.touches[0]);
  }

  handleTouchMove(e) {
    e.preventDefault();
    this.handleMouseMove(e.touches[0]);
  }

  handleTouchEnd() {
    this.handleMouseUp();
  }

  pointInCircle(p, circle) {
    const dx = p.x - circle.x;
    const dy = p.y - circle.y;
    return dx * dx + dy * dy <= circle.r * circle.r;
  }

  regionExists(label, regions) {
    return regions.some(r => r.label === label);
  }
  getRegions() {
    const [A, B, C] = this.circles;

    const regionLabels = ['a', 'b', 'c', 'ab', 'bc', 'ac', 'abc'];
    const regions = [];

    const grid = this.generateGridPoints(5);
    for (const point of grid) {
      const inA = this.pointInCircle(point, A);
      const inB = this.pointInCircle(point, B);
      const inC = this.pointInCircle(point, C);

      let label = '';
      if (inA && !inB && !inC) label = 'a';
      else if (!inA && inB && !inC) label = 'b';
      else if (!inA && !inB && inC) label = 'c';
      else if (inA && inB && !inC) label = 'ab';
      else if (!inA && inB && inC) label = 'bc';
      else if (inA && !inB && inC) label = 'ac';
      else if (inA && inB && inC) label = 'abc';

      if (label) {
        const existing = regions.find(r => r.label === label);
        if (existing) {
          existing.points.push(point);
        } else {
          regions.push({ label, points: [point] });
        }
      }
    }

    // Calculate center point for label placement
    regions.forEach(region => {
      const sum = region.points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
      const count = region.points.length;
      region.center = { x: sum.x / count, y: sum.y / count };
    });

    return regions.filter(r => r.points.length > 10);
  }

  generateGridPoints(step = 10) {
    const points = [];
    const w = this.vennCanvas.width;
    const h = this.vennCanvas.height;
    for (let x = 0; x <= w; x += step) {
      for (let y = 0; y <= h; y += step) {
        points.push({ x, y });
      }
    }
    return points;
  }

  getAdjacencyGraph(regions) {
    const adjacency = {};
    for (const r1 of regions) {
      adjacency[r1.label] = new Set();
      for (const r2 of regions) {
        if (r1 === r2) continue;
        if (this.areRegionsTouching(r1, r2)) {
          adjacency[r1.label].add(r2.label);
        }
      }
    }
    return adjacency;
  }

  areRegionsTouching(r1, r2) {
    for (const p1 of r1.points) {
      for (const p2 of r2.points) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        if (dx * dx + dy * dy < 400) return true;
      }
    }
    return false;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.vennCanvas.width, this.vennCanvas.height);
    this.currentCtx.clearRect(0, 0, this.currentGraphCanvas.width, this.currentGraphCanvas.height);
    this.targetCtx.clearRect(0, 0, this.targetGraphCanvas.width, this.targetGraphCanvas.height);

    for (const circle of this.circles) {
      this.ctx.beginPath();
      this.ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
      this.ctx.fill();
    }

    const regions = this.getRegions();

    for (const region of regions) {
      this.ctx.fillStyle = 'black';
      this.ctx.font = '16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(region.label, region.center.x, region.center.y);
    }

    this.drawGraph(this.currentCtx, this.getAdjacencyGraph(regions), this.currentGraphCanvas);

    if (this.targetGraph) {
      this.drawGraph(this.targetCtx, this.targetGraph, this.targetGraphCanvas);
    }

    this.checkWin(regions);
  }

  drawGraph(ctx, graph, canvas) {
    const labels = Object.keys(graph);
    const positions = {};
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.35;

    labels.forEach((label, i) => {
      const angle = (i * 2 * Math.PI) / labels.length;
      positions[label] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    for (const from of labels) {
      for (const to of graph[from]) {
        ctx.beginPath();
        ctx.moveTo(positions[from].x, positions[from].y);
        ctx.lineTo(positions[to].x, positions[to].y);
        ctx.stroke();
      }
    }

    for (const label of labels) {
      const pos = positions[label];
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 16, 0, 2 * Math.PI);
      ctx.fillStyle = '#1a73e8';
      ctx.fill();
      ctx.strokeStyle = 'black';
      ctx.stroke();

      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, pos.x, pos.y);
    }
  }

  generateTargetGraph() {
    const mockCircles = this.createMockRandomCircles();
    const mockRegions = this.getRegionsFromCircles(mockCircles);
    this.targetGraph = this.getAdjacencyGraph(mockRegions);
  }

  createMockRandomCircles() {
    const w = this.vennCanvas.width;
    const h = this.vennCanvas.height;
    const r = Math.min(w, h) / 4;
    const offset = r * 0.7;
    return [
      { x: w / 2, y: h / 2 - offset, r, label: 'A' },
      { x: w / 2 + offset * Math.cos(Math.PI / 6), y: h / 2 + offset * Math.sin(Math.PI / 6), r, label: 'B' },
      { x: w / 2 - offset * Math.cos(Math.PI / 6), y: h / 2 + offset * Math.sin(Math.PI / 6), r, label: 'C' }
    ];
  }

  getRegionsFromCircles(circles) {
    const backup = this.circles;
    this.circles = circles;
    const result = this.getRegions();
    this.circles = backup;
    return result;
  }

  checkWin(currentRegions) {
    const currentGraph = this.getAdjacencyGraph(currentRegions);
    const tKeys = Object.keys(this.targetGraph).sort();
    const cKeys = Object.keys(currentGraph).sort();
    if (tKeys.length !== cKeys.length) return;
    for (let i = 0; i < tKeys.length; i++) {
      if (tKeys[i] !== cKeys[i]) return;
      const tgSet = [...this.targetGraph[tKeys[i]]].sort();
      const cgSet = [...currentGraph[cKeys[i]]].sort();
      if (tgSet.length !== cgSet.length) return;
      for (let j = 0; j < tgSet.length; j++) {
        if (tgSet[j] !== cgSet[j]) return;
      }
    }
    document.getElementById('winMessage').classList.remove('hidden');
  }
}

window.addEventListener('load', () => new ChromaticVenn());
