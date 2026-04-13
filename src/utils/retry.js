/**
 * 重试机制
 * 支持配置重试次数和退避策略
 */

async function retry(fn, options = {}) {
  const { 
    retries = 2, 
    delay = 300,
    backoff = 'linear', // 'linear' | 'exponential'
    onRetry = null, // 回调函数，每次重试时调用
  } = options;
  
  let lastError;
  
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      
      if (i < retries) {
        // 计算延迟时间
        const currentDelay = backoff === 'exponential' 
          ? delay * Math.pow(2, i) 
          : delay * (i + 1);
        
        // 调用重试回调
        if (typeof onRetry === 'function') {
          onRetry(i + 1, err, currentDelay);
        }
        
        await new Promise(resolve => setTimeout(resolve, currentDelay));
      }
    }
  }
  
  throw lastError;
}

/**
 * 带超时的异步执行
 */
function withTimeout(promise, ms, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}

/**
 * 断路器包装器 (使用 opossum)
 */
function createCircuitBreaker(fn, options = {}) {
  try {
    const CircuitBreaker = require('opossum');
    
    const breakerOptions = {
      timeout: options.timeout || 10000,
      errorThresholdPercentage: options.threshold || 50,
      resetTimeout: options.resetTimeout || 30000,
      ...options,
    };
    
    const breaker = new CircuitBreaker(fn, breakerOptions);
    
    // 事件监听
    breaker.on('open', () => console.warn(`[CircuitBreaker] Circuit opened for ${options.name || 'unknown'}`));
    breaker.on('halfOpen', () => console.log(`[CircuitBreaker] Circuit half-open for ${options.name || 'unknown'}`));
    breaker.on('close', () => console.log(`[CircuitBreaker] Circuit closed for ${options.name || 'unknown'}`));
    
    return breaker;
  } catch (err) {
    // opossum 未安装时回退到普通函数
    console.warn('[CircuitBreaker] opossum not installed, falling back to normal function');
    return { fire: fn };
  }
}

module.exports = {
  retry,
  withTimeout,
  createCircuitBreaker,
};
