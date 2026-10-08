const DEFAULT_ACCENT = "#8c31ed";
const SVG_NS = "http://www.w3.org/2000/svg";

let accent = null;
let filterSvg = null;
let filterMatrix = null;

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Waveforms in lists and search results are drawn on a canvas, which CSS can't
// recolor. This SVG filter turns their orange pixels into the accent color.
function ensureFilter() {
  if (!filterSvg) {
    // Drop a filter left over from an older load of the extension
    document.querySelectorAll("#tintcloud-filter-svg").forEach((el) => el.remove());

    filterSvg = document.createElementNS(SVG_NS, "svg");
    filterSvg.setAttribute("id", "tintcloud-filter-svg");
    filterSvg.setAttribute("width", "0");
    filterSvg.setAttribute("height", "0");
    filterSvg.setAttribute("aria-hidden", "true");
    filterSvg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";

    const filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", "tintcloud-orange");
    filter.setAttribute("color-interpolation-filters", "sRGB");

    filterMatrix = document.createElementNS(SVG_NS, "feColorMatrix");
    filterMatrix.setAttribute("in", "SourceGraphic");
    filterMatrix.setAttribute("type", "matrix");
    filterMatrix.setAttribute("result", "tint");

    const blend = document.createElementNS(SVG_NS, "feComposite");
    blend.setAttribute("in", "tint");
    blend.setAttribute("in2", "SourceGraphic");
    blend.setAttribute("operator", "atop");

    filter.append(filterMatrix, blend);
    filterSvg.append(filter);
  }

  if (!filterSvg.isConnected) {
    document.documentElement.append(filterSvg);
  }
}

function updateFilter(color) {
  ensureFilter();
  const [r, g, b] = hexToRgb(color).map((v) => v / 255);
  // New color = accent. New alpha = how orange the pixel is (3 * (R - B) - 0.1)
  filterMatrix.setAttribute(
    "values",
    `0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  3 0 -3 0 -0.1`
  );
}

function applyAccent(color) {
  accent = color;
  const root = document.documentElement;
  const current = root.style.getPropertyValue("--sc-accent").trim().toLowerCase();
  if (current !== color.toLowerCase()) {
    root.style.setProperty("--sc-accent", color);
  }
  updateFilter(color);
}

browser.storage.local.get("accent").then((res) => {
  applyAccent(res.accent || DEFAULT_ACCENT);
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.accent) {
    applyAccent(changes.accent.newValue);
  }
});

// SoundCloud sometimes rewrites <html> or removes our filter when you navigate
new MutationObserver(() => {
  if (accent) applyAccent(accent);
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["style"],
  childList: true,
});
