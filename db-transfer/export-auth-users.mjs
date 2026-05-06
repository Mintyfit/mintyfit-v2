// ============================================================================
// Export auth.users via Supabase Admin API (uses service_role key)
// Output: db-transfer/03-auth-users.json — ready for import into target project
// ============================================================================

import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = 'https://gqpdgopvzgtpupymxkva.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcGRnb3B2emd0cHVweW14a3ZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY3MzIwNCwiZXhwIjoyMDg3MjQ5MjA0fQ.mmLMSMh_K7gqzW1XstHBbqIFL4dRYMXhWhVnkUowM4o';

async function exportUsers() {
  console.log('Exporting auth users from Supabase...');

  const users = [];
  let page = 1;
  const perPage = 500;

  while (true) {
    const url = `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
    });

    if (!res.ok) {
      console.error(`Error: ${res.status} ${res.statusText}`);
      const body = await res.text();
      console.error(body);
      break;
    }

    const data = await res.json();
    if (!data.users || data.users.length === 0) break;

    users.push(...data.users);
    console.log(`  Page ${page}: got ${data.users.length} users (total: ${users.length})`);

    if (data.users.length < perPage) break;
    page++;
  }

      // Write JSON export (Supabase Dashboard-compatible format)
  mkdirSync(resolve('db-transfer'), { recursive: true });
  writeFileSync(
    resolve('db-transfer/03-auth-users.json'),
    JSON.stringify(users, null, 2),
    'utf-8'
  );

  // Also generate SQL for direct auth.users INSERT (if needed)
  let sql = `-- ============================================================================\n`;
  sql += `-- auth.users export — ${users.length} users\n`;
  sql += `-- These INSERTs require the pgcrypto extension and bypass auth triggers\n`;
  sql += `-- WARNING: Run this in target Supabase SQL Editor before importing profiles\n`;
  sql += `-- ============================================================================\n\n`;

  for (const user of users) {
    // Extract identity (if exists)
    const identity = user.identities?.[0] || {};

    sql += `-- User: ${user.email || 'no-email'}\n`;
    sql += `INSERT INTO auth.users (\n`;
    sql += `  instance_id, id, aud, role, email, encrypted_password,\n`;
    sql += `  email_confirmed_at, invited_at, confirmation_token,\n`;
    sql += `  confirmation_sent_at, recovery_token, recovery_sent_at,\n`;
    sql += `  email_change_token_new, email_change, email_change_sent_at,\n`;
    sql += `  last_sign_in_at, raw_app_meta_data, raw_user_meta_data,\n`;
    sql += `  is_super_admin, created_at, updated_at, phone,\n`;
    sql += `  phone_confirmed_at, phone_change, phone_change_token,\n`;
    sql += `  phone_change_sent_at, email_change_token_current,\n`;
    sql += `  email_change_confirm_status, banned_until, reauthentication_token,\n`;
    sql += `  reauthentication_sent_at, is_sso_user, deleted_at\n`;
    sql += `) VALUES (\n`;

    const vals = [
      `'00000000-0000-0000-0000-000000000000'`, // instance_id
      `'${user.id}'::uuid`,
      `'authenticated'`,
      `'authenticated'`,
      user.email ? `'${user.email.replace(/'/g, "''")}'` : 'NULL',
      user.encrypted_password ? `'${user.encrypted_password}'` : 'NULL',
      user.email_confirmed_at ? `'${user.email_confirmed_at}'::timestamptz` : 'NULL',
      user.invited_at ? `'${user.invited_at}'::timestamptz` : 'NULL',
      `''`, // confirmation_token
      user.confirmation_sent_at ? `'${user.confirmation_sent_at}'::timestamptz` : 'NULL',
      `''`, // recovery_token
      user.recovery_sent_at ? `'${user.recovery_sent_at}'::timestamptz` : 'NULL',
      `''`, // email_change_token_new
      `''`, // email_change
      user.email_change_sent_at ? `'${user.email_change_sent_at}'::timestamptz` : 'NULL',
      user.last_sign_in_at ? `'${user.last_sign_in_at}'::timestamptz` : 'NULL',
      `'${JSON.stringify(user.raw_app_meta_data || {}).replace(/'/g, "''")}'::jsonb`,
      `'${JSON.stringify(user.raw_user_meta_data || {}).replace(/'/g, "''")}'::jsonb`,
      user.is_super_admin ? 'TRUE' : 'FALSE',
      user.created_at ? `'${user.created_at}'::timestamptz` : `NOW()`,
      user.updated_at ? `'${user.updated_at}'::timestamptz` : `NOW()`,
      user.phone ? `'${user.phone.replace(/'/g, "''")}'` : 'NULL',
      user.phone_confirmed_at ? `'${user.phone_confirmed_at}'::timestamptz` : 'NULL',
      `''`, // phone_change
      `''`, // phone_change_token
      user.phone_change_sent_at ? `'${user.phone_change_sent_at}'::timestamptz` : 'NULL',
      `''`, // email_change_token_current
      `0`, // email_change_confirm_status
      user.banned_until ? `'${user.banned_until}'::timestamptz` : 'NULL',
      `''`, // reauthentication_token
      user.reauthentication_sent_at ? `'${user.reauthentication_sent_at}'::timestamptz` : 'NULL',
      user.is_sso_user ? 'TRUE' : 'FALSE',
      user.deleted_at ? `'${user.deleted_at}'::timestamptz` : 'NULL',
    ];

    sql += `  ${vals.join(',\n  ')}\n`;
    sql += `) ON CONFLICT (id) DO NOTHING;\n\n`;

    // Also insert into auth.identities if exists
    if (identity.id) {
      sql += `INSERT INTO auth.identities (\n`;
      sql += `  id, user_id, identity_data, provider, provider_id,\n`;
      sql += `  last_sign_in_at, created_at, updated_at\n`;
      sql += `) VALUES (\n`;
      sql += `  '${identity.id}'::uuid,\n`;
      sql += `  '${user.id}'::uuid,\n`;
      sql += `  '${JSON.stringify(identity.identity_data || {}).replace(/'/g, "''")}'::jsonb,\n`;
      sql += `  '${identity.provider || 'email'}',\n`;
      sql += `  '${identity.provider_id || user.email || ''}',\n`;
      sql += `  ${identity.last_sign_in_at ? `'${identity.last_sign_in_at}'::timestamptz` : 'NULL'},\n`;
      sql += `  ${identity.created_at ? `'${identity.created_at}'::timestamptz` : 'NOW()'},\n`;
      sql += `  ${identity.updated_at ? `'${identity.updated_at}'::timestamptz` : 'NOW()'}\n`;
      sql += `) ON CONFLICT (provider, provider_id) DO NOTHING;\n\n`;
    }
  }

  writeFileSync(
    resolve('db-transfer/03-auth-users.sql'),
    sql,
    'utf-8'
  );

  console.log(`\nDone. Exported ${users.length} users.`);
  console.log(`  db-transfer/03-auth-users.json — JSON format (for Dashboard import)`);
  console.log(`  db-transfer/03-auth-users.sql  — SQL format (for direct INSERT)`);
  console.log(`\nEmails: ${users.map(u => u.email).filter(Boolean).join(', ')}`);
}

exportUsers().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
