/**
 * Utility to check DNS records for auth.dutyflow.in and trigger SendGrid verification
 * 
 * Usage:
 *   node scripts/verify-sendgrid-dns.js
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;

// Load environment variables from .env.local
const envLocalPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      value = value.trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const client = require('@sendgrid/client');
const apiKey = (process.env.SENDGRID_API_KEY || '').trim();
client.setApiKey(apiKey);

const DOMAIN_ID = 33308965; // auth.dutyflow.in

const recordsToCheck = [
  { name: 'em.auth.dutyflow.in', expected: 'u55368415.wl166.sendgrid.net' },
  { name: 's1._domainkey.auth.dutyflow.in', expected: 's1.domainkey.u55368415.wl166.sendgrid.net' },
  { name: 's2._domainkey.auth.dutyflow.in', expected: 's2.domainkey.u55368415.wl166.sendgrid.net' },
];

async function checkDns() {
  console.log('----------------------------------------------------');
  console.log('Checking DNS CNAME records for auth.dutyflow.in:');
  console.log('----------------------------------------------------');
  
  let allDnsFound = true;

  for (const rec of recordsToCheck) {
    try {
      const cnames = await dns.resolveCname(rec.name);
      const match = cnames.some(c => c.toLowerCase().includes(rec.expected.toLowerCase()));
      if (match) {
        console.log(`✅ [FOUND] ${rec.name} -> ${cnames[0]}`);
      } else {
        console.log(`⚠️  [MISMATCH] ${rec.name} -> found "${cnames[0]}", expected "${rec.expected}"`);
        allDnsFound = false;
      }
    } catch (err) {
      console.log(`❌ [NOT FOUND] ${rec.name} (DNS lookup failed or not yet propagated)`);
      allDnsFound = false;
    }
  }

  console.log('----------------------------------------------------');
  console.log('Requesting SendGrid validation for Domain ID:', DOMAIN_ID);

  try {
    const [response, body] = await client.request({
      method: 'POST',
      url: `/v3/whitelabel/domains/${DOMAIN_ID}/validate`,
    });

    console.log(`SendGrid Domain Valid: ${body.valid ? '✅ YES (VERIFIED!)' : '❌ NO (Awaiting DNS propagation)'}`);
    if (body.validation_results) {
      Object.entries(body.validation_results).forEach(([key, val]) => {
        console.log(`   - ${key}: ${val.valid ? '✅ Valid' : `❌ Invalid (${val.reason || 'Pending'})`}`);
      });
    }

    if (body.valid) {
      console.log('\n🎉 Congratulations! auth.dutyflow.in is fully verified in SendGrid.');
      console.log('You can now send emails from no-reply@auth.dutyflow.in seamlessly!');
    } else {
      console.log('\n💡 If you just added the DNS records in your domain registrar (Hostinger),');
      console.log('   please wait 2-10 minutes for DNS propagation, then run this script again.');
    }
  } catch (err) {
    console.error('SendGrid validation request error:', err?.response?.body || err.message);
  }
}

checkDns();
