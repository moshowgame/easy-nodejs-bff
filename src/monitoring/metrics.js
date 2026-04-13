/**
 * Prometheus 指标定义
 * 定义常用指标：请求数、延迟、错误率、下游 API 调用状态
 */

const client = require('prom-client');

// 收集 Node.js 默认指标（CPU、内存等）
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

// HTTP 请求持续时间直方图（毫秒）
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['route', 'method', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
});

// HTTP 请求总数计数器
const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['route', 'method', 'status_code'],
});

// 下游 API 调用总数
const downstreamCallsTotal = new client.Counter({
  name: 'downstream_calls_total',
  help: 'Total calls to downstream APIs',
  labelNames: ['target', 'status'],
});

// 下游 API 调用持续时间（毫秒）
const downstreamCallDuration = new client.Histogram({
  name: 'downstream_call_duration_ms',
  help: 'Duration of downstream API calls in milliseconds',
  labelNames: ['target'],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000],
});

// 当前正在处理的请求数
const httpRequestsInProgress = new client.Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently being processed',
  labelNames: ['route'],
});

// BFF 业务自定义指标
const bffCustomMetrics = {
  // 全局 Top5 接口耗时
  globalTop5Duration: new client.Histogram({
    name: 'bff_global_top5_duration_ms',
    help: 'Duration of global-top5 endpoint in ms',
    buckets: [100, 250, 500, 1000, 2000, 5000],
  }),
  
  // 全球 Top5 总调用次数
  globalTop5Total: new client.Counter({
    name: 'bff_global_top5_total',
    help: 'Total calls to global-top5 endpoint',
  }),
};

module.exports = {
  // Prometheus 注册表
  register: client.register,
  client,
  
  // 默认指标收集器
  collectDefaultMetrics,
  
  // HTTP 指标
  httpRequestDuration,
  httpRequestTotal,
  httpRequestsInProgress,
  
  // 下游 API 指标
  downstreamCallsTotal,
  downstreamCallDuration,
  
  // BFF 业务自定义指标
  bffCustomMetrics,
};
