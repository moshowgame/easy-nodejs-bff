/**
 * 示例路由：跨地区数据列表
 * 演示分页、过滤、聚合等高级用法
 */

const express = require('express');
const router = express.Router();
const { orchestrate } = require('../bff-engine/orchestrator');
const { 
  paginate, 
  sortBy, 
  merge: mergeArrays, 
  filterBy, 
  groupBy,
  chain,
} = require('../bff-engine/transformers');
const logger = require('../monitoring/logger');

// GET /api/cross-region-list
router.get('/cross-region-list', async (req, res, next) => {
  const startTime = Date.now();
  
  // 获取 Mock API 基础 URL（默认本地）
  const mockBase = process.env.MOCK_API_BASE || 'http://localhost:3100';
  
  try {
    // 查询参数
    const { page = 1, pageSize = 20, category, region, sort = 'date' } = req.query;
    
    // 定义要调用的 API 组
    const apiGroups = {
      regions: [
        {
          name: 'uk',
          url: process.env.API_UK_LIST || `${mockBase}/uk/list`,
          timeout: 3000,
          retries: 1,
          params: { limit: 100 },
        },
        {
          name: 'cn',
          url: process.env.API_CN_LIST || `${mockBase}/cn/list`,
          timeout: 3000,
          retries: 1,
          params: { limit: 100 },
        },
        {
          name: 'in',
          url: process.env.API_IN_LIST || `${mockBase}/in/list`,
          timeout: 3000,
          retries: 1,
          params: { limit: 100 },
        },
      ],
    };
    
    // 并发调用所有地区 API
    const rawResults = await orchestrate(apiGroups);
    
    // 提取成功的响应并合并数据
    const successfulRegions = rawResults.regions.filter(r => r.ok);
    const failedRegions = rawResults.regions.filter(r => !r.ok);
    
    // 记录失败的调用
    if (failedRegions.length > 0) {
      logger.warn({
        failedAPIs: failedRegions.map(f => ({ name: f.name, error: f.error }))
      }, 'some region APIs failed');
    }
    
    // 合并各地区的数据（假设返回格式为 { items: [...] }）
    let allItems = mergeArrays(
      ...successfulRegions.map(r => {
        // 为每项添加来源区域标记
        return (r.data?.items || []).map(item => ({
          ...item,
          _sourceRegion: r.name,
        }));
      })
    );
    
    // 使用链式操作处理数据
    const result = chain(allItems)
      .filter(item => item && typeof item === 'object') // 过滤无效数据
      .value();
    
    allItems = result;
    
    // 按类别过滤（如果提供）
    if (category) {
      allItems = filterBy(allItems, { category });
    }
    
    // 按区域过滤（如果提供）
    if (region) {
      allItems = filterBy(allItems, { _sourceRegion: region });
    }
    
    // 排序
    if (sort && sort.startsWith('-')) {
      // 降序
      const sortField = sort.slice(1);
      allItems = sortBy(allItems, sortField, 'desc');
    } else if (sort) {
      // 升序
      allItems = sortBy(allItems, sort, 'asc');
    }
    
    // 分页
    const paginatedResult = paginate(allItems, parseInt(page), parseInt(pageSize));
    
    // 统计信息
    const stats = groupBy(allItems, '_sourceRegion');
    const statsSummary = Object.entries(stats).map(([region, items]) => ({
      region,
      count: items.length,
    }));
    
    const duration = Date.now() - startTime;
    
    res.json({
      code: 200,
      data: paginatedResult.data,
      pagination: paginatedResult.pagination,
      meta: {
        durationMs: duration,
        regionsQueried: successfulRegions.length,
        regionsFailed: failedRegions.length,
        totalItemsBeforePagination: allItems.length,
        regionStats: statsSummary,
      },
    });
    
  } catch (err) {
    logger.error({ err }, 'cross-region-list request failed');
    next(err);
  }
});

module.exports = router;
