// ============================================================================
// MintyFit v2 — Database Data Export Script
// Exports all data from public schema tables as INSERT statements.
// Uses Supabase service role key to bypass RLS.
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// ─── Configuration ──────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://gqpdgopvzgtpupymxkva.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcGRnb3B2emd0cHVweW14a3ZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY3MzIwNCwiZXhwIjoyMDg3MjQ5MjA0fQ.mmLMSMh_K7gqzW1XstHBbqIFL4dRYMXhWhVnkUowM4o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// ─── Tables to export (in FK-safe order) ────────────────────────────────────
const TABLES = [
  // No dependencies
  'blog_categories',
  'blog_tags',
  // Auth-dependent (profiles must exist first)
  'profiles',
  // Depend on profiles
  'families',
  'family_memberships',
  'managed_members',
  'family_invites',
  'weight_logs',
  'subscriptions',
  'nutritionist_client_links',
  'nutritionist_notes',
  'nutritionist_invites',
  'audit_logs',
  'gdpr_requests',
  'daily_usage',
  // Depend on profiles
  'recipes',
  'menus',
  // Depend on recipes & menus
  'menu_recipes',
  'calendar_entries',
  'food_journal',
  'recipe_interactions',
  'recipe_member_states',
  'recipe_ingredient_swaps',
  // Depend on recipes
  'shopping_lists',
  'shopping_list_items',
  // Depend on profiles
  'blog_posts',
  'blog_post_categories',
  'blog_post_tags',
  'blog_settings',
  'pages',
  'promotions',
  // Reference data
  'ingredients',
  'ingredient_cooking_variants',
  // Legacy
  'family_members',
  'measurements',
];

// Columns that should be treated as JSONB (stored as objects, not strings)
const JSONB_COLUMNS = new Set([
  'instructions', 'nutrition', 'personal_nutrition',
  'metadata', 'activity_profiles', 'nutrition_per_100g',
  'common_units',
]);

// Columns that are text arrays
const TEXT_ARRAY_COLUMNS = new Set([
  'allergens', 'categories', 'tags',
]);

// ─── Value formatting ───────────────────────────────────────────────────────
function formatValue(val, colName) {
  if (val === null || val === undefined) return 'NULL';

  if (JSONB_COLUMNS.has(colName)) {
    // JSONB: escape single quotes by doubling them, wrap in quotes
    const jsonStr = typeof val === 'string' ? val : JSON.stringify(val);
    return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
  }

  if (TEXT_ARRAY_COLUMNS.has(colName)) {
    if (Array.isArray(val)) {
      if (val.length === 0) return "'{}'::text[]";
      const items = val.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',');
      return `ARRAY[${items}]::text[]`;
    }
    return `'${String(val).replace(/'/g, "''")}'::text[]`;
  }

  if (typeof val === 'string') {
    // Check if it looks like a UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
      return `'${val}'::uuid`;
    }
    // Escape single quotes
    return `'${val.replace(/'/g, "''")}'`;
  }

  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';

  if (typeof val === 'number') {
    if (Number.isInteger(val)) return String(val);
    return String(val);
  }

  // Date/timestamp objects - convert to ISO string
  if (val instanceof Date || (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/))) {
    const dateStr = val instanceof Date ? val.toISOString() : val;
    return `'${dateStr}'::timestamptz`;
  }

  // Fallback
  return `'${String(val).replace(/'/g, "''")}'`;
}

// ─── Export a single table ──────────────────────────────────────────────────
async function exportTable(tableName) {
  const rows = [];
  const PAGE_SIZE = 1000;
  let page = 0;
  let totalFetched = 0;

  console.log(`  Exporting ${tableName}...`);

  try {
    // First get the count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      // Table might not exist or other error
      if (countError.code === '42P01') {
        console.log(`    Table ${tableName} does not exist — skipping.`);
        return { rows: [], count: 0 };
      }
      console.error(`    Error getting count for ${tableName}: ${countError.message}`);
      // Continue anyway - try fetching
    }

    const total = count || 0;
    console.log(`    Total rows: ${total}`);

    // Fetch with pagination
    while (true) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(from, to);

      if (error) {
        console.error(`    Error fetching ${tableName} page ${page}: ${error.message}`);
        break;
      }

      if (!data || data.length === 0) break;

      rows.push(...data);
      totalFetched += data.length;
      page++;

      if (totalFetched >= total) break;

      await new Promise(r => setTimeout(r, 100)); // Rate limit
    }

    console.log(`    Fetched ${totalFetched} rows from ${tableName}`);
    return { rows, count: totalFetched };
  } catch (err) {
    console.error(`    Exception exporting ${tableName}: ${err.message}`);
    return { rows: [], count: 0 };
  }
}

// ─── Generate INSERT statements ─────────────────────────────────────────────
function generateInserts(tableName, rows) {
  if (!rows || rows.length === 0) return '';

  const columns = Object.keys(rows[0]);

  let sql = `-- ============================================================================\n`;
  sql += `-- Data for: ${tableName} (${rows.length} rows)\n`;
  sql += `-- ============================================================================\n\n`;

  // Generate in batches of 50 for readability
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    sql += `INSERT INTO ${tableName} (${columns.join(', ')})\nVALUES\n`;

    const valueRows = batch.map(row => {
      const vals = columns.map(col => formatValue(row[col], col));
      return `  (${vals.join(', ')})`;
    });

    sql += valueRows.join(',\n');
    sql += `\nON CONFLICT DO NOTHING;\n\n`;
  }

  return sql;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   MintyFit v2 — Database Data Export         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`Target: ${SUPABASE_URL}\n`);

  // Ensure output directory exists
  const outDir = resolve('db-transfer');
  mkdirSync(outDir, { recursive: true });

  // Export each table
  const results = {};
  let totalRows = 0;

  for (const table of TABLES) {
    const { rows, count } = await exportTable(table);
    results[table] = rows;
    totalRows += count;
  }

  // Generate INSERT SQL
  console.log('\nGenerating INSERT statements...');
  let allSql = `-- ============================================================================\n`;
  allSql += `-- MintyFit v2 — Complete Data Export\n`;
  allSql += `-- Generated: ${new Date().toISOString()}\n`;
  allSql += `-- Total rows exported: ${totalRows}\n`;
  allSql += `-- ============================================================================\n\n`;

  for (const table of TABLES) {
    const rows = results[table];
    if (rows && rows.length > 0) {
      allSql += generateInserts(table, rows);
    }
  }

  // Write to file
  const outFile = resolve(outDir, '02-data.sql');
  writeFileSync(outFile, allSql, 'utf-8');

  const stats = [];
  for (const table of TABLES) {
    const rows = results[table] || [];
    stats.push(`${table}: ${rows.length} rows`);
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Export Complete                            ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`Output: ${outFile}`);
  console.log(`Total rows: ${totalRows}`);
  console.log(`\nTable summary:`);
  stats.forEach(s => console.log(`  ${s}`));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
