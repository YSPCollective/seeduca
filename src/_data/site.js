// Site-wide constants. Everything the client edits lives in the JSON
// files next to this one (written by Decap CMS); this file is code.

const name = "Centro Sé Educa Loulé";

// Portuguese is the default language and sits at the root of the site.
// English lives under /en/.
const defaultLocale = "pt";

const locales = [
  { code: "pt", htmlLang: "pt-PT", label: "Português", short: "PT" },
  { code: "en", htmlLang: "en", label: "English", short: "EN" },
];

// One entry per page, one URL per language. The language switcher and
// the hreflang tags are both generated from this map, so adding a page
// means adding it here once.
const pages = {
  home: {
    pt: "/",
    en: "/en/",
  },
  activities: {
    pt: "/atividades/",
    en: "/en/activities/",
  },
  timetable: {
    pt: "/horario/",
    en: "/en/timetable/",
  },
  teachers: {
    pt: "/professores/",
    en: "/en/teachers/",
  },
  contact: {
    pt: "/contacto/",
    en: "/en/contact/",
  },
};

// Week order used to group timetable and per-teacher schedule entries.
// Entries carry a day_key (mon..sun); this drives display order.
const dayOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

module.exports = {
  name,
  // Update once the Cloudflare Workers project exists and its address is
  // known, or set SITE_URL as a Worker environment variable instead. Used
  // for canonical and Open Graph URLs, and for the sitemap.
  url: process.env.SITE_URL || "https://cse-loule.workers.dev",
  defaultLocale,
  locales,
  localeCodes: locales.map((l) => l.code),
  pages,
  dayOrder,
  // Order of the main navigation.
  nav: ["home", "activities", "timetable", "teachers", "contact"],
};
