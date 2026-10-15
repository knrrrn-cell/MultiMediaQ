const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 7000);
const ROOT = path.join(__dirname, "..");
const MANIFEST = {
  id: "com.multimedia.sourceaddon",
  version: "0.2.0",
  name: "MultiMedia Source",
  description: "MultiMedia için kaynak adını koruyan Stremio uyumlu eklenti",
  resources: ["stream", "meta"],
  types: ["movie", "series"],
  idPrefixes: ["tt", "tmdb:", "mm:"],
  catalogs: [],
  behaviorHints: { configurable: false, configurationRequired: false }
};

function jsonFile(rel, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")); }
  catch (_) { return fallback; }
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function normalizeStream(s, fallbackName) {
  const provider = String(s.provider || fallbackName || "Kaynak").trim();
  const title = String(s.title || "").trim();
  const description = String(s.description || "").trim();
  const out = {
    name: provider,
    title: [provider, title].filter(Boolean).join("\n"),
    description: [provider, description].filter(Boolean).join(" · ")
  };
  if (typeof s.url === "string" && /^https?:\/\//i.test(s.url)) out.url = s.url;
  if (typeof s.infoHash === "string" && /^[a-f0-9]{40}$/i.test(s.infoHash)) out.infoHash = s.infoHash;
  if (Number.isInteger(s.fileIdx) && s.fileIdx >= 0) out.fileIdx = s.fileIdx;
  if (s.behaviorHints && typeof s.behaviorHints === "object" && !Array.isArray(s.behaviorHints)) out.behaviorHints = s.behaviorHints;
  if (Array.isArray(s.subtitles)) out.subtitles = s.subtitles;
  return out;
}

function getStreams(type, id) {
  const db = jsonFile("data/streams.json", {});
  const exact = db[`${type}:${id}`] || db[id] || [];
  if (!Array.isArray(exact)) return [];
  return exact
    .filter(s => s && typeof s === "object" && (
      (typeof s.url === "string" && /^https?:\/\//i.test(s.url)) ||
      (typeof s.infoHash === "string" && /^[a-f0-9]{40}$/i.test(s.infoHash))
    ))
    .map(s => normalizeStream(s, s.provider));
}

function getMeta(type, id) {
  const db = jsonFile("data/meta.json", {});
  const meta = db[`${type}:${id}`] || db[id];
  if (!meta || typeof meta !== "object") return { meta: null };
  return { meta: { ...meta, id: meta.id || id, type: meta.type || type } };
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    return res.end();
  }
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });

  let url;
  try { url = new URL(req.url, `http://${req.headers.host || "localhost"}`); }
  catch (_) { return sendJson(res, 400, { error: "Bad request URL" }); }
  const pathname = url.pathname;

  if (pathname === "/" || pathname === "/health") {
    return sendJson(res, 200, { ok: true, addon: MANIFEST.name, version: MANIFEST.version, note: "Stremio-compatible endpoint is running" });
  }
  if (pathname === "/manifest.json") return sendJson(res, 200, MANIFEST);
  if (pathname === "/sources.json") return sendJson(res, 200, jsonFile("sources.json", { sources: [] }));

  let m = pathname.match(/^\/stream\/(movie|series)\/([^/]+)\.json$/);
  if (m) {
    let id;
    try { id = decodeURIComponent(m[2]); } catch (_) { return sendJson(res, 400, { error: "Invalid encoded id" }); }
    return sendJson(res, 200, { streams: getStreams(m[1], id) });
  }

  m = pathname.match(/^\/meta\/(movie|series)\/([^/]+)\.json$/);
  if (m) {
    let id;
    try { id = decodeURIComponent(m[2]); } catch (_) { return sendJson(res, 400, { error: "Invalid encoded id" }); }
    return sendJson(res, 200, getMeta(m[1], id));
  }

  return sendJson(res, 404, { error: "Not found" });
});

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => console.log(`MultiMedia Source listening on port ${PORT}`));
}
module.exports = { server, MANIFEST, getStreams, getMeta, normalizeStream };
