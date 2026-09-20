const markdownIt = require("markdown-it");

const md = markdownIt({ html: true, breaks: true, linkify: true });

module.exports = function (eleventyConfig) {
  // ── Static assets ────────────────────────────────────────────────
  eleventyConfig.addPassthroughCopy({ admin: "admin" });
  eleventyConfig.addPassthroughCopy({ images: "images" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.svg": "favicon.svg" });
  eleventyConfig.addPassthroughCopy({ _headers: "_headers" });

  eleventyConfig.addWatchTarget("src/assets");

  // ── Localisation helpers ─────────────────────────────────────────
  // Content entries store one field per language using a suffix,
  // e.g. heading_pt / heading_en. `loc` picks the right one and falls
  // back to Portuguese when a translation is missing.
  const DEFAULT_LOCALE = "pt";

  function pick(obj, field, locale) {
    if (!obj) return "";
    const l = locale || DEFAULT_LOCALE;
    const candidates = [obj[`${field}_${l}`], obj[`${field}_${DEFAULT_LOCALE}`], obj[field]];
    const hit = candidates.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
    return hit === undefined ? "" : hit;
  }

  eleventyConfig.addFilter("loc", pick);

  // Same lookup, then rendered as markdown. For the longer prose fields.
  eleventyConfig.addFilter("locmd", function (obj, field, locale) {
    const raw = pick(obj, field, locale);
    return raw ? md.render(String(raw)) : "";
  });

  // Render a plain markdown string.
  eleventyConfig.addFilter("md", function (raw) {
    return raw ? md.render(String(raw)) : "";
  });

  // ── Image helper ─────────────────────────────────────────────────
  // CMS uploads arrive as "/images/uploads/x.jpg". Bare filenames and
  // absolute URLs are both tolerated so hand-written data still works.
  eleventyConfig.addFilter("img", function (src) {
    if (!src) return "";
    const s = String(src).trim();
    if (s.startsWith("http") || s.startsWith("/")) return s;
    return `/images/uploads/${s}`;
  });

  // ── Timetable helper ────────────────────────────────────────────
  // Groups a flat list of {day_key, ...} entries by day, in week order,
  // dropping days that have nothing scheduled. Used by the general
  // timetable page and by each teacher's own schedule.
  eleventyConfig.addFilter("byDay", function (entries, dayOrder) {
    if (!entries) return [];
    return dayOrder
      .map((day) => ({ day, entries: entries.filter((e) => e.day_key === day) }))
      .filter((group) => group.entries.length > 0);
  });

  // ── Collections ──────────────────────────────────────────────────
  // (none yet: every page is built from the global data files in
  // src/_data, which is what the CMS writes to.)

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
