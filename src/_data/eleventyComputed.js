// Derived per-page data. `locale` itself is supplied by each template's
// pagination alias, so it is deliberately not computed here.

function pick(obj, field, locale, fallback) {
  if (!obj) return "";
  const candidates = [obj[`${field}_${locale}`], obj[`${field}_${fallback}`], obj[field]];
  const hit = candidates.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
  return hit === undefined ? "" : hit;
}

// Each page declares a pageKey ("home", "activities", "timetable",
// "teachers", "contact") and the matching data file carries a `meta` block
// with one title and one description per language.
module.exports = {
  htmlLang: (data) => {
    const match = (data.site.locales || []).find((l) => l.code === data.locale);
    return match ? match.htmlLang : "pt-PT";
  },

  t: (data) => data.i18n[data.locale] || data.i18n[data.site.defaultLocale],

  // Individual teacher pages (pagination alias `teacher`) get their own
  // title/description instead of the shared "teachers" index meta.
  titleOverride: (data) => {
    if (!data.teacher) return undefined;
    return `${data.t.schedule_of} ${data.teacher.name} — ${data.site.name}`;
  },

  descriptionOverride: (data) => {
    if (!data.teacher) return undefined;
    return pick(data.teacher, "bio", data.locale, data.site.defaultLocale);
  },

  title: (data) => {
    if (data.titleOverride) return data.titleOverride;
    const source = data[data.pageKey];
    return pick(source && source.meta, "title", data.locale, data.site.defaultLocale) || data.site.name;
  },

  description: (data) => {
    if (data.descriptionOverride) return data.descriptionOverride;
    const source = data[data.pageKey];
    return pick(source && source.meta, "description", data.locale, data.site.defaultLocale);
  },
};
