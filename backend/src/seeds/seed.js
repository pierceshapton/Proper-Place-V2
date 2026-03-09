const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');

    // Create default admin user
    const adminEmail = 'admin@properplace.com';
    const adminPassword = 'AdminPass123!';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('✅ Admin user already exists');
    } else {
      // Create admin user
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role, verified) 
         VALUES ($1, $2, $3, $4, $5)`,
        [adminEmail, hashedPassword, 'Admin User', 'admin', true]
      );
      console.log('✅ Admin user created successfully');
    }

    // Create default host user (for testing)
    const hostEmail = 'host@properplace.com';
    const hostPassword = 'HostPass123!';
    const hashedHostPassword = await bcrypt.hash(hostPassword, 10);

    const existingHost = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [hostEmail]
    );

    let hostId;
    if (existingHost.rows.length === 0) {
      const hostResult = await pool.query(
        `INSERT INTO users (email, password_hash, name, role, verified) 
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [hostEmail, hashedHostPassword, 'Host User', 'host', true]
      );
      hostId = hostResult.rows[0].id;
      console.log('✅ Host user created successfully');
    } else {
      hostId = existingHost.rows[0].id;
    }

    // Add sample places
    const placesCount = await pool.query('SELECT COUNT(*) FROM places');
    if (placesCount.rows[0].count === '0') {
      const samplePlaces = [
        {
          owner_id: hostId,
          name: 'Sunshine Parking Lot',
          description: 'Beautiful parking spot with scenic views',
          address: '123 Main St',
          city: 'London',
          country: 'UK',
          postal_code: 'SW1A 1AA',
          latitude: 51.5074,
          longitude: -0.1278,
          price_per_night: 25.00,
          capacity: 5,
          amenities: ['WiFi', 'EV Charging', 'Security'],
          approval_status: 'approved',
          rating: 4.5,
        },
        {
          owner_id: hostId,
          name: 'Cozy Garden Park',
          description: 'Quiet residential parking area with garden access',
          address: '456 Park Ave',
          city: 'Manchester',
          country: 'UK',
          postal_code: 'M1 1AE',
          latitude: 53.4808,
          longitude: -2.2426,
          price_per_night: 20.00,
          capacity: 3,
          amenities: ['Garden', 'Quiet', 'Safe'],
          approval_status: 'approved',
          rating: 4.8,
        },
        {
          owner_id: hostId,
          name: 'Marina View Spots',
          description: 'Waterfront parking with beautiful marina views',
          address: '789 Harbor St',
          city: 'Bristol',
          country: 'UK',
          postal_code: 'BS1 4RB',
          latitude: 51.4545,
          longitude: -2.5879,
          price_per_night: 30.00,
          capacity: 6,
          amenities: ['WiFi', 'Water Supply', 'Waste Disposal'],
          approval_status: 'approved',
          rating: 4.6,
        },
      ];

      for (const place of samplePlaces) {
        await pool.query(
          `INSERT INTO places (owner_id, name, description, address, city, country, postal_code, 
                               latitude, longitude, price_per_night, capacity, amenities, approval_status, rating, review_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            place.owner_id,
            place.name,
            place.description,
            place.address,
            place.city,
            place.country,
            place.postal_code,
            place.latitude,
            place.longitude,
            place.price_per_night,
            place.capacity,
            place.amenities,
            place.approval_status,
            place.rating,
            3,
          ]
        );
      }
      console.log('✅ Sample places created successfully');
    }

    // Add sample pubs
    const pubsCount = await pool.query('SELECT COUNT(*) FROM pubs');
    if (pubsCount.rows[0].count === '0') {
      const samplePubs = [
        {
          name: 'The Crown & Anchor',
          description: 'Historic pub with traditional ales and hearty food',
          address: '321 High St',
          city: 'Oxford',
          country: 'UK',
          postal_code: 'OX1 1AA',
          latitude: 51.7527,
          longitude: -1.2527,
          price_per_night: 15.00,
          capacity: 10,
          facilities: ['Parking', 'WiFi', 'Toilets', 'Food'],
          rating: 4.7,
          open_now: true,
          hours_open: '10am-11pm',
          phone: '01865 123456',
          website: 'www.crownanchor.co.uk',
        },
        {
          name: 'The Riverside Inn',
          description: 'Lovely riverside pub with outdoor seating',
          address: '654 River Rd',
          city: 'Cambridge',
          country: 'UK',
          postal_code: 'CB1 1AA',
          latitude: 52.2053,
          longitude: 0.1218,
          price_per_night: 18.00,
          capacity: 8,
          facilities: ['Parking', 'WiFi', 'Outdoor Seating', 'Toilets'],
          rating: 4.9,
          open_now: true,
          hours_open: '11am-11pm',
          phone: '01223 789012',
          website: 'www.riversideinn.co.uk',
        },
        {
          name: 'The Green Man',
          description: 'Cozy country pub with local beers and food',
          address: '987 Country Lane',
          city: 'Cotswolds',
          country: 'UK',
          postal_code: 'GL55 6DA',
          latitude: 51.9927,
          longitude: -1.8133,
          price_per_night: 16.00,
          capacity: 12,
          facilities: ['Parking', 'Toilets', 'WiFi', 'Garden'],
          rating: 4.8,
          open_now: true,
          hours_open: '12pm-10:30pm',
          phone: '01608 654321',
          website: 'www.greenmancotswolds.co.uk',
        },
      ];

      for (const pub of samplePubs) {
        await pool.query(
          `INSERT INTO pubs (name, description, address, city, country, postal_code, 
                             latitude, longitude, price_per_night, capacity, facilities, rating, 
                             open_now, hours_open, phone, website)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            pub.name,
            pub.description,
            pub.address,
            pub.city,
            pub.country,
            pub.postal_code,
            pub.latitude,
            pub.longitude,
            pub.price_per_night,
            pub.capacity,
            pub.facilities,
            pub.rating,
            pub.open_now,
            pub.hours_open,
            pub.phone,
            pub.website,
          ]
        );
      }
      console.log('✅ Sample pubs created successfully');
    }

    console.log('\n📋 === SEED CREDENTIALS ===');
    console.log('Admin:');
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: ${'*'.repeat(adminPassword.length)} (check seed.js for actual password)`);
    console.log('\nHost:');
    console.log(`  Email: ${hostEmail}`);
    console.log(`  Password: ${'*'.repeat(hostPassword.length)} (check seed.js for actual password)`);
    console.log('==========================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
