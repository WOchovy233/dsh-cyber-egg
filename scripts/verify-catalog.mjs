import fs from 'node:fs';
import { internals } from '../index.js';

const doc = JSON.parse(fs.readFileSync(new URL('../catalog.json', import.meta.url), 'utf8'));
const fields = internals.verifyOfficialCatalog(doc);
if (!fields.sources.length) throw new Error('official catalogue has no sources');
console.log('official catalogue ok', fields.version, fields.sources.length, 'sources');
