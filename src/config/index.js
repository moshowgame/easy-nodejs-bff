/**
 * 配置管理模块
 * 管理环境变量、API端点等配置
 */

const path = require('path');

// 默认配置
const defaults = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // 监控配置
  monitoring: {
    enabled: process.env.METRICS_ENABLED === 'true',
    metricsPath: '/metrics',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  
  // API 调用默认配置
  api: {
    defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT, 10) || 5000,
    retry: {
      retries: parseInt(process.env.RETRY_COUNT, 10) || 2,
      delay: parseInt(process.env.RETRY_DELAY, 10) || 300,
    },
    circuitBreaker: {
      enabled: process.env.CIRCUIT_BREAKER_ENABLED === 'true',
      threshold: parseInt(process.env.CB_THRESHOLD, 10) || 5,
      timeout: parseInt(process.env.CB_TIMEOUT, 10) || 10000,
      resetTimeout: parseInt(process.env.CB_RESET_TIMEOUT, 10) || 30000,
    },
  },
  
  // 缓存配置（可选 Redis）
  cache: {
    enabled: process.env.REDIS_URL ? true : false,
    url: process.env.REDIS_URL || null,
    defaultTTL: parseInt(process.env.CACHE_TTL, 10) || 60, // 秒
  },
  
  // 分布式追踪配置
  tracing: {
    enabled: process.env.TRACING_ENABLED === 'true',
    serviceName: process.env.OTEL_SERVICE_NAME || 'easy-nodejs-bff',
    exporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || null,
  },
};

// API 端点配置示例 - 用户可通过环境变量或代码覆盖
const apiEndpoints = {
  uk: process.env.API_UK_BASE || 'https://uk.api.example.com',
  cn: process.env.API_CN_BASE || 'https://cn.api.example.com',
  in: process.env.API_IN_BASE || 'https://in.api.example.com',
};

/**
 * 合并自定义配置与默认配置
 */
function mergeConfig(customConfig = {}) {
  return {
    ...defaults,
    ...customConfig,
    monitoring: { ...defaults.monitoring, ...(customConfig.monitoring || {}) },
    api: { 
      ...defaults.api, 
      ...(customConfig.api || {}),
      retry: { ...defaults.api.retry, ...((customConfig.api || {}).retry || {}) },
      circuitBreaker: { ...defaults.api.circuitBreaker, ...((customConfig.api || {}).circuitBreaker || {}) },
    },
    cache: { ...defaults.cache, ...(customConfig.cache || {}) },
    tracing: { ...defaults.tracing, ...(customConfig.tracing || {}) },
  };
}

/**
 * 获取当前环境
 */
function getEnv() {
  return defaults.nodeEnv;
}

/**
 * 是否为生产环境
 */
function isProduction() {
  return defaults.nodeEnv === 'production';
}

module.exports = {
  config: defaults,
  apiEndpoints,
  mergeConfig,
  getEnv,
  isProduction,
};
