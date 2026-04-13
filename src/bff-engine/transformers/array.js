/**
 * 数组处理函数
 * 专为 BFF 场景优化
 */

/**
 * 数组排序
 * @param {Array} arr - 待排序数组
 * @param {string} key - 排序字段
 * @param {string} order - 'asc' 或 'desc'
 * @returns {Array} 新数组（不修改原数组）
 */
function sortBy(arr, key, order = 'desc') {
  if (!Array.isArray(arr)) return [];
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    // 处理 undefined/null
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    
    const comparison = typeof aVal === 'string' 
      ? aVal.localeCompare(bVal) 
      : aVal - bVal;
    
    return order === 'desc' ? -comparison : comparison;
  });
}

/**
 * 分页
 * @param {Array} arr - 数据数组
 * @param {number} page - 页码（从1开始）
 * @param {number} pageSize - 每页数量
 * @returns {Object} { data, pagination: { page, pageSize, total, totalPages } }
 */
function paginate(arr, page = 1, pageSize = 10) {
  if (!Array.isArray(arr)) return { data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };
  
  const total = arr.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  
  return {
    data: arr.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

/**
 * 合并多个数组
 * @param {...Array} arrays - 要合并的数组
 * @returns {Array}
 */
function merge(...arrays) {
  return arrays.flat();
}

/**
 * 展平嵌套数组
 * @param {Array} arr - 嵌套数组
 * @param {number} depth - 展平深度，默认完全展平
 * @returns {Array}
 */
function flat(arr, depth = Infinity) {
  if (!Array.isArray(arr)) return [];
  return arr.flat(depth);
}

/**
 * 按字段分组
 * @param {Array} arr - 数据数组
 * @param {string|Function} key - 分组键或分组函数
 * @returns {Object} 分组结果对象
 */
function groupBy(arr, key) {
  if (!Array.isArray(arr)) return {};
  
  return arr.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
    return groups;
  }, {});
}

/**
 * 唯一过滤
 * @param {Array} arr - 数据数组
 * @param {string} [key] - 用于比较的唯一键
 * @returns {Array}
 */
function unique(arr, key) {
  if (!Array.isArray(arr)) return [];
  
  if (!key) return [...new Set(arr)];
  
  const seen = new Set();
  return arr.filter(item => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

/**
 * 映射提取字段
 * @param {Array} arr - 数据数组
 * @param {string} key - 要提取的字段
 * @returns {Array}
 */
function pluck(arr, key) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => item[key]).filter(val => val !== undefined);
}

/**
 * 过滤空值
 * @param {Array} arr - 数据数组
 * @returns {Array}
 */
function compact(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(item => item != null);
}

/**
 * 取前N个元素
 * @param {Array} arr - 数据数组
 * @param {number} n - 数量
 * @returns {Array}
 */
function take(arr, n) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, n);
}

/**
 * 跳过前N个元素
 * @param {Array} arr - 数据数组
 * @param {number} n - 数量
 * @returns {Array}
 */
function skip(arr, n) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(n);
}

module.exports = {
  sortBy,
  paginate,
  merge,
  flat,
  groupBy,
  unique,
  pluck,
  compact,
  take,
  skip,
};
