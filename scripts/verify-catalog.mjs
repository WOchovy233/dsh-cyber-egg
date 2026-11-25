import fs from 'node:fs';
import { internals } from '../index.js';

const doc = JSON.parse(fs.readFileSync(new URL('../catalog.json', import.meta.url), 'utf8'));
const fields = internals.verifyOfficialCatalog(doc);
if (!doc.catalogSignature) throw new Error('catalogue must use the dedicated catalogue signature');
if (!fields.autoCheckAt) throw new Error('catalogue missing autoCheckAt');
if (!fields.sources.every(source => source.probe && source.probe.checkedAt)) throw new Error('catalogue missing probe snapshots');
console.log('official catalogue ok', fields.version, fields.sources.length, 'sources');