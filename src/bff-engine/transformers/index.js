/**
 * Transformers 统一导出入口
 * 提供所有数据处理函数的统一访问点
 */

const array = require('./array');
const object = require('./object');
const transform = require('./transform');

// 自定义 transformer 注册表
const customTransformers = {};

/**
 * 注册自定义 transformer
 * @param {string} name - transformer 名称
 * @param {Function} fn - 转换函数
 */
function register(name, fn) {
  if (typeof name !== 'string' || typeof fn !== 'function') {
    throw new Error('register() requires a string name and function');
  }
  customTransformers[name] = fn;
}

/**
 * 获取已注册的自定义 transformer
 * @param {string} name - 名称
 * @returns {Function|undefined}
 */
function getTransformer(name) {
  return customTransformers[name];
}

// 导出所有内置 transformers
module.exports = {
  // 数组操作
  ...array,
  
  // 对象操作
  ...object,
  
  // 高级转换
  ...transform,
  
  // 自定义 transformer 管理
  register,
  getTransformer,
};
