/**
 * 对象处理函数
 * 专为 BFF 场景优化
 */

/**
 * 选择对象的指定字段
 * @param {Object} obj - 源对象
 * @param {Array<string>} keys - 要选择的字段
 * @returns {Object} 新对象
 */
function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return {};
  return keys.reduce((result, key) => {
    if (key in obj) result[key] = obj[key];
    return result;
  }, {});
}

/**
 * 排除对象的指定字段
 * @param {Object} obj - 源对象
 * @param {Array<string>} keys - 要排除的字段
 * @returns {Object} 新对象
 */
function omit(obj, keys) {
  if (!obj || typeof obj !== 'object') return {};
  const keySet = new Set(keys);
  return Object.entries(obj).reduce((result, [key, value]) => {
    if (!keySet.has(key)) result[key] = value;
    return result;
  }, {});
}

/**
 * 重命名对象的键
 * @param {Object} obj - 源对象
 * @param {Object} keyMap - 键映射对象 { oldKey: newKey }
 * @returns {Object} 新对象
 */
function renameKeys(obj, keyMap) {
  if (!obj || typeof obj !== 'object') return {};
  
  return Object.entries(obj).reduce((result, [key, value]) => {
    const newKey = keyMap[key] || key;
    result[newKey] = value;
    return result;
  }, {});
}

/**
 * 映射对象的所有值
 * @param {Object} obj - 源对象
 * @param {Function} fn - 映射函数
 * @returns {Object}
 */
function mapValues(obj, fn) {
  if (!obj || typeof obj !== 'object') return {};
  
  return Object.entries(obj).reduce((result, [key, value]) => {
    result[key] = fn(value, key);
    return result;
  }, {});
}

/**
 * 深度合并多个对象（浅层实现，适合 BFF 场景）
 * @param {...Object} objects - 要合并的对象
 * @returns {Object}
 */
function mergeDeep(...objects) {
  return objects.reduce((result, obj) => {
    if (!obj || typeof obj !== 'object') return result;
    
    Object.entries(obj).forEach(([key, value]) => {
      if (
        value && 
        typeof value === 'object' && 
        !Array.isArray(value) &&
        result[key] &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key])
      ) {
        result[key] = mergeDeep(result[key], value);
      } else {
        result[key] = value;
      }
    });
    
    return result;
  }, {});
}

/**
 * 获取嵌套属性值（安全访问）
 * @param {Object} obj - 源对象
 * @param {string} path - 属性路径，如 "a.b.c"
 * @param {*} defaultValue - 默认值
 * @returns {*}
 */
function get(obj, path, defaultValue = undefined) {
  if (!obj || typeof path !== 'string') return defaultValue;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current == null) return defaultValue;
    current = current[key];
  }
  
  return current !== undefined ? current : defaultValue;
}

/**
 * 设置嵌套属性值
 * @param {Object} obj - 目标对象
 * @param {string} path - 属性路径
 * @param {*} value - 值
 * @returns {Object}
 */
function set(obj, path, value) {
  if (!obj || typeof path !== 'string') return obj;
  
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return obj;
}

module.exports = {
  pick,
  omit,
  renameKeys,
  mapValues,
  mergeDeep,
  get,
  set,
};
