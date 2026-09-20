# Handover / setup notes

This site lives in its own repository (`YSPCollective/seeduca`) under
the YSPCollective GitHub account — this is Stephen's own project, not a
client site being held for someone else, so there is no account-isolation
concern the way there is for `josyaraujo`. It is a separate repo from
`yspcollective` and `josyaraujo` on purpose, so this project's commits,
issues and CMS stay independent of theirs.

## Decap CMS sign-in setup

Logging in to `/admin/` goes through GitHub OAuth. Cloudflare has no
built-in OAuth provider, so the two endpoints that handle it are routed
by `worker/index.js`, deployed alongside this site as its own Cloudflare
Workers project.

The client secret is only ever used server side in `worker/index.js`. It
is never sent to the browser.

### 1. Register the GitHub OAuth app

On the YSPCollective GitHub account: Settings, Developer settings, OAuth
Apps, New OAuth App.

| Field | Value |
| --- | --- |
| Application name | Anything, e.g. `Centro Sé Educa Loulé CMS` |
| Homepage URL | The site address, e.g. `https://cse-loule.<account>.workers.dev` |
| Authorization callback URL | The site address plus `/api/callback` |

The callback URL has to match exactly, including `https` and any trailing
path. A mismatch is the most common reason sign-in fails.

### 2. Set the Client ID and Secret

`GITHUB_OAUTH_ID` goes directly in `wrangler.jsonc`, as a plain `vars`
entry — it is not sensitive, since it is visible in the browser's address
bar during the OAuth redirect regardless of where it is stored.

`GITHUB_OAUTH_SECRET` does need to stay out of the repo. Add it as a
Cloudflare **Secrets Store** secret (Workers & Pages, this project,
Settings, Bindings, Add binding, Secrets Store), bound to the name
`GITHUB_OAUTH_SECRET`, then uncomment the `secrets_store_secrets` block in
`wrangler.jsonc` and fill in the store's `store_id`.

`worker/index.js` resolves this through a small helper (`resolveSecret`)
that handles both a Secrets Store binding (an object with an async
`get()`) and a classic Wrangler secret (a plain string), so it works
either way.

A new deployment is needed after any change to bindings for it to take
effect.

### 3. If a custom domain is added later

Nothing in the repo needs changing. Both `admin/index.html` (client side)
and `worker/index.js` (server side) derive the site's address from the
request itself rather than from a stored value. The only thing to update
is the **callback URL on the GitHub OAuth app**.

## What's deliberately not built yet

See README.md, "How the teacher schedule system works" — no login system
and no email notifications in this first pass, by design. Both are
addable later without restructuring what's here.
