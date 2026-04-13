/**
 * HTTP 请求监控中间件
 * 自动记录每个请求的耗时、状态码等指标
 */

const { httpRequestDuration, httpRequestTotal, downstreamCallsTotal } = require('./metrics');
const logger = require('./logger');

/**
 * 创建监控中间件
 */
function monitoringMiddleware(req, res, next) {
  const start = Date.now();
  const startHrTime = process.hrtime();
  
  // 记录请求开始
  logger.debug({
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
  }, 'request started');
  
  // 响应完成时记录指标
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const route = req.route?.path || req.baseUrl + req.path || 'unknown';
    
    // Prometheus 指标
    httpRequestDuration.labels(route, req.method, res.statusCode).observe(durationMs);
    httpRequestTotal.labels(route, req.method, res.statusCode).inc();
    
    // 结构化日志
    logger.info({
      request: {
        method: req.method,
        url: req.url,
        route,
        userAgent: req.get('user-agent'),
        ip: req.ip || req.connection.remoteAddress,
      },
      response: {
        statusCode: res.statusCode,
        durationMs,
      },
    }, 'request completed');
  });
  
  next();
}

/**
 * 错误处理中间件（配合监控使用）
 */
function errorMiddleware(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const route = req.route?.path || req.path || 'unknown';
  
  logger.error({
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    request: {
      method: req.method,
      url: req.url,
      route,
    },
  }, 'request error');
  
  // 错误计数
  httpRequestTotal.labels(route, req.method, statusCode).inc();
  
  // 返回标准化错误响应
  res.status(statusCode).json({
    code: statusCode,
    message: isProduction() ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/**
 * 下游 API 调用监控包装器
 * 包装 API 调用，自动记录调用状态
 */
function monitorDownstream(target) {
  return {
    recordSuccess(duration) {
      downstreamCallsTotal.labels(target, 'success').inc();
    },
    recordFailure(duration) {
      downstreamCallsTotal.labels(target, 'failure').inc();
    },
  };
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

module.exports = {
  monitoringMiddleware,
  errorMiddleware,
  monitorDownstream,
};
