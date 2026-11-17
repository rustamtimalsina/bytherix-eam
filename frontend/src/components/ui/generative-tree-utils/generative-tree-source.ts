export const generativeTreeSource = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Generative Tree</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body, html { width: 100%; height: 100%; overflow: hidden; background: #0a0a0a; }
  canvas { display: block; width: 100%; height: 100%; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
(function() {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  let GROWTH_SPEED_BASE = 0.006;
  const HOLD_DURATION = 400;
  const PARTICLE_COUNT = 50;
  const _pad = parseFloat(new URLSearchParams(location.search).get('p')) || 1;

  let branches = [];
  let particles = [];
  let holdTimer = 0;
  let fadeTimer = 0;
  let waitTimer = 0;
  let treeAlpha = 1;

  class Branch {
    constructor(x, y, length, angle, depth, maxDepth) {
      this.x = x;
      this.y = y;
      this.length = length;
      this.angle = angle;
      this.depth = depth;
      this.maxDepth = maxDepth;
      this.growthProgress = 0;
      this.growthSpeed = GROWTH_SPEED_BASE * (1.1 - depth * 0.08);
      this.children = [];
      this.spawned = false;
      this.thickness = Math.max(1, (maxDepth - depth) * 1.6);
    }

    update() {
      if (this.growthProgress < 1) {
        const b = this;
        b.growthProgress = Math.min(1, b.growthProgress + b.growthSpeed);
      } else if (!this.spawned && this.depth < this.maxDepth) {
        this.spawnChildren();
      }

      for (let i = 0; i < this.children.length; i++) {
        this.children[i].update();
      }
    }

    spawnChildren() {
      this.spawned = true;
      const count = this.depth === 0 ? 3 : (Math.random() < 0.25 ? 3 : 2);
      const endX = this.x + Math.cos(this.angle) * this.length;
      const endY = this.y + Math.sin(this.angle) * this.length;

      for (let i = 0; i < count; i++) {
        const spread = 0.45 + (Math.random() - 0.5) * 0.25;
        const subAngle = this.angle + (i === 0 ? -spread : i === 1 ? spread : (Math.random() - 0.5) * 0.3);
        const subLength = this.length * (0.72 + Math.random() * 0.14);
        this.children.push(new Branch(endX, endY, subLength, subAngle, this.depth + 1, this.maxDepth));
      }
    }

    draw(globalAlpha) {
      const curLength = this.length * this.growthProgress;
      const endX = this.x + Math.cos(this.angle) * curLength;
      const endY = this.y + Math.sin(this.angle) * curLength;

      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(endX, endY);

      // Color Palette: Deep warm wood grading into ethereal glowing blossoms
      const isTip = this.depth >= this.maxDepth - 1;
      const alpha = globalAlpha * Math.min(1, this.growthProgress * 1.5);

      if (isTip) {
        ctx.strokeStyle = "rgba(255, 180, 160, " + (alpha * 0.85) + ")";
        ctx.lineWidth = Math.max(1, this.thickness * 0.7);
      } else if (this.depth > 3) {
        ctx.strokeStyle = "rgba(220, 150, 120, " + (alpha * 0.75) + ")";
        ctx.lineWidth = this.thickness;
      } else {
        ctx.strokeStyle = "rgba(180, 120, 90, " + (alpha * 0.9) + ")";
        ctx.lineWidth = this.thickness;
      }

      ctx.lineCap = "round";
      ctx.stroke();

      // Delicate blossom/leaf petals at terminal tips
      if (isTip && this.growthProgress > 0.6) {
        const bloomSize = 2.5 * this.growthProgress;
        ctx.beginPath();
        ctx.arc(endX, endY, bloomSize, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 210, 200, " + (alpha * 0.7) + ")";
        ctx.fill();
      }

      for (let i = 0; i < this.children.length; i++) {
        this.children[i].draw(globalAlpha);
      }
    }

    isComplete() {
      if (this.growthProgress < 1) return false;
      for (let i = 0; i < this.children.length; i++) {
        if (!this.children[i].isComplete()) return false;
      }
      return true;
    }
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.3 - Math.random() * 0.5,
        radius: 0.8 + Math.random() * 1.8,
        alpha: Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function createTree() {
    branches = [];
    holdTimer = 0;
    fadeTimer = 0;
    waitTimer = 0;
    treeAlpha = 1;

    const baseLength = Math.min(W, H) * 0.22 * _pad;
    const trunk = new Branch(W / 2, H * 0.95, baseLength, -Math.PI / 2, 0, 7);
    branches.push(trunk);
    initParticles();
  }

  function frame(time) {
    // Decay shake
    ctx.clearRect(0, 0, W, H);

    // Update & draw tree branches
    let treeDone = true;
    for (let i = 0; i < branches.length; i++) {
      branches[i].update();
      branches[i].draw(treeAlpha);
      if (!branches[i].isComplete()) {
        treeDone = false;
      }
    }

    // Update & draw ambient drifting particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx + Math.sin(time * 0.001 + p.phase) * 0.25;
      p.y += p.vy;
      if (p.y < -10) p.y = H + 10;
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 230, 200, " + (p.alpha * treeAlpha) + ")";
      ctx.fill();
    }

    // Lifecycle: Growth -> Hold -> Fade -> Wait -> Regrow
    if (treeDone) {
      if (holdTimer < HOLD_DURATION) {
        holdTimer++;
      } else if (fadeTimer < 80) {
        fadeTimer++;
        treeAlpha = Math.max(0, 1 - fadeTimer / 80);
      } else if (waitTimer < 30) {
        waitTimer++;
      } else {
        createTree();
      }
    }

    requestAnimationFrame(frame);
  }

  createTree();
  requestAnimationFrame(frame);
})();
</script>
</body>
</html>`;
