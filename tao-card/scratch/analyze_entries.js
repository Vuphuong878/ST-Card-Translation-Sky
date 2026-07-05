import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'Đế Quốc La Mã Thần Thánh.json');
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const entries = j.data.character_book.entries;

console.log('Total entries:', entries.length);
console.log('---');

entries.slice(0, 60).forEach(function(x) {
  const status = x.enabled ? 'ON' : 'OFF';
  const cnst = x.constant ? ' CONST' : '';
  const keys = (x.keys || []).slice(0, 3).join(', ');
  console.log('[' + x.id + '] ' + status + cnst + ' | ' + x.comment + ' | keys: ' + keys);
});

console.log('---');
console.log('Entries with EJS/preprocessing:');
entries.forEach(function(x) {
  if (x.content && x.content.trim().startsWith('@@preprocessing')) {
    console.log('  [' + x.id + '] ' + x.comment + ' | enabled: ' + x.enabled);
  }
});

console.log('---');
console.log('Entries with year-like patterns in comment:');
entries.forEach(function(x) {
  if (/\d{3,4}/.test(x.comment)) {
    console.log('  [' + x.id + '] ' + (x.enabled ? 'ON' : 'OFF') + ' | ' + x.comment);
  }
});
