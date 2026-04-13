/**
 * 示例路由：全球 Top5 排行榜
 * 演示如何使用 orchestrate + transformers
 */

const express = require('express');
const router = express.Router();
const { orchestrate } = require('../bff-engine/orchestrator');
const { sortBy, merge: mergeArrays, take } = require('../bff-engine/transformers');
const logger = require('../monitoring/logger');

// GET /api/global-top5
router.get('/global-top5', async (req, res, next) => {
  const startTime = Date.now();
  
  // 获取 Mock API 基础 URL（默认本地）
  const mockBase = process.env.MOCK_API_BASE || 'http://localhost:3100';
  
  try {
    // 定义要调用的多地区 API 组
    const apiGroups = {
      regions: [
        { 
          name: 'uk', 
          url: process.env.API_UK_TOP5 || `${mockBase}/uk/top5`,
          timeout: 2000,
          retries: 1,
        },
        { 
          name: 'cn', 
          url: process.env.API_CN_TOP5 || `${mockBase}/cn/top5`,
          timeout: 2000,
          retries: 1,
        },
        { 
          name: 'in', 
          url: process.env.API_IN_TOP5 || `${mockBase}/in/top5`,
          timeout: 2000,
          retries: 1,
        },
      ],
    };
    
    // 并发调用所有地区 API
    const rawResults = await orchestrate(apiGroups, {}, req);
    
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
    const allItems = mergeArrays(
      ...successfulRegions.map(r => r.data?.items || [])
    );
    
    // 按分数排序并取前5
    const top5 = take(sortBy(allItems, 'score', 'desc'), 5);
    
    const duration = Date.now() - startTime;
    
    // 记录自定义指标
    if (req.metrics) {
      req.metrics.observe('bff.global_top5.duration', duration);
      req.metrics.inc('bff.global_top5.total_calls');
    }
    
    res.json({
      code: 200,
      data: top5,
      meta: {
        durationMs: duration,
        regionsQueried: successfulRegions.length,
        regionsFailed: failedRegions.length,
        totalItems: allItems.length,
      },
    });
    
  } catch (err) {
    logger.error({ err }, 'global-top5 request failed');
    next(err);
  }
});

module.exports = router;
