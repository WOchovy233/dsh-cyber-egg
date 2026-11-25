import fs from 'node:fs';
import crypto from 'node:crypto';
import { internals } from '../index.js';

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

const keyEnv = arg('--key-env');
const keyPath = arg('--key');
const legacyKeyPath = arg('--legacy-key');
const inPath = arg('--in') || 'catalog.json';
const outPath = arg('--out') || inPath;
const secret = keyEnv ? process.env[keyEnv] : '';
if ((!keyEnv && !keyPath) || (keyEnv && !secret)) {
  console.error('missing catalogue signing key (use --key or --key-env with a non-empty secret)');
  process.exit(2);
}
const doc = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const privateKey = crypto.createPrivateKey(secret || fs.readFileSync(keyPath, 'utf8'));
doc.catalogSignature = crypto.sign(null, internals.catalogPayload(doc), privateKey).toString('base64');
if (legacyKeyPath) {
  const legacyKey = crypto.createPrivateKey(fs.readFileSync(legacyKeyPath, 'utf8'));
  doc.signature = crypto.sign(null, internals.legacyCatalogPayload(doc), legacyKey).toString('base64');
} else {
  delete doc.signature;
}
const fields = internals.verifyOfficialCatalog(doc);
fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log('catalog signed', fields.version, fields.sources.length, 'sources');
