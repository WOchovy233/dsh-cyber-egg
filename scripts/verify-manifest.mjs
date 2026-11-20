import fs from 'node:fs';
import crypto from 'node:crypto';

const source = fs.readFileSync('index.js', 'utf8');
const pinned = source.match(/const UPDATE_PUBLIC_KEY = `([\s\S]*?)`/);
if (!pinned) {
  console.error('UPDATE_PUBLIC_KEY not found in index.js');
  process.exit(1);
}
const publicKey = crypto.createPublicKey(pinned[1]);

const data = fs.readFileSync('update.json');
const doc = JSON.parse(data.toString('utf8'));

const payload = Buffer.from(
  JSON.stringify({
    version: String(doc.version || ''),
    tarball: String(doc.tarball || ''),
    tarballMirrors: Array.isArray(doc.tarballMirrors) ? doc.tarballMirrors.map(String) : [],
    sha256: String(doc.sha256 || ''),
    notes: String(doc.notes || ''),
  }),
  'utf8',
);

if (doc.signature) {
  const ok = crypto.verify(null, payload, publicKey, Buffer.from(String(doc.signature).trim(), 'base64'));
  if (!ok) {
    console.error('embedded signature does not verify');
    process.exit(1);
  }
  console.log(`manifest embedded signature ok (version ${doc.version})`);
} else if (fs.existsSync('update.json.sig')) {
  const signature = Buffer.from(fs.readFileSync('update.json.sig', 'utf8').trim(), 'base64');
  const ok = crypto.verify(null, data, publicKey, signature);
  if (!ok) {
    console.error('detached signature does not verify');
    process.exit(1);
  }
  console.log(`manifest legacy detached signature ok (version ${doc.version})`);
} else {
  console.error('update.json has no embedded signature and no update.json.sig');
  process.exit(1);
}

// The detached file must still match the manifest for older clients.
if (fs.existsSync('update.json.sig')) {
  const signature = Buffer.from(fs.readFileSync('update.json.sig', 'utf8').trim(), 'base64');
  if (!crypto.verify(null, data, publicKey, signature)) {
    console.error('update.json.sig does not match the current manifest (older clients would fail)');
    process.exit(1);
  }
}
