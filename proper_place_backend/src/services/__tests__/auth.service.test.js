import { AuthService } from '../services/auth.service.js';
import * as bcrypt from 'bcryptjs';

// Mock database queries
jest.mock('../db/database.js', () => ({
  query: jest.fn(),
}));

describe('AuthService', () => {
  const mockEmail = 'test@example.com';
  const mockPassword = 'TestPassword123';
  const mockName = 'Test User';

  describe('Password Hashing', () => {
    test('should hash password with bcryptjs', async () => {
      const hash = await AuthService.hashPassword(mockPassword);
      expect(hash).not.toBe(mockPassword);
      expect(hash).toBeTruthy();
    });

    test('should verify correct password', async () => {
      const hash = await AuthService.hashPassword(mockPassword);
      const isValid = await AuthService.verifyPassword(mockPassword, hash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const hash = await AuthService.hashPassword(mockPassword);
      const isValid = await AuthService.verifyPassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    test('should generate valid JWT token', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const token = AuthService.generateToken(userId, 'normal_user');
      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should verify valid token', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const token = AuthService.generateToken(userId, 'normal_user');
      const decoded = AuthService.verifyToken(token);
      expect(decoded).toBeTruthy();
      expect(decoded.user_id).toBe(userId);
      expect(decoded.role).toBe('normal_user');
    });

    test('should reject invalid token', () => {
      const decoded = AuthService.verifyToken('invalid.token.here');
      expect(decoded).toBe(null);
    });
  });

  describe('Registration', () => {
    test('should throw error if email already exists', async () => {
      const { query } = require('../db/database.js');
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // User exists

      await expect(
        AuthService.register(mockEmail, mockName, mockPassword)
      ).rejects.toThrow('Email already registered');
    });

    test('should create new user with hashed password', async () => {
      const { query } = require('../db/database.js');
      const mockUserId = '550e8400-e29b-41d4-a716-446655440000';

      // Mock: No existing user
      query.mockResolvedValueOnce({ rows: [] });

      // Mock: User creation
      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: mockUserId,
            email: mockEmail,
            name: mockName,
            role: 'normal_user',
          },
        ],
      });

      const result = await AuthService.register(mockEmail, mockName, mockPassword);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user_id', mockUserId);
      expect(result).toHaveProperty('email', mockEmail);
      expect(result).toHaveProperty('role', 'normal_user');
    });
  });

  describe('Login', () => {
    test('should throw error if user not found', async () => {
      const { query } = require('../db/database.js');
      query.mockResolvedValueOnce({ rows: [] }); // User not found

      await expect(
        AuthService.login(mockEmail, mockPassword)
      ).rejects.toThrow('Invalid email or password');
    });

    test('should throw error if password incorrect', async () => {
      const { query } = require('../db/database.js');
      const hash = await AuthService.hashPassword(mockPassword);

      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            email: mockEmail,
            name: mockName,
            password_hash: hash,
            role: 'normal_user',
          },
        ],
      });

      await expect(
        AuthService.login(mockEmail, 'WrongPassword')
      ).rejects.toThrow('Invalid email or password');
    });

    test('should return token on successful login', async () => {
      const { query } = require('../db/database.js');
      const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
      const hash = await AuthService.hashPassword(mockPassword);

      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: mockUserId,
            email: mockEmail,
            name: mockName,
            password_hash: hash,
            role: 'normal_user',
          },
        ],
      });

      const result = await AuthService.login(mockEmail, mockPassword);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user_id', mockUserId);
      expect(result).toHaveProperty('email', mockEmail);
    });
  });

  describe('Get User', () => {
    test('should return user if found', async () => {
      const { query } = require('../db/database.js');
      const mockUserId = '550e8400-e29b-41d4-a716-446655440000';

      query.mockResolvedValueOnce({
        rows: [
          {
            user_id: mockUserId,
            email: mockEmail,
            name: mockName,
            role: 'normal_user',
            created_at: new Date(),
          },
        ],
      });

      const result = await AuthService.getUserById(mockUserId);

      expect(result).toHaveProperty('user_id', mockUserId);
      expect(result).toHaveProperty('email', mockEmail);
    });

    test('should return null if user not found', async () => {
      const { query } = require('../db/database.js');
      query.mockResolvedValueOnce({ rows: [] });

      const result = await AuthService.getUserById('invalid-id');

      expect(result).toBe(null);
    });
  });
});
