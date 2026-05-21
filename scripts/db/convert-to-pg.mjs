/**
 * Converts drizzle/schema.ts from MySQL to PostgreSQL dialect.
 * Run: node convert-to-pg.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const filePath = './drizzle/schema.ts';
let content = readFileSync(filePath, 'utf8');

// === PHASE 1: Extract all mysqlEnum occurrences ===
const tableVarRegex = /export const (\w+) = mysqlTable/g;
const tablePositions = [];
let m;
while ((m = tableVarRegex.exec(content)) !== null) {
  tablePositions.push({ name: m[1], pos: m.index });
}

function getTableAt(pos) {
  let table = 'unknown';
  for (const t of tablePositions) {
    if (t.pos < pos) table = t.name;
    else break;
  }
  return table;
}

// Handle multi-line enum value arrays
const enumRegex = /mysqlEnum\(\s*"([^"]+)"\s*,\s*\[([\s\S]*?)\]\s*\)/g;
const occurrences = [];
while ((m = enumRegex.exec(content)) !== null) {
  const colName = m[1];
  const values = [...m[2].matchAll(/"([^"]+)"/g)].map(x => x[1]);
  occurrences.push({
    colName,
    values,
    fullMatch: m[0],
    table: getTableAt(m.index)
  });
}

console.log(`Found ${occurrences.length} mysqlEnum usages across ${tablePositions.length} tables`);

// === PHASE 2: Group by values, assign pgEnum names ===
const byValues = new Map(); // JSON(values) -> { typeName, varName, values }
const usedNames = new Set();

for (const occ of occurrences) {
  const vKey = JSON.stringify(occ.values);
  if (byValues.has(vKey)) continue;

  let name = occ.colName;
  if (usedNames.has(name)) {
    // Conflict: same column name, different values. Prefix with table name.
    name = `${occ.table}_${occ.colName}`;
  }
  while (usedNames.has(name)) {
    name += '_v2';
  }
  usedNames.add(name);

  // Create camelCase variable name
  const varName = name.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) + 'Enum';

  byValues.set(vKey, { typeName: name, varName, values: occ.values });
}

console.log(`Created ${byValues.size} unique pgEnum types`);

// === PHASE 3: Build replacement map (fullMatch -> replacement string) ===
const replacements = new Map();
for (const occ of occurrences) {
  if (replacements.has(occ.fullMatch)) continue;
  const info = byValues.get(JSON.stringify(occ.values));
  replacements.set(occ.fullMatch, `${info.varName}("${occ.colName}")`);
}

// === PHASE 4: Generate pgEnum declarations ===
const enumDecls = [...byValues.values()].map(e =>
  `export const ${e.varName} = pgEnum("${e.typeName}", [${e.values.map(v => `"${v}"`).join(', ')}]);`
);

// === PHASE 5: Transform content ===
let result = content;

// 5a: Replace import
result = result.replace(
  /import \{[^}]+\} from "drizzle-orm\/mysql-core";/,
  'import { pgTable, pgEnum, serial, text, varchar, timestamp, boolean, json, integer, decimal } from "drizzle-orm/pg-core";'
);

// 5b: Insert enum declarations before first table section
const firstSection = result.indexOf('\n// ==================== USERS');
if (firstSection === -1) {
  console.error('Could not find USERS section marker');
  process.exit(1);
}
result = result.slice(0, firstSection) +
  '\n\n// ==================== ENUMS (PostgreSQL) ====================\n' +
  enumDecls.join('\n') + '\n' +
  result.slice(firstSection);

// 5c: Replace mysqlEnum usages (longest first to avoid partial matches)
const sorted = [...replacements.entries()].sort((a, b) => b[0].length - a[0].length);
for (const [old, rep] of sorted) {
  result = result.split(old).join(rep);
}

// 5d: mysqlTable → pgTable
result = result.replaceAll('mysqlTable(', 'pgTable(');

// 5e: int().autoincrement().primaryKey() → serial().primaryKey()
result = result.replace(/int\("(\w+)"\)\.autoincrement\(\)\.primaryKey\(\)/g, 'serial("$1").primaryKey()');

// 5f: remaining int("x") → integer("x")
// Use a function-based replace to handle all remaining int() calls
result = result.replace(/\bint\("(\w+)"\)/g, 'integer("$1")');

// 5g: Remove .onUpdateNow() — no PG equivalent (must be handled at app level)
result = result.replaceAll('.onUpdateNow()', '');

// === PHASE 6: Verify no leftover MySQL references ===
const leftoverMySQL = (result.match(/mysqlTable|mysqlEnum|onUpdateNow|drizzle-orm\/mysql/g) || []);
if (leftoverMySQL.length > 0) {
  console.warn(`⚠️  ${leftoverMySQL.length} leftover MySQL references found!`);
  console.warn(leftoverMySQL);
}

const leftoverInt = (result.match(/\bint\("/g) || []);
if (leftoverInt.length > 0) {
  console.warn(`⚠️  ${leftoverInt.length} leftover int() calls found`);
}

writeFileSync(filePath, result);
console.log('\n✅ Schema converted to PostgreSQL!');
console.log(`   ${enumDecls.length} pgEnum types defined`);
console.log(`   ${occurrences.length} enum usages replaced`);
console.log(`   All mysqlTable → pgTable`);
console.log(`   All int().autoincrement() → serial()`);
console.log(`   All int() → integer()`);
console.log(`   All .onUpdateNow() removed`);
