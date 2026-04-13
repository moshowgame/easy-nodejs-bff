/**
 * 高级数据转换函数
 * 专为 BFF 场景优化
 */

const { sortBy, filter: arrayFilter, map } = require('./array');

/**
 * 转换数组中的每个元素
 * @param {Array} arr - 数据数组
 * @param {Function} fn - 转换函数
 * @returns {Array}
 */
function transformArray(arr, fn) {
  if (!Array.isArray(arr)) return [];
  return arr.map(fn);
}

/**
 * 根据条件过滤数组元素
 * @param {Array} arr - 数据数组
 * @param {Object|Function} condition - 过滤条件或函数
 * @returns {Array}
 */
function filterBy(arr, condition) {
  if (!Array.isArray(arr)) return [];
  
  if (typeof condition === 'function') {
    return arr.filter(condition);
  }
  
  // 对象条件：所有键值对都匹配的元素
  return arr.filter(item => 
    Object.entries(condition).every(([key, value]) => item[key] === value)
  );
}

/**
 * 查找第一个匹配条件的元素
 * @param {Array} arr - 数据数组
 * @param {Object|Function} condition - 查找条件或函数
 * @returns {*}
 */
function findWhere(arr, condition) {
  if (!Array.isArray(arr)) return undefined;
  
  if (typeof condition === 'function') {
    return arr.find(condition);
  }
  
  return arr.find(item =>
    Object.entries(condition).every(([key, value]) => item[key] === value)
  );
}

/**
 * 求和（指定字段）
 * @param {Array} arr - 数据数组
 * @param {string} key - 字段名，不传则求元素本身之和
 * @returns {number}
 */
function sumBy(arr, key) {
  if (!Array.isArray(arr)) return 0;
  
  const values = key ? arr.map(item => item[key]) : arr;
  return values.reduce((sum, val) => sum + (Number(val) || 0), 0);
}

/**
 * 计算平均值（指定字段）
 * @param {Array} arr - 数据数组
 * @param {string} key - 字段名
 * @returns {number}
 */
function avgBy(arr, key) {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return sumBy(arr, key) / arr.length;
}

/**
 * 找出最大值（指定字段）
 * @param {Array} arr - 数据数组
 * @param {string} key - 字段名
 * @returns {*}
 */
function maxBy(arr, key) {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  return sortBy(arr, key, 'desc')[0];
}

/**
 * 找出最小值（指定字段）
 * @param {Array} arr - 数据数组
 * @param {string} key - 字段名
 * @returns {*}
 */
function minBy(arr, key) {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  return sortBy(arr, key, 'asc')[0];
}

/**
 * 分组计数
 * @param {Array} arr - 数据数组
 * @param {string|Function} key - 分组键或分组函数
 * @returns {Object}
 */
function countBy(arr, key) {
  if (!Array.isArray(arr)) return {};
  
  return arr.reduce((counts, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    counts[groupKey] = (counts[groupKey] || 0) + 1;
    return counts;
  }, {});
}

/**
 * 将数组转换为键值映射对象
 * @param {Array} arr - 数据数组
 * @param {string} keyField - 作为键的字段
 * @param {string} [valueField] - 作为值的字段（不传则保留整个对象）
 * @returns {Object}
 */
function keyBy(arr, keyField, valueField) {
  if (!Array.isArray(arr)) return {};
  
  return arr.reduce((map, item) => {
    const key = item[keyField];
    if (key !== undefined && key !== null) {
      map[key] = valueField ? item[valueField] : item;
    }
    return map;
  }, {});
}

/**
 * 展开嵌套结构（将子元素提升为平铺列表）
 * @param {Array} arr - 数据数组
 * @param {string} childKey - 子元素所在的字段
 * @returns {Array}
 */
function unnest(arr, childKey) {
  if (!Array.isArray(arr)) return [];
  
  return arr.flatMap(item => {
    const children = item[childKey];
    if (Array.isArray(children)) {
      // 将父级信息合并到子元素中
      const parentInfo = { ...item };
      delete parentInfo[childKey];
      return children.map(child => ({ ...parentInfo, ...child }));
    }
    return [item];
  });
}

/**
 * 分区：根据条件将数组分为两组
 * @param {Array} arr - 数据数组
 * @param {Function} condition - 分区函数
 * @returns {Array} [[trueItems], [falseItems]]
 */
function partition(arr, condition) {
  if (!Array.isArray(arr)) return [[], []];
  
  return arr.reduce(
    ([truthy, falsy], item) => {
      (condition(item) ? truthy : falsy).push(item);
      return [truthy, falsy];
    },
    [[], []]
  );
}

/**
 * 链式调用包装器
 * 允许连续调用多个转换操作
 * @param {*} data - 初始数据
 * @returns {Object} 链式对象
 */
function chain(data) {
  let current = data;
  
  return {
    sort(key, order) {
      current = sortBy(current, key, order);
      return this;
    },
    
    paginate(page, pageSize) {
      const result = require('./array').paginate(current, page,pageSize);
      current = result.data;
      this._pagination = result.pagination;
      return this;
    },
    
    filter(condition) {
      current = filterBy(current, condition);
      return this;
    },
    
    map(fn) {
      current = transformArray(current, fn);
      return this;
    },
    
    pick(keys) {
      if (typeof keys === 'function') {
        current = current.map(item => pick(item, keys(item)));
      } else {
        const { pick: pickObj } = require('./object');
        current = current.map(item => pickObj(item, keys));
      }
      return this;
    },
    
    take(n) {
      const { take: takeFn } = require('./array');
      current = takeFn(current, n);
      return this;
    },
    
    unique(key) {
      const { unique: uniqueFn } = require('./array');
      current = uniqueFn(current, key);
      return this;
    },
    
    value() {
      return current;
    },
    
    done() {
      return {
        data: current,
        pagination: this._pagination || null,
      };
    },
  };
}

module.exports = {
  transformArray,
  filterBy,
  findWhere,
  sumBy,
  avgBy,
  maxBy,
  minBy,
  countBy,
  keyBy,
  unnest,
  partition,
  chain,
};
