// scripts/test-ical-sync.js
// Usage: DATABASE_URL=... node scripts/test-ical-sync.js <ICS_URL> <PLACE_ID> [SOURCE]
const ical = require('node-ical');
const { Client } = require('pg');

async function main() {
  const [, , icsUrl, placeIdArg, sourceArg] = process.argv;
  if (!icsUrl || !placeIdArg) {
    console.error('Usage: node scripts/test-ical-sync.js <ICS_URL> <PLACE_ID> [SOURCE]');
    process.exit(1);
  }
  const placeId = parseInt(placeIdArg, 10);
  const source = sourceArg || 'manual_test';
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const events = await ical.fromURL(icsUrl);
    await client.query('BEGIN');
    await client.query('DELETE FROM external_blocked_dates WHERE place_id=$1 AND source=$2', [placeId, source]);

    for (const k of Object.keys(events)) {
      const ev = events[k];
      if (ev.type !== 'VEVENT') continue;
      const start = ev.start ? ev.start.toISOString().split('T')[0] : null;
      const end = ev.end ? ev.end.toISOString().split('T')[0] : start;
      if (!start || !end) continue;
      await client.query(
        `INSERT INTO external_blocked_dates (place_id, external_calendar_id, start_date, end_date, source, created_at)
         VALUES ($1, NULL, $2, $3, $4, NOW())`,
        [placeId, start, end, source]
      );
      console.log('Inserted:', start, end);
    }

    await client.query('COMMIT');
    console.log('Sync complete');
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('Sync failed:', err.message || err);
  } finally {
    await client.end();
  }
}

main();
