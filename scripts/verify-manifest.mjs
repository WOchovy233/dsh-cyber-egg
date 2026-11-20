import fs from 'node:fs';
import crypto from 'node:crypto';

const source = fs.readFileSync('index.js', 'utf8');
const pinned = source.match(/const UPDATE_PUBLIC_KEY = `([\s\S]*?)`/);
if (!pinned) {
  console.error('UPDATE_PUBLIC_KEY not found in index.js');
  process.exit(1);
}

const data = fs.readFileSync('update.json');
const sigPath = 'update.json.sig';
if (!fs.existsSync(sigPath)) {
  console.error('missing update.json.sig');
  process.exit(1);
}
const signature = Buffer.from(fs.readFileSync(sigPath, 'utf8').trim(), 'base64');
const ok = crypto.verify(null, data, crypto.createPublicKey(pinned[1]), signature);
if (!ok) {
  console.error('update.json signature does not verify against the pinned public key');
  process.exit(1);
}
const doc = JSON.parse(data.toString('utf8'));
console.log(`manifest signature ok (version ${doc.version})`);
