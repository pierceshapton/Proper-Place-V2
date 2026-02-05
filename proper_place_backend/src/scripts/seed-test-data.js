import { query } from '../db/database.js';
import { AuthService } from '../services/auth.service.js';

/**
 * Test data seeding script
 * Creates test users for manual testing and QA
 * 
 * Usage: node src/scripts/seed-test-data.js
 */

const TEST_USERS = [
  {
    email: 'normaluser@test.com',
    name: 'Normal User',
    password: 'TestPassword123',
    role: 'normal_user',
  },
  {
    email: 'hostuser@test.com',
    name: 'Host User',
    password: 'TestPassword123',
    role: 'host',
  },
  {
    email: 'admin@test.com',
    name: 'Admin User',
    password: 'TestPassword123',
    role: 'admin',
  },
  {
    email: 'john.doe@test.com',
    name: 'John Doe',
    password: 'TestPassword123',
    role: 'normal_user',
  },
  {
    email: 'jane.smith@test.com',
    name: 'Jane Smith',
    password: 'TestPassword123',
    role: 'host',
  },
];

async function seedTestData() {
  console.log('🌱 Seeding test data...\n');

  try {
    for (const user of TEST_USERS) {
      try {
        const result = await AuthService.register(
          user.email,
          user.name,
          user.password
        );

        console.log(`✅ Created user: ${user.email}`);
        console.log(`   User ID: ${result.user_id}`);
        console.log(`   Role: ${result.role}`);
        console.log(`   Token: ${result.access_token.substring(0, 20)}...\n`);

        // If not normal_user role, update the role
        if (user.role !== 'normal_user') {
          await query(
            'UPDATE users SET role = $1 WHERE user_id = $2',
            [user.role, result.user_id]
          );
          console.log(`   → Updated role to: ${user.role}\n`);
        }
      } catch (error) {
        if (error.message.includes('already registered')) {
          console.log(`⚠️  User already exists: ${user.email}\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('🎉 Test data seeding complete!\n');
    console.log('📝 Test Credentials:');
    TEST_USERS.forEach((user) => {
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Role: ${user.role}\n`);
    });
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestData().then(() => {
    process.exit(0);
  });
}

export { seedTestData };
