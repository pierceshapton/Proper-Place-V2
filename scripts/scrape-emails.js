/**
 * Scrapes websites for email addresses for host_leads missing emails.
 * Checks homepage + /contact page. Updates DB directly.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { Client } = require('pg');

const DB_URL = 'postgresql://doadmin:AVNS_h5gAks_XqiZhRqSOX1T@db-postgresql-lon1-38562-properplace-do-user-33237375-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require';

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Domains to skip (generic/irrelevant)
const SKIP_DOMAINS = ['sentry.io', 'example.com', 'schema.org', 'w3.org', 'google.com',
  'facebook.com', 'instagram.com', 'twitter.com', 'wixpress.com', 'squarespace.com',
  'wordpress.com', 'amazonaws.com', 'cloudflare.com', 'jsdelivr.net'];

const LEADS = [
  [3,'Queen Adelaide Blagdon','https://live.mytenderpos.com/wpos/(S(3g0rww3k2oy5yweigs2120b5))/OptionDelivery?sv=ThaiKitchen_08052024112518&cv=5&lv=3'],
  [15,'The Flying Fish Pub & Restaurant','https://www.theflyingfishsomerset.co.uk/'],
  [23,'The Sloop Inn Llandogo','https://www.thesloopinn.co.uk/'],
  [29,'The Portsmouth Arms','https://www.facebook.com/Lovelycountrypub'],
  [31,'The Quicksilver Mail','http://www.quicksilvermail.com/'],
  [34,'The Stables Campsite','https://www.pitchup.com/campsites/England/South_West/greater-bristol/Bristol/stables/'],
  [35,'Britannia Inn','http://www.britanniainn.com/'],
  [66,'The Anchor Inn','http://anchorinnexebridge.co.uk/'],
  [67,'The Anchor Inn, Epney','http://www.theanchorinnepney.co.uk/'],
  [72,'Ashton','https://www.theashtonbristol.co.uk/'],
  [75,'The Parkers Arms','https://www.cattlemanssteakhouse.co.uk/'],
  [79,'The Star','http://thestarinnsomerset.co.uk/'],
  [84,'The Old Inn, Widecombe','http://www.oldinnwidecombe.co.uk/'],
  [85,'Bathampton Mill Bath','https://www.thebathamptonmill.co.uk/'],
  [86,'The Ley Arms','http://theleyarmskenn.co.uk/'],
  [87,'The Diggers Rest','https://thediggersrest.co.uk/'],
  [88,'Heanton Court','https://www.vintageinn.co.uk/restaurants/south-west/heantoncourt barnstaple'],
  [89,'Bearslake Inn','https://bearslakeinn.com/'],
  [90,'Masons Arms, Branscombe','https://www.masonsarms.co.uk/'],
  [91,'Peter Tavy Inn','http://www.petertavyinn.co.uk/'],
  [92,'Pyne Arms','https://www.pynearms.co.uk/'],
  [93,'The Highwayman Inn','http://www.thehighwaymaninn.net/'],
  [94,'The Pig & Whistle','http://www.thepigandwhistleinn.co.uk/'],
  [95,'Fingle Bridge Inn','http://www.finglebridgeinn.co.uk/'],
  [96,'Turtley Corn Mill','http://www.turtleycornmill.com/'],
  [97,'Church House Inn Marldon','http://www.churchhousemarldon.com/'],
  [98,'The Nobody Inn','https://www.nobodyinn.co.uk/'],
  [99,'Dartbridge Inn Buckfastleigh','https://www.greeneking.co.uk/pubs/devon/dartbridge-inn'],
  [100,'The Sea Trout Inn','http://www.seatroutinn.co.uk/'],
  [101,'The Barn Owl','http://www.barnowlkingskerswell.co.uk/'],
  [102,'Tally Ho','https://www.tallyhoinn.co.uk/'],
  [103,'The Rugglestone Inn','http://rugglestoneinn.co.uk/'],
  [104,'The Agricultural Inn','https://www.agriculturalinn.co.uk/'],
  [105,'Culm Valley Inn','http://www.theculmvalley.co.uk/'],
  [106,'The Five Bells Community Pub','http://www.fivebells.pub/'],
  [107,'The Kilpeck Inn','http://www.kilpeckinn.com/'],
  [108,'The Boat Inn','https://www.facebook.com/profile.php?id=61577219381238'],
  [109,'The Old Court Hotel','https://www.oldcourthotel.co.uk/'],
  [110,'The Avon Inn','http://www.avon-inn.org.uk/'],
  [112,'Clinton Arms','http://www.clintonarms.co.uk/'],
  [113,'The penny hedge','https://www.pennyhedgepubwhitby.co.uk/'],
  [117,'Hare & Hounds','http://www.hareandhounds-devon.co.uk/'],
];

function fetchUrl(url, timeout = 8000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.get(url, {
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProperPlaceBot/1.0)',
          'Accept': 'text/html',
        },
        rejectUnauthorized: false,
      }, (res) => {
        // Follow one redirect
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          try {
            const redirectUrl = new URL(res.headers.location, url).href;
            fetchUrl(redirectUrl, timeout).then(resolve);
          } catch { resolve(''); }
          return;
        }
        let body = '';
        res.on('data', chunk => { body += chunk; if (body.length > 500000) req.destroy(); });
        res.on('end', () => resolve(body));
        res.on('error', () => resolve(''));
      });
      req.on('error', () => resolve(''));
      req.on('timeout', () => { req.destroy(); resolve(''); });
    } catch { resolve(''); }
  });
}

function extractEmails(html, siteHost) {
  const found = new Set();
  const matches = html.match(EMAIL_REGEX) || [];
  for (const m of matches) {
    const lower = m.toLowerCase();
    // Skip generic/noisy emails
    if (SKIP_DOMAINS.some(d => lower.includes(d))) continue;
    if (lower.includes('noreply') || lower.includes('no-reply') || lower.includes('donotreply')) continue;
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.gif') || lower.endsWith('.svg')) continue;
    if (lower.includes('@2x') || lower.includes('@3x')) continue;
    // Prefer emails from the same domain
    found.add(lower);
  }
  // Sort: same-domain emails first
  return [...found].sort((a, b) => {
    const aMatch = siteHost && a.includes(siteHost.replace('www.', ''));
    const bMatch = siteHost && b.includes(siteHost.replace('www.', ''));
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });
}

async function scrapeLead(id, name, website) {
  let siteHost = '';
  try { siteHost = new URL(website).hostname; } catch {}

  // Skip social media / third-party booking sites
  if (website.includes('facebook.com') || website.includes('pitchup.com') || 
      website.includes('greeneking.co.uk') || website.includes('vintageinn.co.uk') ||
      website.includes('mytenderpos.com')) {
    return { id, name, website, emails: [], note: 'skipped (third-party)' };
  }

  const pagesToTry = [website];
  // Add /contact and /contact-us variants
  try {
    const base = new URL(website).origin;
    pagesToTry.push(base + '/contact', base + '/contact-us', base + '/about');
  } catch {}

  const allEmails = new Set();
  for (const page of pagesToTry) {
    const html = await fetchUrl(page);
    const emails = extractEmails(html, siteHost);
    emails.forEach(e => allEmails.add(e));
    if (allEmails.size > 0) break; // stop if we found something on homepage
  }

  return { id, name, website, emails: [...allEmails] };
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  const results = [];
  const found = [];
  const notFound = [];

  console.log(`\nScraping ${LEADS.length} websites...\n`);

  for (const [id, name, website] of LEADS) {
    process.stdout.write(`[${id}] ${name.substring(0, 40).padEnd(40)} → `);
    const result = await scrapeLead(id, name, website);
    results.push(result);

    if (result.emails.length > 0) {
      const best = result.emails[0];
      console.log(`✓ ${best}${result.emails.length > 1 ? ` (+${result.emails.length - 1} more)` : ''}`);
      found.push({ id, name, email: best, all: result.emails });

      // Update the DB
      await client.query('UPDATE host_leads SET email = $1 WHERE id = $2', [best, id]);
    } else {
      console.log(result.note || '✗ not found');
      notFound.push({ id, name, website });
    }
  }

  await client.end();

  console.log('\n─────────────────────────────────────────');
  console.log(`✅ Found emails for ${found.length}/${LEADS.length} leads`);
  console.log(`❌ Still missing: ${notFound.length}`);

  if (notFound.length > 0) {
    console.log('\nStill missing emails:');
    notFound.forEach(l => console.log(`  [${l.id}] ${l.name} — ${l.website}`));
  }
}

main().catch(console.error);
