const redis = require('redis');
const logger = require('./logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Skip Redis connection for now - running without cache
      logger.warn('Redis disabled - running without cache for development');
      this.isConnected = false;
      return;
      
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.warn('Redis server refused the connection');
            return new Error('Redis server refused the connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            logger.error('Redis max retry attempts reached');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('connect', () => {
        logger.info('📦 Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        logger.error('Redis error:', err);
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.warn('Redis not available, running without cache:', error.message);
      this.isConnected = false;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.isConnected) return false;
    
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async flush() {
    if (!this.isConnected) return false;
    
    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  // Cache patterns for common queries
  async cacheUser(userId, userData, ttl = 1800) {
    return this.set(`user:${userId}`, userData, ttl);
  }

  async getCachedUser(userId) {
    return this.get(`user:${userId}`);
  }

  async cacheCourse(courseId, courseData, ttl = 3600) {
    return this.set(`course:${courseId}`, courseData, ttl);
  }

  async getCachedCourse(courseId) {
    return this.get(`course:${courseId}`);
  }

  async cacheLeaderboard(courseId, leaderboardData, ttl = 300) {
    return this.set(`leaderboard:${courseId}`, leaderboardData, ttl);
  }

  async getCachedLeaderboard(courseId) {
    return this.get(`leaderboard:${courseId}`);
  }

  async cacheAssignments(courseId, assignments, ttl = 600) {
    return this.set(`assignments:${courseId}`, assignments, ttl);
  }

  async getCachedAssignments(courseId) {
    return this.get(`assignments:${courseId}`);
  }

  // Invalidate cache patterns
  async invalidateUser(userId) {
    await this.del(`user:${userId}`);
  }

  async invalidateCourse(courseId) {
    await this.del(`course:${courseId}`);
    await this.del(`leaderboard:${courseId}`);
    await this.del(`assignments:${courseId}`);
  }
}

module.exports = new CacheService();
