/**
 * 缓存工具
 * 支持 Redis 和内存缓存（降级）
 */

const logger = require('../monitoring/logger');

// 内存缓存（Redis 不可用时使用）
const memoryCache = new Map();
let cacheEnabled = false;
let redisClient = null;

/**
 * 初始化 Redis 缓存
 * @param {string} url - Redis URL
 */
async function initCache(url) {
  if (!url) {
    logger.info('No Redis URL provided, using memory cache');
    return;
  }
  
  try {
    const Redis = require('ioredis');
    redisClient = new Redis(url);
    
    redisClient.on('connect', () => {
      logger.info('Redis cache connected');
      cacheEnabled = true;
    });
    
    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
      // 回退到内存缓存
      cacheEnabled = false;
    });
    
    await redisClient.ping();
    cacheEnabled = true;
    
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to connect to Redis, falling back to memory cache');
    redisClient = null;
    cacheEnabled = false;
  }
}

/**
 * 获取缓存值
 * @param {string} key - 缓存键
 * @returns {Promise<*>} 缓存的值
 */
async function get(key) {
  if (!cacheEnabled && !redisClient) {
    return memoryCache.get(key);
  }
  
  if (redisClient && cacheEnabled) {
    try {
      const value = await redisClient.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (err) {
      logger.error({ err, key }, 'Cache get error');
      // 回退到内存
      return memoryCache.get(key);
    }
  }
  
  return memoryCache.get(key);
}

/**
 * 设置缓存值
 * @param {string} key - 缓存键
 * @param {*} value - 值
 * @param {number} ttlSeconds - TTL（秒）
 */
async function set(key, value, ttlSeconds = 60) {
  const serializedValue = JSON.stringify(value);
  
  if (redisClient && cacheEnabled) {
    try {
      await redisClient.setex(key, ttlSeconds, serializedValue);
    } catch (err) {
      logger.error({ err, key }, 'Cache set error');
      // 回退到内存
      memoryCache.set(key, value);
      // 内存缓存也设置 TTL（通过 setTimeout 清理）
      setTimeout(() => memoryCache.delete(key), ttlSeconds * 1000);
    }
  } else {
    memoryCache.set(key, value);
    setTimeout(() => memoryCache.delete(key), ttlSeconds * 1000);
  }
}

/**
 * 删除缓存键
 * @param {string} key - 缓存键
 */
async function del(key) {
  if (redisClient && cacheEnabled) {
    try {
      await redisClient.del(key);
    } catch (err) {
      logger.error({ err, key }, 'Cache del error');
      memoryCache.delete(key);
    }
  } else {
    memoryCache.delete(key);
  }
}

/**
 * 清空所有缓存
 */
async function flush() {
  if (redisClient && cacheEnabled) {
    try {
      await redisClient.flushdb();
    } catch (err) {
      logger.error({ err }, 'Cache flush error');
    }
  }
  memoryCache.clear();
}

/**
 * 包装函数，添加自动缓存
 * @param {Function} fn - 要包装的异步函数
 * @param {Function} keyFn - 生成缓存键的函数 (args) => string
 * @param {Object} options - 缓存选项 { ttl: 60 }
 * @returns {Function} 包装后的函数
 */
function withCache(fn, keyFn, options = {}) {
  const { ttl = 60, enabled = true } = options;
  
  return async (...args) => {
    if (!enabled) {
      return fn(...args);
    }
    
    const key = typeof keyFn === 'function' ? keyFn(args) : JSON.stringify(args);
    
    // 尝试从缓存获取
    const cached = await get(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }
    
    // 执行原函数
    const result = await fn(...args);
    
    // 存入缓存
    await set(key, result, ttl);
    
    return result;
  };
}

module.exports = {
  initCache,
  get,
  set,
  del,
  flush,
  withCache,
};
