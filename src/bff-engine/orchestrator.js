/**
 * 请求编排器
 * 负责并发调用多个地区的 API，支持部分失败
 */

const axios = require('axios');
const { retry, withTimeout } = require('../utils/retry');

// 延迟加载监控模块（避免循环依赖和未启用监控时的开销）
let _monitorDownstream = null;
let _downstreamCallDuration = null;
function getMonitor() {
  if (!_monitorDownstream) {
    try {
      const monitoring = require('../monitoring/middleware');
      const metrics = require('../monitoring/metrics');
      _monitorDownstream = monitoring.monitorDownstream;
      _downstreamCallDuration = metrics.downstreamCallDuration;
    } catch (e) {
      // 监控模块不可用，返回空操作
      return (target) => ({
        recordSuccess: () => {},
        recordFailure: () => {},
      });
    }
  }
  return _monitorDownstream;
}

function recordDownstreamDuration(target, duration) {
  if (_downstreamCallDuration) {
    try {
      _downstreamCallDuration.labels(target).observe(duration);
    } catch (e) {
      // 静默失败
    }
  }
}

/**
 * 执行单个 API 调用
 * @param {Object} api - API 配置
 * @param {Object} context - 上下文（用于传递请求信息等）
 * @returns {Promise<Object>} 调用结果
 */
async function callAPI(api, context = {}) {
  const {
    name,
    url,
    method = 'get',
    data,
    params,
    headers,
    timeout = 5000,
    retries = 0, // 单个 API 可配置重试次数
  } = api;

  const targetName = name || url;
  const monitor = getMonitor()(targetName);
  
  const startTime = Date.now();
  
  try {
    const result = await retry(
      () => withTimeout(
        axios({
          url,
          method,
          data,
          params,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          timeout,
        }),
        timeout + 1000 // 额外缓冲
      ),
      { retries, delay: 200 }
    );
    
    const duration = Date.now() - startTime;
    
    // 记录下游调用成功指标
    monitor.recordSuccess(duration);
    recordDownstreamDuration(targetName, duration);
    
    return {
      ok: true,
      data: result.data,
      status: result.status,
      duration,
      name: targetName,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    
    // 记录下游调用失败指标
    monitor.recordFailure(duration);
    recordDownstreamDuration(targetName, duration);
    
    return {
      ok: false,
      error: err.message || 'Unknown error',
      code: err.code || null,
      status: err.response?.status || null,
      duration,
      name: targetName,
    };
  }
}

/**
 * 并发调用 API 组
 * @param {Object} apiGroups - 分组的 API 配置
 *   格式: { groupName: [apiConfig1, apiConfig2], ... }
 * @param {Object} options - 编排选项
 * @param {Object} context - 上下文对象
 * @returns {Promise<Object>} 所有调用的结果
 * 
 * @example
 * const results = await orchestrate({
 *   regions: [
 *     { name: 'uk', url: 'https://uk.api/data' },
 *     { name: 'cn', url: 'https://cn.api/data' },
 *   ],
 *   services: [
 *     { name: 'user', url: 'https://user.api/info' },
 *   ]
 * });
 * // 返回:
 * // {
 * //   regions: [{ ok: true, data: {...}, name: 'uk' }, ...],
 * //   services: [{ ok: true, data: {...}, name: 'user' }],
 * // }
 */
async function orchestrate(apiGroups, options = {}, context = {}) {
  const { 
    concurrency = Infinity, // 并发限制
    failFast = false,       // 是否快速失败
    timeout = 30000,        // 整体超时时间
  } = options;
  
  const results = {};
  
  // 整体超时包装
  const allPromises = [];
  
  for (const [groupName, apis] of Object.entries(apiGroups)) {
    if (!Array.isArray(apis)) continue;
    
    // 为每个 API 创建调用 Promise
    const groupPromises = apis.map(api => callAPI(api, context));
    allPromises.push({ groupName, promises: groupPromises });
  }
  
  // 使用 allSettled 确保所有请求完成（或失败）
  for (const { groupName, promises } of allPromises) {
    if (failFast) {
      // 快速失败模式：使用 Promise.all
      try {
        results[groupName] = await Promise.all(promises);
      } catch (err) {
        results[groupName] = [{ ok: false, error: err.message }];
      }
    } else {
      // 默认模式：使用 allSettled，收集所有结果（包括失败的）
      const settled = await Promise.allSettled(promises);
      results[groupName] = settled.map((r, idx) => {
        if (r.status === 'fulfilled') {
          return r.value;
        }
        return {
          ok: false,
          error: r.reason?.message || 'Unknown error',
          name: `unknown_${idx}`,
        };
      });
    }
  }
  
  // 添加元数据
  results._meta = {
    totalGroups: Object.keys(apiGroups).length,
    timestamp: new Date().toISOString(),
  };
  
  return results;
}

/**
 * 按顺序执行 API 调用链
 * 前一个的结果可以传递给下一个
 * @param {Array} chain - API 调用数组
 * @param {Object} initialContext - 初始上下文
 * @returns {Promise<Array>} 所有结果
 */
async function pipeline(chain, initialContext = {}) {
  const results = [];
  let context = { ...initialContext };
  
  for (const step of chain) {
    const { 
      api, 
      transform, // 可选的数据转换函数
      condition,  // 可选的条件函数，返回 true 时才执行
    } = step;
    
    // 条件判断
    if (typeof condition === 'function' && !condition(context, results)) {
      results.push({ skipped: true });
      continue;
    }
    
    const result = await callAPI(api, context);
    
    // 数据转换
    if (result.ok && typeof transform === 'function') {
      result.data = transform(result.data, context);
    }
    
    // 更新上下文
    context.lastResult = result;
    context[api?.name] = result.data;
    
    results.push(result);
    
    // 如果失败且需要停止
    if (!result.ok && step.stopOnError !== false) {
      break;
    }
  }
  
  return results;
}

module.exports = {
  callAPI,
  orchestrate,
  pipeline,
};
