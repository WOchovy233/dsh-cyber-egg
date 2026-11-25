import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'catalog.json');
const args = process.argv.slice(2);
const force = args.includes('--force');
const ageIndex = args.indexOf('--min-age-days');
const minAgeDays = ageIndex >= 0 ? Number(args[ageIndex + 1]) || 3 : 3;
const now = new Date();
const nowIso = now.toISOString();
const doc = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const lastAuto = Date.parse(doc.autoCheckAt || 0);
if (!force && lastAuto && now.getTime() - lastAuto < minAgeDays * 24 * 60 * 60 * 1000) {
  console.log('catalog auto-check skipped; next due', new Date(lastAuto + minAgeDays * 86400000).toISOString());
  process.exit(0);
}

function isFreeModel(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.isFree === true) return true;
  const id = String(row.id || row.name || '').toLowerCase();
  if (/:free$|\/free$|-free$/.test(id)) return true;
  const pricing = row.pricing;
  return Boolean(pricing && Number(pricing.prompt) === 0 && Number(pricing.completion) === 0);
}

async function probe(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const checkedAt = nowIso;
  try {
    const url = String(source.baseURL || '').replace(/\/+$/, '') + '/models';
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'dsh-cyber-egg-catalog/1.0' },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (response.status === 401 || response.status === 403) {
      return { checkedAt, status: 'auth-required', httpStatus: response.status, modelCount: 0, freeModelCount: 0 };
    }
    if (!response.ok) {
      return { checkedAt, status: 'http-error', httpStatus: response.status, modelCount: 0, freeModelCount: 0 };
    }
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      return { checkedAt, status: 'invalid', httpStatus: response.status, modelCount: 0, freeModelCount: 0 };
    }
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : [];
    return {
      checkedAt,
      status: 'ok',
      httpStatus: response.status,
      modelCount: rows.length,
      freeModelCount: rows.filter(isFreeModel).length,
    };
  } catch {
    return { checkedAt, status: 'unreachable', httpStatus: 0, modelCount: 0, freeModelCount: 0 };
  } finally {
    clearTimeout(timer);
  }
}

const sources = await Promise.all(
  (Array.isArray(doc.sources) ? doc.sources : []).map(async source => ({ ...source, probe: await probe(source) })),
);
const stable = value => JSON.stringify({
  status: value?.status || '',
  httpStatus: Number(value?.httpStatus) || 0,
  modelCount: Number(value?.modelCount) || 0,
  freeModelCount: Number(value?.freeModelCount) || 0,
});
const oldSources = Array.isArray(doc.sources) ? doc.sources : [];
const changed = sources.length !== oldSources.length || sources.some((source, index) => stable(source.probe) !== stable(oldSources[index]?.probe));
let version = String(doc.version || '');
if (changed) {
  const day = nowIso.slice(0, 10).replaceAll('-', '.');
  const match = /^(\d{4}\.\d{2}\.\d{2})\.(\d+)$/.exec(version);
  version = match && match[1] === day ? day + '.' + (Number(match[2]) + 1) : day + '.1';
}
const next = {
  ...doc,
  schema: 1,
  version,
  updatedAt: changed ? nowIso : String(doc.updatedAt || nowIso),
  autoCheckAt: nowIso,
  sources,
};
delete next.catalogSignature;
delete next.signature;
fs.writeFileSync(catalogPath, JSON.stringify(next, null, 2) + '\n', 'utf8');
console.log('catalog probed', version, changed ? '(content changed)' : '(status only)', sources.length, 'sources');
