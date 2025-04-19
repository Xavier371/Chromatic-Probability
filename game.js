// game.js — FINAL VERSION with region center of mass + real-time adjacency graph

class ChromaticVenn {
  constructor() {
    this.vennCanvas = document.getElementById("vennCanvas");
    this.targetGraphCanvas = document.getElementById("targetGraphCanvas");
    this.currentGraphCanvas = document.getElementById("currentGraphCanvas");

    this.ctx = this.vennCanvas.getContext("2d");
    this.targetCtx = this.targetGraphCanvas.getContext("2d");
    this.currentCtx = this.currentGraphCanvas.getContext("2d");

    this.gridStep = 5;
    this.circles = [];
    this.dragging = null;
    this.scaling = false;
    this.dragOffset = { x: 0, y: 0 };

    this.setup();
  }

  setup() {
    this.setCanvasSizes();
    this.createCircles();
    this.attachEvents();
    this.generateTargetGraph();
    this.draw();
  }

  setCanvasSizes() {
    [this.vennCanvas, this.targetGraphCanvas, this.currentGraphCanvas].forEach(
      (canvas) => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
    );
  }

  createCircles() {
    const w = this.vennCanvas.width;
    const h = this.vennCanvas.height;
    const r = Math.min(w, h) / 4;
    const offset = r * 0.7;

    this.circles = [
      { x: w / 2, y: h / 2 - offset, r, label: "A" },
      {
        x: w / 2 + offset * Math.cos(Math.PI / 6),
        y: h / 2 + offset * Math.sin(Math.PI / 6),
        r,
        label: "B",
      },
      {
        x: w / 2 - offset * Math.cos(Math.PI / 6),
        y: h / 2 + offset * Math.sin(Math.PI / 6),
        r,
        label: "C",
      },
    ];
  }

  attachEvents() {
    const canvas = this.vennCanvas;
    canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    canvas.addEventListener("mouseup", () => this.handleMouseUp());
    canvas.addEventListener("mouseleave", () => this.handleMouseUp());
    canvas.addEventListener("touchstart", (e) => this.handleTouchStart(e));
    canvas.addEventListener("touchmove", (e) => this.handleTouchMove(e));
    canvas.addEventListener("touchend", () => this.handleTouchEnd());
    document.getElementById("resetButton").addEventListener("click", () => this.resetGame());
    window.addEventListener("resize", () => {
      this.setCanvasSizes();
      this.draw();
    });
  }

  resetGame() {
    this.createCircles();
    this.generateTargetGraph();
    document.getElementById("winMessage").classList.add("hidden");
    this.draw();
  }

  getMousePos(e) {
    const rect = this.vennCanvas.getBoundingClientRect();
    const scaleX = this.vennCanvas.width / rect.width;
    const scaleY = this.vennCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
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

  pointIn(circle, p) {
    return (p.x - circle.x) ** 2 + (p.y - circle.y) ** 2 <= circle.r ** 2;
  }

  getRegionPoints() {
    const [A, B, C] = this.circles;
    const regions = { a: [], b: [], c: [], ab: [], bc: [], ac: [], abc: [] };
    const w = this.vennCanvas.width;
    const h = this.vennCanvas.height;

    for (let x = 0; x < w; x += this.gridStep) {
      for (let y = 0; y < h; y += this.gridStep) {
        const p = { x, y };
        const inA = this.pointIn(A, p);
        const inB = this.pointIn(B, p);
        const inC = this.pointIn(C, p);

        if (inA && !inB && !inC) regions.a.push(p);
        else if (inB && !inA && !inC) regions.b.push(p);
        else if (inC && !inA && !inB) regions.c.push(p);
        else if (inA && inB && !inC) regions.ab.push(p);
        else if (inA && inC && !inB) regions.ac.push(p);
        else if (inB && inC && !inA) regions.bc.push(p);
        else if (inA && inB && inC) regions.abc.push(p);
      }
    }
    return regions;
  }

  getRegionCenter(points) {
    const total = points.reduce((sum, p) => {
      sum.x += p.x;
      sum.y += p.y;
      return sum;
    }, { x: 0, y: 0 });
    return {
      x: total.x / points.length,
      y: total.y / points.length
    };
  }

  areAdjacent(label1, label2, map) {
    const set1 = new Set(label1);
    const set2 = new Set(label2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    if (intersection.size >= 1 && (label1.length > 1 || label2.length > 1)) {
      return true;
    }

    const pts1 = map[label1];
    const pts2 = map[label2];
    for (const p1 of pts1) {
      for (const p2 of pts2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        if (dx * dx + dy * dy <= 25) return true;
      }
    }
    return false;
  }

  drawGraph(ctx, map, canvas) {
    const regions = Object.entries(map).filter(([_, pts]) => pts.length > 0);
    const names = regions.map(([label]) => label);
    const pos = {};
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) * 0.7;

    names.forEach((name, i) => {
      const angle = (i * 2 * Math.PI) / names.length;
      pos[name] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        if (this.areAdjacent(names[i], names[j], map)) {
          const p1 = pos[names[i]];
          const p2 = pos[names[j]];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    names.forEach((name) => {
      const p = pos[name];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, 2 * Math.PI);
      ctx.fillStyle = "#1a73e8";
      ctx.fill();
      ctx.strokeStyle = "black";
      ctx.stroke();
      ctx.fillStyle = "white";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name, p.x, p.y);
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.vennCanvas.width, this.vennCanvas.height);
    this.currentCtx.clearRect(0, 0, this.currentGraphCanvas.width, this.currentGraphCanvas.height);
    this.targetCtx.clearRect(0, 0, this.targetGraphCanvas.width, this.targetGraphCanvas.height);

    for (const c of this.circles) {
      this.ctx.beginPath();
      this.ctx.arc(c.x, c.y, c.r, 0, 2 * Math.PI);
      this.ctx.strokeStyle = "black";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    const map = this.getRegionPoints();
    for (const [label, pts] of Object.entries(map)) {
      if (pts.length === 0) continue;
      const center = this.getRegionCenter(pts);
      this.ctx.fillStyle = "black";
      this.ctx.font = "bold 16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(label, center.x, center.y);
    }

    this.drawGraph(this.currentCtx, map, this.currentGraphCanvas);
    this.drawGraph(this.targetCtx, this.targetGraph, this.targetGraphCanvas);
    this.checkWin(map);
  }

  generateTargetGraph() {
    const temp = this.circles.map(c => ({ ...c }));
    temp.forEach(c => {
      c.x += (Math.random() - 0.5) * 100;
      c.y += (Math.random() - 0.5) * 100;
    });
    const original = this.circles;
    this.circles = temp;
    this.targetGraph = this.getRegionPoints();
    this.circles = original;
  }

  checkWin(current) {
    const currentLabels = Object.keys(current).filter(k => current[k].length > 0).sort();
    const targetLabels = Object.keys(this.targetGraph).filter(k => this.targetGraph[k].length > 0).sort();
    if (currentLabels.length !== targetLabels.length) return;
    for (let i = 0; i < currentLabels.length; i++) {
      if (currentLabels[i] !== targetLabels[i]) return;
    }
    document.getElementById("winMessage").classList.remove("hidden");
  }
}

window.addEventListener("load", () => new ChromaticVenn());
