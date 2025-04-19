// game.js — Updated with strict region definitions + improved label centering

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

    document
      .getElementById("resetButton")
      .addEventListener("click", () => this.resetGame());
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
    return (
      (p.x - circle.x) ** 2 + (p.y - circle.y) ** 2 <= circle.r ** 2
    );
  }

  getRegionPoints() {
    const [A, B, C] = this.circles;
    const regions = { a: [], b: [], c: [], ab: [], ac: [], bc: [], abc: [] };

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

  drawGraph(ctx, regionMap, canvas) {
    const regionNames = Object.keys(regionMap).filter((k) => regionMap[k].length > 0);
    const positions = {};
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) * 0.7;

    regionNames.forEach((label, i) => {
      const angle = (i * 2 * Math.PI) / regionNames.length;
      positions[label] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    for (let i = 0; i < regionNames.length; i++) {
      for (let j = i + 1; j < regionNames.length; j++) {
        const a = regionNames[i];
        const b = regionNames[j];
        if (this.areRegionsAdjacent(a, b, regionMap)) {
          const p1 = positions[a];
          const p2 = positions[b];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    regionNames.forEach((label) => {
      const p = positions[label];
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
      ctx.fillText(label, p.x, p.y);
    });
  }

  areRegionsAdjacent(r1, r2, regionMap) {
    const pts1 = regionMap[r1];
    const pts2 = regionMap[r2];
    const set1 = new Set(r1);
    const set2 = new Set(r2);

    if ([...set1].some((l) => set2.has(l))) return true;

    for (const p1 of pts1) {
      for (const p2 of pts2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        if (dx * dx + dy * dy < 25) return true;
      }
    }
    return false;
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

    const regionMap = this.getRegionPoints();
    for (const [label, pts] of Object.entries(regionMap)) {
      if (pts.length === 0) continue;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      pts.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
      const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

      this.ctx.fillStyle = "black";
      this.ctx.font = "bold 16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(label, center.x, center.y);
    }

    this.drawGraph(this.currentCtx, regionMap, this.currentGraphCanvas);
    this.drawGraph(this.targetCtx, this.targetGraph, this.targetGraphCanvas);
    this.checkWin(regionMap);
  }

  generateTargetGraph() {
    const temp = this.circles.map((c) => ({ ...c }));
    temp.forEach((c) => {
      c.x += (Math.random() - 0.5) * 100;
      c.y += (Math.random() - 0.5) * 100;
    });
    const original = this.circles;
    this.circles = temp;
    this.targetGraph = this.getRegionPoints();
    this.circles = original;
  }

  checkWin(current) {
    const currentKeys = Object.keys(current).filter((k) => current[k].length > 0).sort();
    const targetKeys = Object.keys(this.targetGraph).filter((k) => this.targetGraph[k].length > 0).sort();
    if (currentKeys.length !== targetKeys.length) return;
    for (let i = 0; i < currentKeys.length; i++) {
      if (currentKeys[i] !== targetKeys[i]) return;
    }
    document.getElementById("winMessage").classList.remove("hidden");
  }
}

window.addEventListener("load", () => new ChromaticVenn());
