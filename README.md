# Centro Sé Educa Loulé

Static website for Centro Sé Educa Loulé (study support & after-school
club). Eleventy + Nunjucks, content edited through Decap CMS, deployed on
Cloudflare Workers.

Its own repository, under the YSPCollective GitHub account — separate
from `yspcollective` (the fragrance store) and `josyaraujo`, so its
history, issues and CMS never mix with either.

## Running locally

```bash
npm install
npm run dev
```

Eleventy serves on `http://localhost:8080` and rebuilds on save. `npm run
build` writes the production site to `_site/`.

## Languages

Portuguese is the default and lives at the root. English is a full static
site under `/en/`, not a client-side text swap.

| Page | PT | EN |
| --- | --- | --- |
| Home | `/` | `/en/` |
| Activities | `/atividades/` | `/en/activities/` |
| General timetable | `/horario/` | `/en/timetable/` |
| Teachers | `/professores/` | `/en/teachers/` |
| Teacher schedule | `/professores/<slug>/` | `/en/teachers/<slug>/` |
| Contact | `/contacto/` | `/en/contact/` |

The URL table above is defined once, in `src/_data/site.js`, and drives the
navigation, the language switcher, the `hreflang` tags and the sitemap.

Content fields carry a language suffix (`heading_pt`, `heading_en`). The
`loc` and `locmd` filters pick the right one and fall back to Portuguese
when a translation is empty.

## Content

Everything the client edits lives in `src/_data/*.json` and is written by
Decap CMS:

- `home.json`: hero carousel, about text, activities & timetable teasers
- `activities.json`: activities grouped by type, with ages and description
- `timetable.json`: the **general, non-specific** timetable shown on one
  page (e.g. "16h–17h, Study Support, Grades 1-4")
- `teachers.json`: the team, and each teacher's own weekly schedule
- `contact.json`: address, hours, phone, email, social links, map

Images upload to `images/uploads/`. The `.svg` files currently there are
neutral placeholders so the site renders before real photos exist — delete
them once real photography is uploaded.

**Placeholder content to replace before launch:** the about text, the
activities list, the timetable entries and the three example teachers in
`teachers.json` are all sample data, clearly marked as such. Replace them
via `/admin/` (or by editing the JSON directly) before this goes live.

## How the teacher schedule system works

Each teacher in `teachers.json` has a `schedule` list (day + time +
activity). Eleventy generates one page per teacher per language from that
list — there is no login and no separate database. Saving a change in
`/admin/` commits to GitHub, which triggers a Cloudflare rebuild, so a
teacher's page is live again within a couple of minutes.

This intentionally skips two things that came up in planning, so they are
not forgotten:

- **Email/notification on schedule change.** Not built. The page itself
  updates automatically, so this is only useful as a push alert for
  parents who want one. Doable later as an add-on (a small Worker hook on
  the GitHub webhook, plus a transactional email provider) without
  touching this architecture.
- **Parent/pupil login.** Not built, and meaningfully bigger than the
  rest of this site — it needs real authentication and a database
  (e.g. Cloudflare D1), not just another static page. Worth treating as
  its own project once the static version is in use and there's a clear
  need for personalised, gated content.

## CMS

The admin lives at `/admin/`. The interface is in Portuguese
(`locale: pt` in `admin/config.yml`); field labels and hints are written
in Portuguese too.

A save commits to GitHub, which triggers a Cloudflare Workers rebuild.

## Before this goes live

1. **Create the GitHub repository** (`YSPCollective/seeduca`), push this
   code to it, then confirm `repo:` in `admin/config.yml` matches. Logging
   in to `/admin/` fails until this is correct.
2. **Create the Cloudflare Workers project** (Workers & Pages, Import a
   repository) pointed at the repo. Build command `npm run build`.
   `wrangler.jsonc` already lives in the repo, so no separate output
   directory setting is needed.
3. **Set `SITE_URL`** as a Cloudflare Workers environment variable to the
   real deployed address, or edit the fallback in `src/_data/site.js`.
4. **Authorise the CMS with GitHub.** Decap's GitHub backend needs an
   OAuth provider. The Worker script for this already lives in the repo
   (`worker/index.js`); see HANDOVER.md for the exact setup.
5. **Replace the placeholder content**, per the section above.

## Self-contained

No shared dependencies on any other repository, no submodules, no shared
`node_modules`, no secrets in the repo. Everything needed to build and
deploy this site lives here.
