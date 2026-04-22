import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/database.js';
import { config } from '../config.js';

export class AuthService {
  // Hash password with bcrypt (10 salt rounds for security + performance)
  static async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  // Verify password against hash
  static async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT token
  static generateToken(userId, role) {
    return jwt.sign(
      { user_id: userId, role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      return null;
    }
  }

  // Register new user
  static async register(email, name, password) {
    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const result = await query(
      'INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id, email, name, role',
      [email.toLowerCase(), name, passwordHash, 'normal_user']
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user');
    }

    const user = result.rows[0];

    // Generate token
    const token = this.generateToken(user.user_id, user.role);

    return {
      access_token: token,
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  // Login user
  static async login(email, password) {
    // Find user
    const result = await query(
      'SELECT user_id, email, name, password_hash, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await this.verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user.user_id, user.role);

    return {
      access_token: token,
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  // Get user by ID
  static async getUserById(userId) {
    const result = await query(
      'SELECT user_id, email, name, role, created_at FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async deleteUser(userId) {
    // Delete in dependency order to avoid FK constraint errors.
    // Bookings, reviews, favourites, notifications, chat messages, etc.
    await query('DELETE FROM bookings WHERE user_id = $1', [userId]);
    await query('DELETE FROM reviews WHERE user_id = $1', [userId]);
    await query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    // Remove the user row last
    await query('DELETE FROM users WHERE user_id = $1', [userId]);
  }
}
