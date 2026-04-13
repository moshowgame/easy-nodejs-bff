/**
 * BFF 处理链构建器
 * 提供声明式的 DSL 用于构建 BFF 接口处理逻辑
 */

const { orchestrate, pipeline } = require('./orchestrator');
const transformers = require('./transformers');

/**
 * 创建 BFF 处理器
 * @param {Object} config - 配置
 */
function createHandler(config = {}) {
  const {
    apiGroups = {},
    transform: transformFn,
    errorTransform,
    timeout = 30000,
    cacheOptions = null, // { ttl: 60 }
  } = config;
  
  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      // 1. 调用 API 组
      let results;
      
      if (config.pipeline) {
        // 使用管道模式
        results = await pipeline(config.pipeline, req);
      } else if (Object.keys(apiGroups).length > 0) {
        // 使用编排模式
        results = await orchestrate(apiGroups, {}, req);
      } else {
        results = {};
      }
      
      let data = results;
      
      // 2. 数据转换
      if (typeof transformFn === 'function') {
        data = await transformFn(results, req);
      }
      
      // 3. 构建响应
      const response = {
        code: 200,
        data,
        meta: {
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
      
      // 记录指标
      if (req.metrics) {
        req.metrics.observe(`bff.handler.duration`, Date.now() - startTime);
      }
      
      res.json(response);
      
    } catch (err) {
      const errorResponse = {
        code: err.statusCode || 500,
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal Server Error' 
          : err.message,
        meta: {
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
      
      if (errorTransform) {
        return errorTransform(err, req, res, next);
      }
      
      next(err);
    }
  };
}

/**
 * DSL 构建器
 * 支持链式调用定义 BFF 接口
 * 
 * @example
 * handlerBuilder()
 *   .from({
 *     regions: [{ name: 'uk', url: '...' }, ...]
 *   })
 *   .transform((results) => {
 *     // 处理数据
 *   })
 *   .cache(60)
 *   .build()
 */
function handlerBuilder() {
  let _apiGroups = {};
  let _pipeline = [];
  let _transforms = [];
  let _cacheTTL = null;
  let _timeout = 30000;
  
  return {
    /**
     * 定义 API 调用源（编排模式）
     * @param {Object} groups - API 组配置
     */
    from(groups) {
      _apiGroups = groups;
      return this;
    },
    
    /**
     * 定义管道模式调用链
     * @param {Array} chain - 管道步骤数组
     */
    usePipeline(chain) {
      _pipeline = chain;
      return this;
    },
    
    /**
     * 添加数据转换步骤
     * @param {Function} fn - 转换函数
     */
    transform(fn) {
      _transforms.push(fn);
      return this;
    },
    
    /**
     * 启用缓存
     * @param {number} ttl - 缓存时间（秒）
     */
    cache(ttl) {
      _cacheTTL = ttl || 60;
      return this;
    },
    
    /**
     * 设置超时时间
     * @param {number} ms - 毫秒
     */
    timeout(ms) {
      _timeout = ms;
      return this;
    },
    
    /**
     * 构建最终的处理函数
     */
    build() {
      const transformFn = _transforms.length > 1
        ? async (data, req) => {
            let result = data;
            for (const fn of _transforms) {
              result = await fn(result, req);
            }
            return result;
          }
        : _transforms[0] || null;
      
      return createHandler({
        apiGroups: _apiGroups,
        pipeline: _pipeline.length > 0 ? _pipeline : null,
        transform: transformFn,
        cacheOptions: _cacheTTL ? { ttl: _cacheTTL } : null,
        timeout: _timeout,
      });
    },
  };
}

/**
 * 快速创建路由处理器
 * @param {Object} options - 配置选项
 * @returns {Function} Express 中间件函数
 */
function bff(options) {
  if (typeof options === 'function') {
    // 如果传入的是函数，直接作为处理器
    return options;
  }
  
  return createHandler(options);
}

module.exports = {
  createHandler,
  handlerBuilder,
  bff,
};
