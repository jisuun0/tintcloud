const DEFAULT_ACCENT = "#8c31ed";
const REPO_URL = "https://github.com/jisuun0/tintcloud";

const state = { h: 270, s: 0.79, v: 0.93 };

const $ = (id) => document.getElementById(id);
const sv = $("sv"), svThumb = $("sv-thumb");
const hue = $("hue"), hueThumb = $("hue-thumb");
const preview = $("preview"), hexInput = $("hex");
const rIn = $("r"), gIn = $("g"), bIn = $("b");

const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map((n) => Math.round((n + m) * 255));
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

const toHex = (rgb) =>
  "#" + rgb.map((n) => n.toString(16).padStart(2, "0")).join("");

function fromHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function render(updateFields = true) {
  const rgb = hsvToRgb(state.h, state.s, state.v);
  const hex = toHex(rgb);
  sv.style.backgroundColor = `hsl(${state.h}, 100%, 50%)`;
  svThumb.style.left = state.s * 100 + "%";
  svThumb.style.top = (1 - state.v) * 100 + "%";
  hueThumb.style.left = (state.h / 360) * 100 + "%";
  preview.style.backgroundColor = hex;
  if (updateFields) {
    rIn.value = rgb[0];
    gIn.value = rgb[1];
    bIn.value = rgb[2];
    hexInput.value = hex;
  }
}

function setFromRgb(rgb) {
  const hsv = rgbToHsv(...rgb);
  // Hue means nothing for black, white and grays, so keep the last one
  if (hsv.s > 0 && hsv.v > 0) state.h = hsv.h;
  state.s = hsv.s;
  state.v = hsv.v;
}

function makeDraggable(el, onMove) {
  const handle = (e) => {
    const rect = el.getBoundingClientRect();
    onMove(
      clamp((e.clientX - rect.left) / rect.width),
      clamp((e.clientY - rect.top) / rect.height)
    );
  };
  const stop = () => el.removeEventListener("pointermove", handle);

  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    handle(e);
    el.addEventListener("pointermove", handle);
  });
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointercancel", stop);
}

makeDraggable(sv, (x, y) => {
  state.s = x;
  state.v = 1 - y;
  render();
});

makeDraggable(hue, (x) => {
  state.h = x * 360;
  render();
});

[rIn, gIn, bIn].forEach((input) => {
  input.addEventListener("input", () => {
    const rgb = [rIn, gIn, bIn].map((i) => clamp(parseInt(i.value, 10) || 0, 0, 255));
    setFromRgb(rgb);
    render(false);
    hexInput.value = toHex(rgb);
  });
});

hexInput.addEventListener("input", () => {
  const rgb = fromHex(hexInput.value);
  if (!rgb) return;
  setFromRgb(rgb);
  render(false);
  [rIn.value, gIn.value, bIn.value] = rgb;
});

$("apply").addEventListener("click", () => {
  const hex = toHex(hsvToRgb(state.h, state.s, state.v));
  browser.storage.local.set({ accent: hex }).then(() => {
    const btn = $("apply");
    btn.textContent = "Applied";
    setTimeout(() => (btn.textContent = "Apply"), 1000);
  });
});

function openLink(url) {
  browser.tabs.create({ url }).then(() => window.close());
}

$("github").addEventListener("click", () => openLink(REPO_URL));

$("report").addEventListener("click", () => {
  const { version } = browser.runtime.getManifest();
  const firefox = navigator.userAgent.match(/Firefox\/([\d.]+)/)?.[1] ?? "unknown";
  const body = `What happened?\n\n\n---\nTintCloud ${version}, Firefox ${firefox}`;
  openLink(`${REPO_URL}/issues/new?body=${encodeURIComponent(body)}`);
});

browser.storage.local.get("accent").then((res) => {
  setFromRgb(fromHex(res.accent || DEFAULT_ACCENT));
  render();
});
