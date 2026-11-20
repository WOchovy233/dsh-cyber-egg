# Cyber eggs

Collect free tokens daily and put them to work inside DeepSeek Harness. A single egg
button in the left sidebar opens a panel with three tabs.

## Market — tiered free-token sources

The market is ordered in three tiers:

1. **Most used 🔥** — the three the community reaches for first: 硅基流动 (SiliconFlow),
   智谱 GLM, OpenRouter.
2. **Editor picks 荐** — Groq, Gemini AI Studio, 魔搭 ModelScope.
3. **More eggs** — the rest of the curated set (Cerebras, 百炼, 火山方舟, Mistral,
   Together, 讯飞星火, GitHub Models), followed by sources that arrived through a feed.

Each card shows the rough daily allowance (`daily`), whether you can register from
mainland China (`access`: direct / proxy / foreign card), a one-line pitch, and a
longer note about which models are free, rate limits, and setup gotchas. The official
source list and all of those descriptions are delivered by the signed `catalog.json`
on the `main` branch, so copy and quota changes do not require a plugin release. The
bundled `catalog.js` is a fail-safe fallback when the remote copy cannot be fetched.

**Install** takes that site's API key, asks the endpoint for its own model list, stores
the key in the local credential store, and writes a model route named
`<site> · Cyber eggs` into the `llm-pi-ai` settings section. The route then appears in
the composer's model picker. Model ids are never hard-coded.

### Global free-model radar

**Refresh eggs** is the only trigger for upstream data. It fetches the signed official
catalogue and subscribed feeds, calls OpenRouter's public model API, refreshes all three
anonymous pools, and re-discovers models for every installed egg route. The radar keeps
every model whose input and output prices are both zero, shows a `newly listed` badge
for models absent from the previous snapshot, and lists vendor/context window. Opening
the panel only reads cached local state; it never starts a background refresh.

When OpenRouter is unreachable (typical on mainland mobile networks), the radar falls
back to the Kilo free pool, marks itself `Kilo 数据源`, and shows the network reason
(e.g. `网络不可达（域名解析失败）`) instead of a bare `fetch failed`. The previous snapshot
is kept when neither source answers.

### Custom feeds

Any JSON URL can extend the catalogue. When you press **Refresh eggs**, the plugin
fetches each feed and merges its entries into the market with a `new` mark for entries
seen for the first time:

```json
{
  "sources": [
    {
      "id": "my-relay",
      "name": "My Relay",
      "baseURL": "https://relay.example.com/v1",
      "api": "openai-completions",
      "daily": "约 500 次/天",
      "access": "cn-direct",
      "signupUrl": "https://relay.example.com/register"
    }
  ]
}
```

`api` accepts `openai-completions`, `openai-responses`, `anthropic-messages` and
`google-generative-ai`; `access` accepts `cn-direct`, `cn-vpn`, `cn-card`. Feed entries
are installable exactly like built-in sources.

## No-key — anonymous free models

A fourth tab lists the free pool of Kilo's public gateway (`https://ai-gateway.kilo.ai/api/v1`,
rows with `isFree: true`). **Enable** puts one model into the model picker, **Enable all**
adds the whole pool as the provider route `kilo-free · Cyber eggs`; no sign-up, no key,
no account. **Test inference** sends one real request through DSH's own model call path
and reports the answer.

Why a loopback hop: the adapter in DSH always attaches an auth header, so the plugin runs
a transparent forwarder on a **random local port of its own** — every device is its own
"machine room": the port is picked at random, remembered per install, and moved along when
the chosen one is taken; the provider route is rewritten to whichever port actually bound.
The forwarder adjusts only that header. It adds no account pool, stores no conversation,
and forwards only `/v1/models`, `/v1/chat/completions` and `/v1/completions` to the fixed
Kilo host. The port number is written into the route; on startup the plugin re-points an
existing route if the port had to move.

The free pool's own model cards say prompts **may be logged** by the upstream provider —
treat this lane as throwaway work, never send secrets or private data.

### Second no-key pool: Pollinations

The same tab lists a second anonymous pool: Pollinations' public endpoint
(`https://text.pollinations.ai/openai`, the `anonymous` tier of `/models`, currently one
model). It needs no key and no sign-up; a dummy token is accepted, so it plugs in as the
provider route `pollinations-free · Cyber eggs` without a proxy. Its free tier is
rate-limited to **one reply per IP every 45 seconds** — good for the occasional request,
not for a long agent session.

### Third no-key pool: LLM7

The tab also lists LLM7's public pool (`https://api.llm7.io/v1`, every non-`pro` model from
`/models`, currently four). No key and no sign-up; a dummy token is accepted, so it becomes
the provider route `llm7-free · Cyber eggs` with no proxy. Its free allowance is small and
counted per model, so `429` answers are common — treat it as a last resort.

### Health check — keep only models that actually answer

**Scan all free models** sends `你好` to every enabled anonymous model plus every model in
the three pools, one at a time, and reports what came back. Models that cannot answer
(model gone, repeated timeouts, empty replies) are removed from the provider config and
remembered in a block list so a later pool refresh does not bring them back; a **Restore**
button undoes that.

A `429`/`402`/quota answer means the free pool is throttling this IP, not that the model is
dead: those are retried a few times and then **kept** and reported separately. This matters
because probing several models concurrently is exactly what triggers Kilo's
"sign up for free" throttle — so probes are strictly sequential with a 2.5 s gap.

The same health pass runs automatically after a plugin update (enabled models only), so an
update also prunes whatever stopped working since the last release.

OpenCode's free lane (the other anonymous channel in `dsh-our-free-model`) is not
available here: it requires the local `opencode` CLI running on Bun, so there is no plain
HTTP endpoint to point at.

## My relays — daily check-in

Relay sites built on New API / One API expose a daily check-in endpoint. Add the site
URL and access token, press **Test** (it can reuse the saved token), then **Claim now**.
Protocol `newapi` calls `POST /api/user/checkin` with the bearer token and an optional
`New-Api-User` header; protocol `custom` lets you set method, path, headers, body and a
success keyword for any other site.

## Auto claim

One daily time (default 09:00) checks in to every enabled relay while DSH is running.
Adding your first relay enables this automatically unless you already saved a time.
**Catch up** runs a missed same-day check-in shortly after DSH starts. Every attempt is
recorded under **History** with its result.

## Android / DSH Go

This project ships a JavaScript bundle, not an APK: it runs inside DeepSeek Harness,
including the DSH engine bundled in the community Android client **DSH Go**
(`ccch1mneyyy/dsh-go`, third-party, AGPL-3.0, Android 8+, arm64 APK from its Releases).
No plugin-specific Android build exists or is needed.

Use DSH Go's **本机引擎** mode (the engine runs on the phone). In **远程主机** mode the app
only offers switch management for plugins, so the panel is not rendered there.

1. Get `cyber-egg-latest.tgz` (the permanent alias of the newest release) onto the phone,
   e.g. `Download/cyber-egg-latest.tgz`.
2. In the app's terminal run:
   `dsh plugin --profile web add file:/sdcard/Download/cyber-egg-latest.tgz`
3. Restart the engine, then enable **赛博鸡蛋** under 设置 → 插件.
4. Open the egg icon in the left sidebar. The Kilo lane forwards through the phone's own
   random local port (see above), so no PC is involved and no two devices share a port.

The Host half needs the profile services `settings`, `credentials`, `llm` and
`webServer`, plus the `llm-pi-ai` provider adapter to install models. If the app's
bundled DSH lacks `llm-pi-ai`, the market tab still lists sources but an install reports
that no provider configuration is available.

## Self-update (signed)

The panel's **Check for updates / Update to vX** button reads `update.json` from the latest
Release (then the raw branch, then jsDelivr as the last resort), and verifies the
**signature embedded in the manifest** — an Ed25519 signature made by the release key and
checked with a public key pinned inside this plugin. Version, tarball URL and `sha256` all
sit inside the signed payload, so a poisoned mirror can only make the update *fail*: it
cannot ship modified code, because it cannot forge the signature. Opening the panel does
not check for updates; only clicking that button contacts the release API.

The signature lives in the same file as the data it covers. An earlier release kept it in
a separate `update.json.sig`, and jsDelivr happily served a stale manifest next to a fresh
signature (two files, two independent caches), which surfaced as a bogus "signature
mismatch". Failures now retry the same URL once with a cache-busting query, and the
detached `.sig` is still published for clients from 1.4.7–1.5.0 that only know that format.

Fail-closed rules: a missing signature, a signature that does not verify, a malformed
manifest, a non-https tarball URL or a `sha256` mismatch aborts the install before any
package is written. The panel then says the manifest failed verification and points at the
Release page for a manual download.

The private key is not in this repository (publishing would otherwise let anyone sign a
release). It lives outside the repo and is used by the release script; the matching public
key is the `UPDATE_PUBLIC_KEY` constant in `index.js`, and `scripts/verify-manifest.mjs`
re-checks release artifacts in CI.

## Storage and secrets
- API keys are credential refs such as `EGG_OPENROUTER_API_KEY`; relay tokens are
  `CYBER_EGG_RELAY_<id>`. Both live in the local credential store, never in
  `cordis.patch.yml`.
- Relay definitions, install records, radar snapshots, feeds, the cached official
  catalogue, today's claim state and the last 120 attempts live in
  `<DSH_HOME>/cyber-egg/<profile>.json`.
- The HTTP API is bound to the panel and answered only for loopback requests.

## Limitations

- Sites that require a CAPTCHA, human verification, or a WeChat mini-program login
  cannot be automated here. Only HTTP endpoints and custom request recipes are supported.
- Daily figures and China-registration conditions are approximate; the provider's own
  page is authoritative.
- Automatic claims need DSH to be running at the configured time; a day when DSH never
  started is not replayed.
- The radar depends on OpenRouter's public API; when the network cannot reach it the panel
  shows the fetch error and keeps the previous snapshot.
- Model discovery depends on the provider serving a standard `GET {baseURL}/models`;
  otherwise install with explicit model ids.

## Configuration

The row in `cordis.patch.yml` accepts `hour`, `minute` and `claims: { enabled, catchUp }`
as initial values. The panel's **Auto claim** tab owns the live values afterwards.
