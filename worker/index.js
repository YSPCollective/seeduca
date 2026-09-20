// Single Worker entry point.
//
// This project deploys as a Cloudflare Worker with a static assets binding,
// not as a classic Cloudflare Pages project. Every request goes through this
// one fetch handler, and it is this file's job to route them.
//
// Two routes are handled directly, for the Decap CMS GitHub OAuth flow.
// Everything else falls through to the static site built by Eleventy (bound
// below as ASSETS, pointing at _site).

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/auth") return handleAuth(env, url);
    if (url.pathname === "/api/callback") return handleCallback(request, env, url);

    return env.ASSETS.fetch(request);
  },
};

// ── /api/auth ──────────────────────────────────────────────────────────
//
// Sends the user to GitHub to approve the app. Needs two environment
// variables set on the Worker (Settings, Variables and Secrets):
//   GITHUB_OAUTH_ID      the OAuth app's Client ID
//   GITHUB_OAUTH_SECRET  the OAuth app's Client Secret (mark as a secret)

function handleAuth(env, url) {
  if (!env.GITHUB_OAUTH_ID) {
    return new Response(
      "GITHUB_OAUTH_ID is not set on this Worker. See HANDOVER.md.",
      { status: 500, headers: { "Content-Type": "text/plain" } }
    );
  }

  // Derived from the incoming request rather than a stored URL, so this
  // keeps matching whatever address the Worker is actually reached on
  // (workers.dev, a preview, or a custom domain later) with nothing to
  // update by hand. It has to match what is registered on the GitHub
  // OAuth app's callback URL, though, so that side still needs updating
  // if the address changes.
  const redirectUri = `${url.origin}/api/callback`;

  // Guards against the callback being hit by anything other than the flow
  // this request started.
  const state = crypto.randomUUID();

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_OAUTH_ID);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("scope", "repo,user");
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      // Host-only, short lived, and readable only by the callback below.
      "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=600`,
    },
  });
}

// ── /api/callback ───────────────────────────────────────────────────────
//
// GitHub redirects here with a short lived code. This swaps that code for
// an access token server side, so the client secret never reaches the
// browser, then hands the token to the CMS window that opened this popup.

async function handleCallback(request, env, url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const expectedState = cookies.oauth_state;

  if (!code) {
    return popupResponse("error", "No code returned by GitHub.");
  }

  // The state has to match the one handleAuth issued. Without this check
  // the callback would accept a code obtained through some other flow.
  if (!state || !expectedState || state !== expectedState) {
    return popupResponse("error", "OAuth state mismatch. Start the login again.");
  }

  // A Secrets Store binding exposes an object with an async get() method
  // rather than the plain string a classic Wrangler secret binds directly
  // as env.NAME. Handling both here means this keeps working regardless of
  // which kind of binding is behind the name.
  const clientSecret = await resolveSecret(env.GITHUB_OAUTH_SECRET);

  if (!env.GITHUB_OAUTH_ID || !clientSecret) {
    return popupResponse("error", "OAuth credentials are not set on this Worker.");
  }

  let token;
  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "cse-loule-cms",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_OAUTH_ID,
        client_secret: clientSecret,
        code,
      }),
    });

    const data = await res.json();

    if (data.error || !data.access_token) {
      return popupResponse("error", data.error_description || data.error || "No token returned.");
    }

    token = data.access_token;
  } catch (e) {
    return popupResponse("error", "Could not reach GitHub to exchange the code.");
  }

  return popupResponse("success", token);
}

// Supports both a Secrets Store binding (an object with an async get()) and
// a classic Wrangler secret (a plain string bound directly), so this works
// unchanged whichever one GITHUB_OAUTH_SECRET happens to be.
async function resolveSecret(value) {
  if (!value) return value;
  if (typeof value === "string") return value;
  if (typeof value.get === "function") return await value.get();
  return value;
}

function parseCookies(header) {
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx > -1) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  });
  return out;
}

// Decap opens this endpoint in a popup and waits for a postMessage. The
// handshake is: the popup announces itself, the CMS replies, and only then
// does the popup send the payload, to the origin the CMS replied from.
function popupResponse(status, payload) {
  const message =
    status === "success"
      ? `authorization:github:success:${JSON.stringify({ token: payload, provider: "github" })}`
      : `authorization:github:error:${JSON.stringify({ message: payload })}`;

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Autenticação</title></head>
<body>
<p>A concluir a autenticação...</p>
<script>
(function () {
  var message = ${JSON.stringify(message)};

  if (!window.opener) {
    document.body.textContent = "Esta janela foi aberta directamente. Volte a /admin/ e tente de novo.";
    return;
  }

  window.addEventListener("message", function (e) {
    window.opener.postMessage(message, e.origin);
    window.close();
  }, { once: true });

  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body>
</html>`;

  return new Response(html, {
    status: status === "success" ? 200 : 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // The token is in this response body. It must never be cached.
      "Cache-Control": "no-store",
      // Clear the state cookie now the flow is finished.
      "Set-Cookie": "oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0",
    },
  });
}
