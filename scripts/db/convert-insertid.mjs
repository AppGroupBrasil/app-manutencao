// Automated conversion: MySQL insertId → PostgreSQL .returning()
// Handles all patterns across server/modules/**/*.ts
import fs from 'fs';
import path from 'path';

const ROOT = '.';

function walk(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

let totalFiles = 0;
let totalInsertIdReplacements = 0;
let totalReturningAdded = 0;
let totalDestructuringFixes = 0;
const warnings = [];

const allFiles = walk(path.join(ROOT, 'server', 'modules'));

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  const original = content;
  
  if (!content.includes('insertId')) continue;
  
  const insertIdCount = (content.match(/\.insertId/g) || []).length;
  
  // ===== STEP 1: Replace VARNAME[0].insertId with VARNAME.id =====
  // This handles the array access pattern from MySQL: result[0].insertId
  const arrayPattern = /(\w+)\[0\]\.insertId/g;
  content = content.replace(arrayPattern, '$1.id');
  
  // ===== STEP 2: Replace remaining .insertId with .id =====
  content = content.replace(/\.insertId/g, '.id');
  
  // ===== STEP 3: Fix non-destructured assignments =====
  // const result = await db.insert → const [result] = await db.insert
  // const result = await tx.insert → const [result] = await tx.insert
  // But NOT if already destructured: const [result] = ...
  const destructuringBefore = (content.match(/(?:const|let|var)\s+(\w+)\s*=\s*await\s+(?:db|tx)\.insert\s*\(/g) || []).length;
  content = content.replace(/(const|let|var)\s+(\w+)\s*=\s*(await\s+(?:db|tx)\.insert\s*\()/g, '$1 [$2] = $3');
  const destructuringAfter = (content.match(/(?:const|let|var)\s+\[\w+\]\s*=\s*await\s+(?:db|tx)\.insert\s*\(/g) || []).length;
  totalDestructuringFixes += destructuringBefore;
  
  // ===== STEP 4: Add .returning() to insert statements that are assigned =====
  const insertPattern = /(?:db|tx)\.insert\s*\(/g;
  let m;
  const insertPositions = [];
  while ((m = insertPattern.exec(content)) !== null) {
    insertPositions.push(m.index);
  }
  
  for (let p = insertPositions.length - 1; p >= 0; p--) {
    const startPos = insertPositions[p];
    
    // Check if this insert is part of an assignment
    const beforeInsert = content.substring(Math.max(0, startPos - 300), startPos);
    if (!(beforeInsert.includes('=') && beforeInsert.includes('await'))) continue;
    
    // Track paren depth to find end of insert chain
    let i = startPos;
    let depth = 0;
    let hasReturning = false;
    let endPos = -1;
    
    while (i < content.length) {
      const ch = content[i];
      
      // Skip single/double quoted strings
      if (ch === "'" || ch === '"') {
        const quote = ch;
        i++;
        while (i < content.length && content[i] !== quote) {
          if (content[i] === '\\') i++;
          i++;
        }
        i++;
        continue;
      }
      
      // Skip template literals
      if (ch === '`') {
        i++;
        while (i < content.length && content[i] !== '`') {
          if (content[i] === '\\') i++;
          if (content[i] === '$' && i + 1 < content.length && content[i + 1] === '{') {
            i += 2;
            let tdepth = 1;
            while (i < content.length && tdepth > 0) {
              if (content[i] === '{') tdepth++;
              if (content[i] === '}') tdepth--;
              if (tdepth > 0) i++;
            }
            i++;
            continue;
          }
          i++;
        }
        i++;
        continue;
      }
      
      if (ch === '(') depth++;
      if (ch === ')') {
        depth--;
        if (depth === 0) {
          // Look ahead for method chain or statement end
          let j = i + 1;
          while (j < content.length && /[\s\r\n]/.test(content[j])) j++;
          
          if (j < content.length && content[j] === '.') {
            // Method chain continues
            const rest = content.substring(j + 1);
            const methodMatch = rest.match(/^(\w+)/);
            if (methodMatch && methodMatch[1] === 'returning') {
              hasReturning = true;
            }
            // Continue scanning past this method
            i = j + 1;
            continue;
          } else if (j < content.length && (content[j] === ';' || content[j] === ',' || content[j] === '\n' || content[j] === '\r')) {
            endPos = i;
            break;
          } else {
            endPos = i;
            break;
          }
        }
      }
      
      i++;
    }
    
    if (endPos >= 0 && !hasReturning) {
      content = content.substring(0, endPos + 1) + '.returning()' + content.substring(endPos + 1);
      totalReturningAdded++;
    }
  }
  
  // ===== Check for onDuplicateKeyUpdate (needs manual fix) =====
  if (content.includes('onDuplicateKeyUpdate')) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('onDuplicateKeyUpdate')) {
        warnings.push(`⚠️  ${path.relative(ROOT, file)}:${idx + 1} - onDuplicateKeyUpdate needs manual conversion to onConflictDoUpdate`);
      }
    });
  }
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    totalFiles++;
    totalInsertIdReplacements += insertIdCount;
    console.log(`✅ ${path.relative(ROOT, file)}: ${insertIdCount} .insertId → .id`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Files modified: ${totalFiles}`);
console.log(`   .insertId → .id replacements: ${totalInsertIdReplacements}`);
console.log(`   .returning() added: ${totalReturningAdded}`);
console.log(`   Destructuring fixes: ${totalDestructuringFixes}`);

if (warnings.length > 0) {
  console.log(`\n⚠️  Warnings (need manual attention):`);
  warnings.forEach(w => console.log(`   ${w}`));
}

console.log('\n✅ Conversion complete!');
