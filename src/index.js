/**
 * easy-nodejs-bff 核心模块
 * 框架主入口，提供 createBFFApp 等核心 API
 */

const express = require('express');
const { mergeConfig } = require('./config');
const { monitoringMiddleware, errorMiddleware } = require('./monitoring/middleware');
const { metrics } = require('./monitoring/metrics');
const logger = require('./monitoring/logger');
const transformers = require('./bff-engine/transformers');
const { orchestrate, pipeline, callAPI } = require('./bff-engine/orchestrator');
const { createHandler, handlerBuilder, bff } = require('./bff-engine/handler-builder');

/**
 * 初始化分布式追踪（可选）
 * @param {Object} config - 追踪配置
 */
function initTracing(config = {}) {
  if (!config.enabled) return;
  
  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    
    const sdk = new NodeSDK({
      serviceName: config.serviceName || 'easy-nodejs-bff',
      instrumentations: [getNodeAutoInstrumentations()],
    });
    
    sdk.start().then(() => {
      logger.info('OpenTelemetry tracing initialized');
    }).catch((err) => {
      logger.warn({ err: err.message }, 'Failed to initialize OpenTelemetry, tracing disabled');
    });
    
  } catch (err) {
    // opentelemetry 包未安装时静默失败
    logger.warn('OpenTelemetry packages not installed, tracing disabled');
  }
}

/**
 * 创建 BFF 应用实例
 * 
 * @param {Object} userConfig - 用户配置（会与默认配置合并）
 * @returns {express.Application} Express 应用实例
 * 
 * @example
 * const app = createBFFApp({
 *   monitoring: true,
 *   defaultTimeout: 5000,
 * });
 */
function createBFFApp(userConfig = {}) {
  // 合并配置
  const config = mergeConfig(userConfig);
  
  // 创建 Express 应用
  const app = express();
  
  // 基础中间件
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // 请求 ID 中间件（可选）
  app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
    res.setHeader('X-Request-ID', req.id);
    next();
  });
  
  // 监控中间件（如果启用）
  if (config.monitoring.enabled) {
    app.use(monitoringMiddleware);
    
    // 注入 metrics 对象到请求中，方便业务代码使用
    app.use((req, res, next) => {
      req.metrics = {
        observe(name, value) {
          // 自定义指标记录逻辑
          if (metrics.bffCustomMetrics[name]) {
            metrics.bffCustomMetrics[name].observe(value);
          }
        },
        inc(name) {
          if (metrics.bffCustomMetrics[name]) {
            metrics.bffCustomMetrics[name].inc(1);
          }
        },
      };
      next();
    });
    
    // Prometheus 指标端点
    app.get(config.monitoring.metricsPath || '/metrics', async (_req, res) => {
      try {
        res.set('Content-Type', metrics.register.contentType);
        res.end(await metrics.register.metrics());
      } catch (err) {
        res.status(500).end(err.message);
      }
    });
    
    logger.info(`Monitoring enabled. Metrics available at ${config.monitoring.metricsPath}`);
  }
  
  // 错误处理中间件
  app.use(errorMiddleware);
  
  // 初始化追踪
  initTracing(config.tracing);
  
  // 记录应用启动信息
  logger.info({
    config: {
      port: config.port,
      env: config.nodeEnv,
      monitoring: config.monitoring.enabled,
      cache: config.cache.enabled,
    },
  }, 'BFF application created');
  
  // 将配置和工具挂载到 app 上，方便访问
  app._config = config;
  app._transformers = transformers;
  app._orchestrate = orchestrate;
  app._pipeline = pipeline;
  
  return app;
}

// 导出所有公共 API
module.exports = {
  // 核心 API
  createBFFApp,
  
  // 引擎模块
  orchestrate,
  pipeline,
  callAPI,
  
  // 数据转换器
  ...transformers,
  
  // DSL 构建器
  createHandler,
  handlerBuilder,
  bff,
};
