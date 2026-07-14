const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const compactVisuals = matchMedia("(max-width: 900px), (pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4;
const dprLimit = compactVisuals ? 1.35 : 1.8;

// Cursor and magnetic details
const cursor = $(".cursor");
let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
if (finePointer) addEventListener("pointermove", (event) => {
  mx = event.clientX; my = event.clientY;
  if (reducedMotion) cursor.style.transform = `translate(${mx - 17}px, ${my - 17}px)`;
});
function animateCursor() {
  cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18;
  cursor.style.transform = `translate(${cx - 17}px, ${cy - 17}px)`;
  requestAnimationFrame(animateCursor);
}
if (finePointer && !reducedMotion) animateCursor();
$$('a, button').forEach((el) => {
  el.addEventListener("pointerenter", () => cursor.classList.add("is-active"));
  el.addEventListener("pointerleave", () => cursor.classList.remove("is-active"));
});

// Menu
const menuButton = $(".menu-toggle");
const menu = $(".menu");
function setMenu(open) {
  menuButton.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-hidden", String(!open));
  menu.inert = !open;
  menu.classList.toggle("is-open", open);
  document.body.style.overflow = open ? "hidden" : "";
}
menuButton.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
$$('.menu a').forEach((link) => link.addEventListener("click", () => setMenu(false)));
addEventListener("keydown", (event) => event.key === "Escape" && setMenu(false));

// Reveal and split-title typography
$$('.split-title').forEach((title) => {
  const nodes = [...title.childNodes];
  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const span = document.createElement("span"); span.textContent = node.textContent; span.className = "reveal"; node.replaceWith(span);
    }
  });
});
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible"));
}, { threshold: 0.15, rootMargin: "0px 0px -7%" });
$$('.reveal').forEach((el, index) => { el.style.transitionDelay = `${(index % 4) * 70}ms`; observer.observe(el); });

function fitCanvas(canvas, context) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio, dprLimit);
  canvas.width = Math.max(1, rect.width * dpr); canvas.height = Math.max(1, rect.height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return rect;
}

// A single cloud of particles carries the history from one idea to the next.
const historyCanvas = $("#history-visual");
const historyCtx = historyCanvas.getContext("2d");
const storySteps = $$(".story-step");
const visualScene = $(".visual-scene");
const visualEpoch = $(".visual-epoch");
const storyProgress = $(".story-progress i");
let historySize, historyCount = 0, historyScene = 0, historyNeedsClear = true;
let historyX, historyY, historyVX, historyVY, historyTX, historyTY, historySeed;

const fract = (value) => value - Math.floor(value);
const seeded = (index, salt = 0) => fract(Math.sin(index * 127.1 + salt * 311.7) * 43758.5453);

function rectanglePoint(progress, halfWidth, halfHeight) {
  const p = (progress % 1) * 4;
  if (p < 1) return [-halfWidth + p * halfWidth * 2, -halfHeight];
  if (p < 2) return [halfWidth, -halfHeight + (p - 1) * halfHeight * 2];
  if (p < 3) return [halfWidth - (p - 2) * halfWidth * 2, halfHeight];
  return [-halfWidth, halfHeight - (p - 3) * halfHeight * 2];
}

function updateHistoryTargets(scene) {
  if (!historySize || !historyTX) return;
  const width = historySize.width, height = historySize.height;
  const centerX = width * .5, centerY = height * .5;
  const unit = Math.min(width, height);

  for (let i = 0; i < historyCount; i++) {
    const r1 = seeded(i, 1), r2 = seeded(i, 2), r3 = seeded(i, 3);
    let x = centerX, y = centerY;

    if (scene === 0) {
      if (r1 < .38) {
        x = r2 * width;
        y = r3 * height * .72;
      } else {
        const rise = r2;
        const spread = (1 - rise) * unit * .18;
        x = centerX + (r3 - .5) * spread + Math.sin(rise * 13 + r1 * 8) * unit * .025;
        y = height * .76 - rise * height * .48;
      }
    } else if (scene === 1) {
      const group = i % 3;
      const angle = r1 * Math.PI * 2;
      const radius = unit * (.12 + r2 * .07);
      x = centerX + (group - 1) * unit * .28 + Math.cos(angle) * radius;
      y = centerY + Math.sin(angle) * radius * .82;
    } else if (scene === 2) {
      if (r1 < .13) {
        const angle = r2 * Math.PI * 2, radius = unit * (.025 + r3 * .035);
        x = centerX + Math.cos(angle) * radius;
        y = centerY + unit * .28 + Math.sin(angle) * radius;
      } else {
        const t = (i / historyCount) * Math.PI * 1.72 - Math.PI * .86;
        const thickness = (r2 - .5) * unit * .055;
        x = centerX + Math.sin(t) * unit * .22 + Math.cos(t) * thickness;
        y = centerY - unit * .2 - Math.cos(t) * unit * .2 + Math.sin(t) * thickness;
        if (t > Math.PI * .5) {
          const tail = (t - Math.PI * .5) / (Math.PI * .36);
          x = centerX + unit * .12 * (1 - Math.min(1, tail));
          y = centerY + unit * (-.02 + Math.min(1, tail) * .2);
        }
      }
    } else if (scene === 3) {
      if (r1 < .72) {
        const level = i % 8;
        const scale = .17 + level * .095;
        const [px, py] = rectanglePoint(r2, unit * scale, unit * scale * .68);
        x = centerX + px; y = centerY + py;
      } else {
        const angle = r2 * Math.PI * 2;
        const radius = Math.sqrt(r3) * unit * .12;
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
      }
    } else if (scene === 4) {
      if (r1 < .7) {
        const ring = 1 + (i % 5);
        const angle = r2 * Math.PI * 2;
        const radius = unit * ring * .065;
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
      } else {
        const angle = Math.round(r2 * 11) / 11 * Math.PI * 2;
        const radius = unit * (.05 + r3 * .36);
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
      }
    } else if (scene === 5) {
      const vertical = i % 2 === 0;
      if (vertical) {
        x = width * (.15 + (i % 17) / 16 * .7);
        y = height * (.16 + r2 * .68);
      } else {
        x = width * (.15 + r2 * .7);
        y = height * (.16 + (i % 13) / 12 * .68);
      }
      const distance = Math.hypot(x - centerX, y - centerY) || 1;
      const bend = Math.exp(-distance / (unit * .24)) * unit * .1;
      x += (y - centerY) / distance * bend;
      y -= (x - centerX) / distance * bend;
    } else if (scene === 6) {
      const group = i % 9;
      const column = group % 3, row = Math.floor(group / 3);
      const groupX = centerX + (column - 1) * unit * .25;
      const groupY = centerY + (row - 1) * unit * .22;
      const angle = r2 * Math.PI * 2;
      const radius = Math.sqrt(r3) * unit * (.055 + group * .002);
      x = groupX + Math.cos(angle) * radius;
      y = groupY + Math.sin(angle) * radius;
    } else {
      const turns = r1 * Math.PI * 9;
      const radius = r1 * unit * .38;
      x = centerX + Math.cos(turns) * radius;
      y = centerY + Math.sin(turns) * radius * .68;
      if (i % 7 === 0) {
        x = r2 * width;
        y = r3 * height;
      }
    }

    historyTX[i] = x;
    historyTY[i] = y;
    if (reducedMotion && historyX) {
      historyX[i] = x; historyY[i] = y;
      historyVX[i] = 0; historyVY[i] = 0;
    }
  }
}

function resetHistory() {
  const previous = historySize;
  historySize = fitCanvas(historyCanvas, historyCtx);
  const nextCount = compactVisuals ? 620 : 1150;
  if (nextCount !== historyCount || !historyX) {
    historyCount = nextCount;
    historyX = new Float32Array(historyCount); historyY = new Float32Array(historyCount);
    historyVX = new Float32Array(historyCount); historyVY = new Float32Array(historyCount);
    historyTX = new Float32Array(historyCount); historyTY = new Float32Array(historyCount);
    historySeed = new Float32Array(historyCount);
    for (let i = 0; i < historyCount; i++) {
      historyX[i] = seeded(i, 7) * historySize.width;
      historyY[i] = seeded(i, 8) * historySize.height;
      historySeed[i] = seeded(i, 9);
    }
  } else if (previous?.width && previous?.height) {
    const scaleX = historySize.width / previous.width, scaleY = historySize.height / previous.height;
    for (let i = 0; i < historyCount; i++) { historyX[i] *= scaleX; historyY[i] *= scaleY; }
  }
  updateHistoryTargets(historyScene);
  historyNeedsClear = true;
}

function drawHistoryBackdrop(time) {
  const width = historySize.width, height = historySize.height, unit = Math.min(width, height);
  historyCtx.save();
  historyCtx.translate(width / 2, height / 2);
  historyCtx.strokeStyle = "rgba(236,235,229,.085)";
  historyCtx.lineWidth = 1;

  if (historyScene === 1 || historyScene === 4) {
    const rings = historyScene === 1 ? 3 : 6;
    for (let ring = 1; ring <= rings; ring++) {
      historyCtx.beginPath(); historyCtx.arc(0, 0, unit * ring * .065, 0, Math.PI * 2); historyCtx.stroke();
    }
  } else if (historyScene === 3) {
    for (let level = 1; level <= 7; level++) {
      const size = unit * level * .055;
      historyCtx.strokeRect(-size, -size * .66, size * 2, size * 1.32);
    }
  } else if (historyScene === 5) {
    for (let line = -7; line <= 7; line++) {
      const offset = line * unit * .05;
      historyCtx.beginPath(); historyCtx.moveTo(offset, -unit * .38); historyCtx.lineTo(offset, unit * .38); historyCtx.stroke();
      historyCtx.beginPath(); historyCtx.moveTo(-unit * .38, offset); historyCtx.lineTo(unit * .38, offset); historyCtx.stroke();
    }
  } else if (historyScene === 7) {
    historyCtx.rotate(time * .000025);
    for (let ring = 1; ring <= 3; ring++) {
      historyCtx.beginPath(); historyCtx.ellipse(0, 0, unit * ring * .12, unit * ring * .075, ring * .7, 0, Math.PI * 2); historyCtx.stroke();
    }
  }
  historyCtx.restore();
}

function drawHistory(time = 0) {
  if (!historySize) return;
  historyCtx.fillStyle = historyNeedsClear || reducedMotion ? "#050505" : "rgba(5,5,5,.3)";
  historyCtx.fillRect(0, 0, historySize.width, historySize.height);
  historyNeedsClear = false;
  drawHistoryBackdrop(time);

  historyCtx.beginPath();
  for (let i = 0; i < historyCount; i += 13) {
    historyCtx.moveTo(historyX[i], historyY[i]);
    historyCtx.lineTo(historyX[i] - historyVX[i] * 5, historyY[i] - historyVY[i] * 5);
  }
  historyCtx.strokeStyle = "rgba(216,255,62,.16)"; historyCtx.stroke();

  historyCtx.fillStyle = "rgba(238,237,231,.78)";
  for (let i = 0; i < historyCount; i++) {
    const driftX = reducedMotion ? 0 : Math.sin(time * .00045 + historySeed[i] * 15) * .045;
    const driftY = reducedMotion ? 0 : Math.cos(time * .00038 + historySeed[i] * 11) * .045;
    historyVX[i] = (historyVX[i] + (historyTX[i] - historyX[i]) * .014 + driftX) * .91;
    historyVY[i] = (historyVY[i] + (historyTY[i] - historyY[i]) * .014 + driftY) * .91;
    historyX[i] += historyVX[i]; historyY[i] += historyVY[i];
    const size = .55 + historySeed[i] * 1.15;
    historyCtx.fillRect(historyX[i], historyY[i], size, size);
  }
  historyCtx.fillStyle = "rgba(216,255,62,.9)";
  for (let i = 0; i < historyCount; i += 29) historyCtx.fillRect(historyX[i], historyY[i], 1.6, 1.6);
}

function setHistoryScene(index) {
  if (index === historyScene && storySteps[index].classList.contains("is-active")) return;
  historyScene = index;
  storySteps.forEach((step, stepIndex) => step.classList.toggle("is-active", stepIndex === index));
  visualScene.textContent = storySteps[index].dataset.label;
  visualEpoch.textContent = storySteps[index].dataset.epoch;
  storyProgress.style.transform = `scaleY(${(index + 1) / storySteps.length})`;
  updateHistoryTargets(index);
  historyNeedsClear = true;
  if (reducedMotion && historySize) drawHistory(performance.now());
}

const storyStepObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) setHistoryScene(Number(entry.target.dataset.scene));
  });
}, { rootMargin: "-40% 0px -40% 0px", threshold: 0 });
storySteps.forEach((step) => storyStepObserver.observe(step));

// Generative cosmic hero — particles orbit a moving attractor.
const cosmicCanvas = $("#hero-cosmos");
const cosmicCtx = cosmicCanvas.getContext("2d");
let cosmicSize, cosmicParticles = [];
function resetCosmos() {
  cosmicSize = fitCanvas(cosmicCanvas, cosmicCtx);
  const count = Math.min(compactVisuals ? 760 : 1500, Math.floor(cosmicSize.width * cosmicSize.height / (compactVisuals ? 900 : 680)));
  cosmicParticles = Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), .62) * Math.min(cosmicSize.width, cosmicSize.height) * .48;
    return { angle, radius, speed: .00035 + Math.random() * .0011, size: Math.random() < .06 ? 1.3 : .55, drift: Math.random() * 10, alpha: .2 + Math.random() * .75, arm: i % 3 };
  });
}
function drawCosmos(time = 0) {
  if (!cosmicSize) return;
  cosmicCtx.clearRect(0, 0, cosmicSize.width, cosmicSize.height);
  const centerX = cosmicSize.width * (innerWidth < 780 ? .78 : .72);
  const centerY = cosmicSize.height * .46;
  cosmicParticles.forEach((p) => {
    if (!reducedMotion) p.angle += p.speed;
    const distortion = Math.sin(p.angle * 2 + p.drift + time * .0001) * p.radius * .09;
    const spiral = p.angle + p.radius * .007 + p.arm * 2.094;
    const x = centerX + Math.cos(spiral) * (p.radius + distortion) * 1.25;
    const y = centerY + Math.sin(spiral) * (p.radius + distortion) * .61;
    const pulse = .65 + Math.sin(time * .0015 + p.drift) * .25;
    cosmicCtx.fillStyle = `rgba(240,239,233,${p.alpha * pulse})`;
    cosmicCtx.fillRect(x, y, p.size, p.size);
  });
}

// Neural field, connected by proximity and gently influenced by the pointer.
const neuralCanvas = $("#neural");
const neuralCtx = neuralCanvas.getContext("2d");
let neuralSize, neurons = [], neuralMouse = { x: -999, y: -999 };
function resetNeural() {
  neuralSize = fitCanvas(neuralCanvas, neuralCtx);
  const count = Math.min(compactVisuals ? 64 : 105, Math.floor(neuralSize.width / (compactVisuals ? 12 : 11)));
  neurons = Array.from({ length: count }, () => ({ x: Math.random() * neuralSize.width, y: Math.random() * neuralSize.height, vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18, r: .7 + Math.random() * 1.5 }));
}
neuralCanvas.addEventListener("pointermove", (e) => { const r = neuralCanvas.getBoundingClientRect(); neuralMouse = { x: e.clientX-r.left, y: e.clientY-r.top }; });
neuralCanvas.addEventListener("pointerleave", () => neuralMouse = { x: -999, y: -999 });
function drawNeural() {
  if (!neuralSize) return;
  neuralCtx.clearRect(0, 0, neuralSize.width, neuralSize.height);
  neurons.forEach((n, i) => {
    if (!reducedMotion) { n.x += n.vx; n.y += n.vy; }
    if (n.x < 0 || n.x > neuralSize.width) n.vx *= -1;
    if (n.y < 0 || n.y > neuralSize.height) n.vy *= -1;
    const md = Math.hypot(n.x-neuralMouse.x,n.y-neuralMouse.y);
    if (md < 120 && !reducedMotion) { n.x += (n.x-neuralMouse.x) * .003; n.y += (n.y-neuralMouse.y) * .003; }
    for (let j=i+1; j<neurons.length; j++) {
      const o=neurons[j], d=Math.hypot(n.x-o.x,n.y-o.y);
      if (d<95) { neuralCtx.strokeStyle=`rgba(8,8,8,${(1-d/95)*.18})`; neuralCtx.beginPath(); neuralCtx.moveTo(n.x,n.y); neuralCtx.lineTo(o.x,o.y); neuralCtx.stroke(); }
    }
    neuralCtx.fillStyle="#101010"; neuralCtx.beginPath(); neuralCtx.arc(n.x,n.y,n.r,0,Math.PI*2); neuralCtx.fill();
  });
}

// Matter responds to touch: the visitor becomes the mass that bends the field.
const gravityWell = $(".gravity-well");
const gravityInstruction = $(".gravity-instruction");
gravityWell.addEventListener("pointermove", (event) => {
  const rect = gravityWell.getBoundingClientRect();
  const horizontal = (event.clientX - rect.left) / rect.width - .5;
  const vertical = (event.clientY - rect.top) / rect.height - .5;
  gravityWell.style.setProperty("--gravity-x", `${horizontal * 18}deg`);
  gravityWell.style.setProperty("--gravity-y", `${vertical * -12}deg`);
});
gravityWell.addEventListener("pointerleave", () => {
  gravityWell.style.setProperty("--gravity-x", "0deg");
  gravityWell.style.setProperty("--gravity-y", "0deg");
});
gravityWell.addEventListener("click", () => {
  const warped = gravityWell.classList.toggle("is-warped");
  gravityWell.setAttribute("aria-pressed", String(warped));
  gravityWell.setAttribute("aria-label", warped ? "Liberar la curvatura del espacio" : "Alterar la curvatura del espacio");
  gravityInstruction.textContent = warped ? "ESPACIO CURVADO" : "TOCA PARA CURVAR";
});

// Galaxy sphere in the cosmos chapter.
const galaxyCanvas = $("#galaxy");
const galaxyCtx = galaxyCanvas.getContext("2d");
let galaxySize, stars=[];
let galaxyAngleOffset = 0, galaxyAngleTarget = 0, galaxyTilt = 0, galaxyTiltTarget = 0;
function resetGalaxy() {
  galaxySize=fitCanvas(galaxyCanvas,galaxyCtx);
  const radius=Math.min(galaxySize.width,galaxySize.height)*.44;
  stars=Array.from({length:compactVisuals ? 850 : 1600},()=>{
    const u=Math.random(), v=Math.random(), theta=u*Math.PI*2, phi=Math.acos(2*v-1), r=radius*Math.cbrt(Math.random());
    return {x:r*Math.sin(phi)*Math.cos(theta),y:r*Math.cos(phi),z:r*Math.sin(phi)*Math.sin(theta),a:.18+Math.random()*.82,s:Math.random()<.025?1.7:.55};
  });
}
function drawGalaxy(time=0) {
  if (!galaxySize) return;
  galaxyCtx.clearRect(0,0,galaxySize.width,galaxySize.height);
  galaxyAngleOffset += (galaxyAngleTarget - galaxyAngleOffset) * .07;
  galaxyTilt += (galaxyTiltTarget - galaxyTilt) * .07;
  const angle=(reducedMotion ? .35 : time*.00004) + galaxyAngleOffset, ca=Math.cos(angle), sa=Math.sin(angle), ct=Math.cos(galaxyTilt), st=Math.sin(galaxyTilt), cx=galaxySize.width/2, cy=galaxySize.height/2;
  stars.forEach(p=>{ const x=p.x*ca-p.z*sa, firstZ=p.x*sa+p.z*ca, y=p.y*ct-firstZ*st, z=p.y*st+firstZ*ct; const scale=1+z/(Math.min(galaxySize.width,galaxySize.height)*1.5); galaxyCtx.fillStyle=`rgba(235,234,228,${p.a*Math.max(.15,scale)})`; galaxyCtx.fillRect(cx+x*scale,cy+y*scale,p.s,p.s); });
}
galaxyCanvas.addEventListener("pointermove", (event) => {
  const rect = galaxyCanvas.getBoundingClientRect();
  galaxyAngleTarget = ((event.clientX - rect.left) / rect.width - .5) * 1.35;
  galaxyTiltTarget = ((event.clientY - rect.top) / rect.height - .5) * .72;
});
galaxyCanvas.addEventListener("pointerleave", () => { galaxyAngleTarget = 0; galaxyTiltTarget = 0; });

// ASCII sculpture: cached 3D points projected into a character grid.
const asciiArt = $("#ascii-art");
const asciiTerminal = $(".ascii-terminal");
const shapeName = $(".shape-name");
const shapeCount = $(".shape-count");
const shapeButton = $(".shape-toggle");
const asciiRamp = " .,:;irsXA253hMHGS#9B&@";
const shapeNames = ["TOROIDE", "ESFERA", "HÉLICE"];
let shapeIndex = 0, shapePoints = [], asciiAngleX = -.32, asciiAngleY = .3;
let asciiTargetX = asciiAngleX, asciiTargetY = asciiAngleY, pointerInfluenceUntil = 0, lastAsciiFrame = 0;

function buildAsciiShape(index) {
  const points = [];
  const detail = compactVisuals ? 1.55 : 1;

  if (index === 0) {
    for (let a = 0; a < Math.PI * 2; a += .13 * detail) {
      for (let b = 0; b < Math.PI * 2; b += .09 * detail) {
        const ring = 1.25 + .52 * Math.cos(b);
        const light = Math.max(0, (Math.cos(b) * Math.cos(a) * .35 - Math.sin(b) * .7 + Math.cos(b) * Math.sin(a) * .45 + 1) / 2);
        points.push({ x: ring * Math.cos(a), y: .52 * Math.sin(b), z: ring * Math.sin(a), light });
      }
    }
  } else if (index === 1) {
    for (let latitude = -Math.PI / 2; latitude <= Math.PI / 2; latitude += .09 * detail) {
      for (let longitude = 0; longitude < Math.PI * 2; longitude += .1 * detail) {
        const c = Math.cos(latitude), x = 1.45 * c * Math.cos(longitude), y = 1.45 * Math.sin(latitude), z = 1.45 * c * Math.sin(longitude);
        const light = Math.max(0, (x * .3 - y * .55 + z * .45) / 1.45 * .5 + .5);
        points.push({ x, y, z, light });
      }
    }
  } else {
    for (let t = -Math.PI * 3; t <= Math.PI * 3; t += .045 * detail) {
      const y = t / (Math.PI * 3) * 1.75;
      for (const phase of [0, Math.PI]) {
        const angle = t + phase;
        points.push({ x: Math.cos(angle) * .82, y, z: Math.sin(angle) * .82, light: .58 + Math.sin(angle) * .28 });
      }
    }
    for (let t = -Math.PI * 3; t <= Math.PI * 3; t += .42 * detail) {
      const y = t / (Math.PI * 3) * 1.75, x = Math.cos(t) * .82, z = Math.sin(t) * .82;
      for (let bridge = -1; bridge <= 1; bridge += .12 * detail) {
        points.push({ x: x * bridge, y, z: z * bridge, light: .42 + Math.abs(bridge) * .35 });
      }
    }
  }
  shapePoints = points;
}

function drawAscii(time = 0) {
  if (!asciiArt || (!reducedMotion && time - lastAsciiFrame < 42)) return;
  lastAsciiFrame = time;
  const columns = compactVisuals ? 48 : 76;
  const rows = compactVisuals ? 27 : 39;
  const characters = new Array(columns * rows).fill(" ");
  const depthBuffer = new Float32Array(columns * rows);

  if (!reducedMotion && time > pointerInfluenceUntil) asciiTargetY += .008;
  asciiAngleX += (asciiTargetX - asciiAngleX) * .07;
  asciiAngleY += (asciiTargetY - asciiAngleY) * .07;
  const sinX = Math.sin(asciiAngleX), cosX = Math.cos(asciiAngleX), sinY = Math.sin(asciiAngleY), cosY = Math.cos(asciiAngleY);

  for (const point of shapePoints) {
    const rotatedY = point.y * cosX - point.z * sinX;
    const rotatedZ = point.y * sinX + point.z * cosX;
    const rotatedX2 = point.x * cosY + rotatedZ * sinY;
    const rotatedZ2 = -point.x * sinY + rotatedZ * cosY;
    const depth = rotatedZ2 + 4.3;
    const inverseDepth = 1 / depth;
    const projectionScale = [compactVisuals ? .5 : .54, .7, .62][shapeIndex];
    const projection = columns * projectionScale * inverseDepth;
    const x = Math.round(columns / 2 + rotatedX2 * projection);
    const y = Math.round(rows / 2 - rotatedY * projection * .52);
    if (x < 0 || x >= columns || y < 0 || y >= rows) continue;
    const bufferIndex = y * columns + x;
    if (inverseDepth <= depthBuffer[bufferIndex]) continue;
    depthBuffer[bufferIndex] = inverseDepth;
    const luminance = Math.min(1, Math.max(0, point.light * .78 + inverseDepth * .8));
    characters[bufferIndex] = asciiRamp[Math.floor(luminance * (asciiRamp.length - 1))];
  }

  const lines = [];
  for (let row = 0; row < rows; row++) lines.push(characters.slice(row * columns, (row + 1) * columns).join(""));
  asciiArt.textContent = lines.join("\n");
}

asciiTerminal.addEventListener("pointermove", (event) => {
  const rect = asciiTerminal.getBoundingClientRect();
  asciiTargetX = ((event.clientY - rect.top) / rect.height - .5) * 1.15;
  asciiTargetY = ((event.clientX - rect.left) / rect.width - .5) * 1.8;
  pointerInfluenceUntil = performance.now() + 1700;
});

function changeAsciiShape() {
  shapeIndex = (shapeIndex + 1) % shapeNames.length;
  buildAsciiShape(shapeIndex);
  shapeName.textContent = shapeNames[shapeIndex];
  shapeCount.textContent = `0${shapeIndex + 1} / 03`;
  asciiArt.setAttribute("aria-label", `Escultura tridimensional ASCII: ${shapeNames[shapeIndex].toLowerCase()}`);
  if (reducedMotion) drawAscii(performance.now());
}
shapeButton.addEventListener("click", changeAsciiShape);
addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "m" && asciiTerminal.getBoundingClientRect().top < innerHeight && asciiTerminal.getBoundingClientRect().bottom > 0) changeAsciiShape();
});

// Animation scheduler: visual engines run only while their section is visible.
const rendererStates = new Map([
  [historyCanvas, { draw: drawHistory, visible: false, running: false }],
  [cosmicCanvas, { draw: drawCosmos, visible: false, running: false }],
  [neuralCanvas, { draw: drawNeural, visible: false, running: false }],
  [galaxyCanvas, { draw: drawGalaxy, visible: false, running: false }],
  [asciiArt, { draw: drawAscii, visible: false, running: false }],
]);

function startRenderer(element) {
  const state = rendererStates.get(element);
  if (!state || state.running || !state.visible || document.hidden) return;
  state.running = true;
  const tick = (time) => {
    if (!state.visible || document.hidden) { state.running = false; return; }
    state.draw(time);
    if (reducedMotion) { state.running = false; return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const visualObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const state = rendererStates.get(entry.target);
    state.visible = entry.isIntersecting;
    if (state.visible) startRenderer(entry.target);
  });
}, { rootMargin: "120px 0px" });
rendererStates.forEach((_, element) => visualObserver.observe(element));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) rendererStates.forEach((state, element) => state.visible && startRenderer(element));
  if (audioContext) {
    if (document.hidden) audioContext.suspend();
    else if (soundOn) audioContext.resume();
  }
});

function resetVisuals() {
  resetHistory(); resetCosmos(); resetNeural(); resetGalaxy();
  rendererStates.forEach((state, element) => {
    if (state.visible && !state.running) startRenderer(element);
  });
}
let resizeTimer;
let lastVisualWidth = innerWidth, lastVisualHeight = innerHeight;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const widthChanged = Math.abs(innerWidth - lastVisualWidth) > 2;
    const majorHeightChange = Math.abs(innerHeight - lastVisualHeight) > 140;
    if (!widthChanged && !majorHeightChange) return;
    lastVisualWidth = innerWidth; lastVisualHeight = innerHeight;
    resetVisuals();
  }, 180);
}, { passive: true });
buildAsciiShape(0);
resetVisuals();

// Ambient audio synthesized locally, unlocked only after user gesture.
let audioContext, masterGain, soundOn=false;
const soundButton=$(".sound-toggle"), soundLabel=$(".sound-label");
soundButton.addEventListener("click", async()=>{
  if(!audioContext){
    audioContext=new AudioContext(); masterGain=audioContext.createGain(); masterGain.gain.value=0; masterGain.connect(audioContext.destination);
    [55,82.5,110].forEach((frequency,index)=>{ const osc=audioContext.createOscillator(), gain=audioContext.createGain(); osc.type=index===1?"sine":"triangle"; osc.frequency.value=frequency; gain.gain.value=[.055,.025,.012][index]; osc.connect(gain).connect(masterGain); osc.start(); });
  }
  await audioContext.resume(); soundOn=!soundOn;
  masterGain.gain.cancelScheduledValues(audioContext.currentTime); masterGain.gain.linearRampToValueAtTime(soundOn ? .52 : 0,audioContext.currentTime+1.2);
  soundButton.dataset.sound=soundOn?"on":"off"; soundLabel.textContent=`SONIDO ${soundOn?"ON":"OFF"}`;
  soundButton.setAttribute("aria-pressed", String(soundOn));
  soundButton.setAttribute("aria-label", soundOn ? "Desactivar ambiente sonoro" : "Activar ambiente sonoro");
});

// Guided breathing: 4 seconds in, 6 seconds out, three cycles.
const breath=$(".breath-orb"), breathState=$(".breath-state"), breathCount=$(".breath-count");
let breathing=false, breathTimers=[];
function scheduleBreath(delay, fn){ const id=setTimeout(fn,delay); breathTimers.push(id); }
function stopBreathing(){ breathTimers.forEach(clearTimeout); breathTimers=[]; breathing=false; breath.style.setProperty("--breath-duration", "1.2s"); breath.classList.remove("is-breathing"); breath.setAttribute("aria-pressed", "false"); breath.setAttribute("aria-label", "Comenzar ejercicio de respiración"); breathState.textContent="COMENZAR"; breathCount.textContent=""; }
breath.addEventListener("click",()=>{
  if(breathing){ stopBreathing(); return; }
  breathing=true; breath.setAttribute("aria-pressed", "true"); breath.setAttribute("aria-label", "Detener ejercicio de respiración"); let elapsed=0;
  for(let cycle=0;cycle<3;cycle++){
    scheduleBreath(elapsed,()=>{ breath.style.setProperty("--breath-duration", "4s"); breath.classList.add("is-breathing"); breathState.textContent="INHALA"; breathCount.textContent=`${cycle+1} / 3`; });
    elapsed+=4000;
    scheduleBreath(elapsed,()=>{ breath.style.setProperty("--breath-duration", "6s"); breath.classList.remove("is-breathing"); breathState.textContent="EXHALA"; });
    elapsed+=6000;
  }
  scheduleBreath(elapsed,()=>{ breathState.textContent="PRESENTE"; scheduleBreath(2200,stopBreathing); });
});

// Small parallax response, batched to one layout update per animation frame.
const heroCopy = $(".hero-copy");
let scrollFramePending = false;
addEventListener("scroll", () => {
  if (scrollFramePending) return;
  scrollFramePending = true;
  requestAnimationFrame(() => {
    const y = scrollY;
    heroCopy.style.transform = `translateY(${Math.min(y * .12, 90)}px)`;
    heroCopy.style.opacity = String(Math.max(0, 1 - y / innerHeight * .95));
    scrollFramePending = false;
  });
}, { passive: true });

$("#year").textContent=new Date().getFullYear();
