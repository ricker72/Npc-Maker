'use strict';


const https = require('https');

const RELEASES_API = 'https://api.github.com/repos/ricker72/Npc-Maker/releases?per_page=15';
const OFFICIAL_RELEASE_PREFIX = 'https://github.com/ricker72/Npc-Maker/releases';
const REQUEST_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 60 * 1000;
const BODY_PREVIEW_CHARS = 1500;

function parseVersion(value) {
  const match = String(value || '').match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: match[3] ? Number(match[3]) : 0,
    raw: `${Number(match[1])}.${Number(match[2])}.${match[3] ? Number(match[3]) : 0}`
  };
}

function compareVersions(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (!va || !vb) return 0;
  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  return va.patch - vb.patch;
}

function isOfficialReleaseUrl(url) {
  if (typeof url !== 'string') return false;
  return url === OFFICIAL_RELEASE_PREFIX || url.startsWith(OFFICIAL_RELEASE_PREFIX + '/');
}

function fetchJson(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 3) {
      reject(new Error('Demasiadas redirecciones al consultar GitHub.'));
      return;
    }
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'NPC-Maker-Pro-Updater', Accept: 'application/vnd.github+json' } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          resolve(fetchJson(res.headers.location, redirectCount + 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`GitHub API respondió HTTP ${res.statusCode}`));
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Respuesta inválida de GitHub.'));
          }
        });
      }
    );
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error('Tiempo de espera agotado al consultar GitHub.'));
    });
    req.on('error', reject);
  });
}

function pickLatestRelease(releases) {
  if (!Array.isArray(releases)) return null;
  let best = null;
  let bestVersion = null;
  for (const release of releases) {
    if (!release || release.draft) continue;
    const version = parseVersion(release.tag_name) || parseVersion(release.name);
    if (!version) continue;
    if (!best || compareVersions(version.raw, bestVersion.raw) > 0) {
      best = release;
      bestVersion = version;
    }
  }
  if (!best) return null;
  return {
    version: bestVersion.raw,
    tag: best.tag_name,
    name: best.name || '',
    url: best.html_url || OFFICIAL_RELEASE_PREFIX,
    publishedAt: best.published_at || best.created_at || null,
    prerelease: !!best.prerelease,
    bodyPreview: typeof best.body === 'string' ? best.body.slice(0, BODY_PREVIEW_CHARS) : '',
    assets: Array.isArray(best.assets)
      ? best.assets.map((a) => ({ name: a.name, url: a.browser_download_url, size: a.size || 0 }))
      : []
  };
}

let cache = null;

async function checkForUpdates(currentVersion) {
  const now = Date.now();
  if (cache && now - cache.checkedAt < CACHE_TTL_MS) {
    return cache.status;
  }

  let status;
  try {
    const releases = await fetchJson(RELEASES_API);
    const latest = pickLatestRelease(releases);
    const current = parseVersion(currentVersion);
    const updateAvailable = !!(latest && current && compareVersions(latest.version, current.raw) > 0);
    status = {
      ok: true,
      checkedAt: new Date(now).toISOString(),
      currentVersion: current ? current.raw : String(currentVersion || ''),
      updateAvailable,
      latest
    };
  } catch (err) {
    status = {
      ok: false,
      error: err.message,
      checkedAt: new Date(now).toISOString(),
      currentVersion: String(currentVersion || ''),
      updateAvailable: false,
      latest: null
    };
  }

  cache = { checkedAt: now, status };
  return status;
}

module.exports = {
  checkForUpdates,
  compareVersions,
  parseVersion,
  isOfficialReleaseUrl,
  RELEASES_API,
  OFFICIAL_RELEASE_PREFIX
};
