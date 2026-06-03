const canvas = document.querySelector("#tomographyCanvas");
const ctx = canvas.getContext("2d");

const palette = {
  ink: "#0d1b2a",
  blue: "#075da8",
  cyan: "#22b8c9",
  green: "#25a36f",
  amber: "#f0a63a",
  pale: "rgba(7, 93, 168, 0.08)",
};

function fitCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function polar(cx, cy, radius, angle) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function drawBlob(cx, cy, scale, time) {
  const points = 72;
  ctx.beginPath();
  for (let i = 0; i <= points; i += 1) {
    const a = (Math.PI * 2 * i) / points;
    const wobble =
      1 +
      0.14 * Math.sin(a * 3 + time * 0.9) +
      0.09 * Math.cos(a * 5 - time * 0.65);
    const p = polar(cx, cy, scale * wobble, a);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

function draw(timeStamp) {
  const time = timeStamp / 1000;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.31;
  const electrodeRadius = Math.min(width, height) * 0.025;
  const sensors = 24;

  ctx.clearRect(0, 0, width, height);

  const grid = ctx.createLinearGradient(0, 0, width, height);
  grid.addColorStop(0, "rgba(34, 184, 201, 0.12)");
  grid.addColorStop(1, "rgba(37, 163, 111, 0.06)");
  ctx.fillStyle = grid;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.08);
  ctx.strokeStyle = "rgba(7, 93, 168, 0.09)";
  ctx.lineWidth = 1;
  for (let i = -8; i <= 8; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 42, -height);
    ctx.lineTo(i * 42, height);
    ctx.stroke();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.fill();
  ctx.strokeStyle = "rgba(7, 93, 168, 0.28)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const active = Math.floor((time * 2.2) % sensors);
  const opposite = (active + Math.floor(sensors / 2)) % sensors;
  const activePoint = polar(cx, cy, radius, (Math.PI * 2 * active) / sensors - Math.PI / 2);

  for (let i = 0; i < sensors; i += 1) {
    const angle = (Math.PI * 2 * i) / sensors - Math.PI / 2;
    const p = polar(cx, cy, radius, angle);
    const isActive = i === active || i === opposite;
    ctx.beginPath();
    ctx.arc(p.x, p.y, electrodeRadius * (isActive ? 1.35 : 1), 0, Math.PI * 2);
    ctx.fillStyle = isActive ? palette.amber : palette.blue;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (let i = 0; i < sensors; i += 3) {
    if (i === active) continue;
    const angle = (Math.PI * 2 * i) / sensors - Math.PI / 2;
    const p = polar(cx, cy, radius, angle);
    const gradient = ctx.createLinearGradient(activePoint.x, activePoint.y, p.x, p.y);
    gradient.addColorStop(0, "rgba(240,166,58,0.45)");
    gradient.addColorStop(1, "rgba(34,184,201,0.05)");
    ctx.beginPath();
    ctx.moveTo(activePoint.x, activePoint.y);
    ctx.quadraticCurveTo(cx + Math.sin(time + i) * 38, cy + Math.cos(time - i) * 38, p.x, p.y);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = i % 2 ? 1.2 : 2;
    ctx.stroke();
  }

  const mapGradient = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.18, 8, cx, cy, radius * 0.82);
  mapGradient.addColorStop(0, "rgba(34,184,201,0.78)");
  mapGradient.addColorStop(0.48, "rgba(37,163,111,0.46)");
  mapGradient.addColorStop(1, "rgba(7,93,168,0.08)");
  drawBlob(cx, cy, radius * 0.52, time);
  ctx.fillStyle = mapGradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + radius * 0.24, cy + radius * 0.1, radius * 0.19 + Math.sin(time * 1.8) * 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(240, 166, 58, 0.7)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - radius * 0.22, cy + radius * 0.22, radius * 0.14 + Math.cos(time * 1.5) * 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(7, 93, 168, 0.58)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.72, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(13, 27, 42, 0.12)";
  ctx.setLineDash([6, 10]);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = palette.ink;
  ctx.font = "700 13px Aptos, sans-serif";
  ctx.fillText("E-field sensitivity map", cx - 72, cy + radius + 44);

  requestAnimationFrame(draw);
}

window.addEventListener("resize", fitCanvas);
fitCanvas();
requestAnimationFrame(draw);
