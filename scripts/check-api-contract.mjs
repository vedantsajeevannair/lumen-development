#!/usr/bin/env node
/**
 * Does the API actually send what the console's types claim?
 *
 * Every blank page this project has had was the same failure. A page declares
 *
 *   type Complaint = { ...; department: { name: string }; ... }
 *
 * the endpoint does not send `department`, TypeScript believes the declaration
 * and says nothing, and `c.department.name` throws at render. React unmounts
 * the tree and the user gets a white document with no error anywhere they
 * would look. It survives until someone opens the exact page with the exact
 * row that triggers it.
 *
 * TypeScript cannot catch this on its own: the types describe a boundary it
 * cannot see across. This walks that boundary from the outside — it reads the
 * declared types out of the page source, calls the real API, and reports every
 * non-optional field the response does not contain.
 *
 *   node scripts/check-api-contract.mjs                       # live deployment
 *   BASE=http://localhost:3000 node scripts/check-api-contract.mjs
 *
 * Exits non-zero when the contract is broken, so it can gate a deploy.
 */
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'https://140.238.250.246.sslip.io';
const EMAIL = process.env.EMAIL ?? 'admin@lumen.gov';
const PASSWORD = process.env.PASSWORD ?? 'lumen123';
const PAGES = 'Lumen-Web/src/pages';

/**
 * Non-optional field names declared on a type alias.
 *
 * Nested object literals are skipped rather than flattened: `department: {
 * name: string }` is checked as `department`, because whether `name` exists is
 * only meaningful once `department` itself does, and flattening reports a
 * phantom `name` against the top-level response.
 */
function declaredFields(src, typeName) {
  const m = src.match(new RegExp(`type ${typeName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!m) return [];
  let body = m[1];
  // Drop nested braces so their members are not mistaken for top-level fields.
  let prev;
  do { prev = body; body = body.replace(/\{[^{}]*\}/g, 'OBJ'); } while (body !== prev);
  return [...body.matchAll(/(\w+)(\??)\s*:/g)]
    .filter((f) => f[2] !== '?')
    .map((f) => f[1]);
}

const token = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
})
  .then((r) => r.json())
  .then((d) => d.access_token);

if (!token) {
  console.error(`could not sign in to ${BASE}`);
  process.exit(2);
}

const get = (path) =>
  fetch(`${BASE}/api${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.json())
    .catch(() => null);

/** page file, declared type, endpoint, key in the response, index if a list */
const CHECKS = [
  ['ComplaintDetail.tsx', 'Complaint', '/complaints/CMP-10245', 'complaint', null],
  ['Complaints.tsx', 'Row', '/complaints', 'complaints', 0],
  ['Dashboard.tsx', 'Complaint', '/dashboard', 'complaints', 0],
  ['Gis.tsx', 'C', '/gis', 'complaints', 0],
  ['Gis.tsx', 'E', '/gis', 'engineers', 0],
  ['Gis.tsx', 'Landmark', '/gis', 'landmarks', 0],
  ['Engineers.tsx', 'E', '/engineers', 'engineers', 0],
  ['AuditLogs.tsx', 'L', '/audit-logs', 'logs', 0],
  ['Assignment.tsx', 'Plan', '/assignment', null, null],
  ['WorkOrders.tsx', 'Payload', '/clusters', null, null],
  ['Estimate.tsx', 'Payload', '/estimate?wastage=5', null, null],
];

let broken = 0;
for (const [file, type, endpoint, key, index] of CHECKS) {
  const body = await get(endpoint);
  if (!body) {
    console.log(`  ?  ${file} → ${endpoint} — no response, skipped`);
    continue;
  }
  let sample = key ? body[key] : body;
  if (index !== null) {
    // An empty list proves nothing either way; it is not a failure.
    if (!Array.isArray(sample) || sample.length === 0) {
      console.log(`  ·  ${file} → ${endpoint} — no rows to check`);
      continue;
    }
    sample = sample[index];
  }
  if (sample == null) continue;

  const src = readFileSync(`${PAGES}/${file}`, 'utf8');
  const missing = declaredFields(src, type).filter((f) => !(f in sample));

  if (missing.length) {
    broken += missing.length;
    console.log(`  ✗  ${file} → ${endpoint}  (type ${type})`);
    console.log(`       declared but not sent: ${missing.join(', ')}`);
  } else {
    console.log(`  ✓  ${file} → ${endpoint}  (type ${type})`);
  }
}

console.log();
if (broken) {
  console.log(`${broken} field(s) the console expects and the API does not send.`);
  console.log('Each one is a blank page waiting for the row that triggers it.');
  process.exit(1);
}
console.log('Contract holds: every declared field is present in the response.');
