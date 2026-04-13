/**
 * 本地 Mock API 服务
 * 模拟 UK/CN/IN 三个地区的 API 接口
 */

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.MOCK_API_PORT || 3100;

// ==================== Mock 数据生成器 ====================

/**
 * 生成 Top5 排行榜数据
 */
function generateTop5Data(region) {
  const regionNames = {
    uk: 'United Kingdom',
    cn: 'China',
    in: 'India',
  };
  
  // 各地区特色数据
  const itemsByRegion = {
    uk: [
      { id: 1, title: 'Premier League Highlights', score: 98, category: 'sports', views: 1200000 },
      { id: 2, title: 'Royal Wedding Special', score: 92, category: 'news', views: 980000 },
      { id: 3, title: 'London Tech Summit', score: 87, category: 'tech', views: 750000 },
      { id: 4, title: 'Beatles Documentary', score: 85, category: 'music', views: 680000 },
      { id: 5, title: 'Fish & Chips Festival', score: 78, category: 'food', views: 520000 },
    ],
    cn: [
      { id: 11, title: '春节联欢晚会精彩瞬间', score: 99, category: 'entertainment', views: 3500000 },
      { id: 12, title: 'AI大模型技术突破', score: 95, category: 'tech', views: 2100000 },
      { id: 13, title: '高铁速度新纪录', score: 91, category: 'news', views: 1800000 },
      { id: 14, title: '川菜美食探店', score: 88, category: 'food', views: 1500000 },
      { id: 15, title: '国潮音乐盛典', score: 82, category: 'music', views: 1100000 },
    ],
    in: [
      { id: 21, title: 'IPL Cricket Final Over', score: 97, category: 'sports', views: 2800000 },
      { id: 22, title: 'Bollywood Blockbuster', score: 93, category: 'entertainment', views: 2300000 },
      { id: 23, title: 'Diwali Festival Celebration', score: 89, category: 'culture', views: 1700000 },
      { id: 24, title: 'IT Hub Bangalore Growth', score: 84, category: 'tech', views: 1300000 },
      { id: 25, title: 'Street Food Paradise', score: 79, category: 'food', views: 950000 },
    ],
  };

  return {
    region,
    regionName: regionNames[region],
    timestamp: new Date().toISOString(),
    items: itemsByRegion[region] || [],
    total: 5,
  };
}

/**
 * 生成列表数据（用于分页测试）
 */
function generateListData(region, limit = 100) {
  const categories = ['tech', 'sports', 'entertainment', 'food', 'news', 'music'];
  
  const items = Array.from({ length: limit }, (_, i) => ({
    id: `${region}-${i + 1}`,
    title: `[${region.toUpperCase()}] Content Item ${i + 1}`,
    description: `Sample content from ${region} - Item number ${i + 1}`,
    score: Math.floor(Math.random() * 100),
    category: categories[Math.floor(Math.random() * categories.length)],
    views: Math.floor(Math.random() * 1000000),
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
    popularity: Math.floor(Math.random() * 10) + 1,
  }));

  return {
    region,
    timestamp: new Date().toISOString(),
    items,
    total: items.length,
    hasMore: false,
  };
}

// ==================== UK API 路由 ====================

const ukRouter = express.Router();

ukRouter.get('/top5', (req, res) => {
  console.log(`[${new Date().toISOString()}] UK /top5 called`);
  
  // 模拟延迟 (200-500ms)
  const delay = Math.floor(Math.random() * 300) + 200;
  setTimeout(() => {
    res.json({
      code: 200,
      success: true,
      data: generateTop5Data('uk'),
    });
  }, delay);
});

ukRouter.get('/list', (req, res) => {
  console.log(`[${new Date().toISOString()}] UK /list called`, req.query);
  
  const limit = parseInt(req.query.limit) || 100;
  const delay = Math.floor(Math.random() * 200) + 150;
  
  setTimeout(() => {
    res.json({
      code: 200,
      success: true,
      data: generateListData('uk', limit),
    });
  }, delay);
});

// 模拟偶尔失败
ukRouter.get('/unstable', (req, res) => {
  const shouldFail = Math.random() > 0.7; // 30% 失败率
  
  if (shouldFail) {
    res.status(500).json({ 
      code: 500, 
      error: 'UK Service temporarily unavailable' 
    });
  } else {
    res.json({ code: 200, data: generateTop5Data('uk') });
  }
});

// ==================== CN API 路由 ====================

const cnRouter = express.Router();

cnRouter.get('/top5', (req, res) => {
  console.log(`[${new Date().toISOString()}] CN /top5 called`);
  
  const delay = Math.floor(Math.random() * 300) + 200;
  setTimeout(() => {
    res.json({
      code: 200,
      success: true,
      message: 'success',
      data: generateTop5Data('cn'),
    });
  }, delay);
});

cnRouter.get('/list', (req, res) => {
  console.log(`[${new Date().toISOString()}] CN /list called`, req.query);
  
  const limit = parseInt(req.query.limit) || 100;
  const delay = Math.floor(Math.random() * 200) + 150;
  
  setTimeout(() => {
    res.json({
      code: 200,
      success: true,
      message: 'ok',
      data: generateListData('cn', limit),
    });
  }, delay);
});

cnRouter.get('/unstable', (req, res) => {
  const shouldFail = Math.random() > 0.8; // 20% 失败率
  
  if (shouldFail) {
    res.status(503).json({ 
      code: 503, 
      error: 'CN Service overloaded',
      message: '服务繁忙，请稍后重试'
    });
  } else {
    res.json({ code: 200, message: 'success', data: generateTop5Data('cn') });
  }
});

// ==================== IN API 路由 ====================

const inRouter = express.Router();

inRouter.get('/top5', (req, res) => {
  console.log(`[${new Date().toISOString()}] IN /top5 called`);
  
  const delay = Math.floor(Math.random() * 400) + 250;
  setTimeout(() => {
    res.json({
      status: 'ok',
      statusCode: 200,
      result: generateTop5Data('in'),
    });
  }, delay);
});

inRouter.get('/list', (req, res) => {
  console.log(`[${new Date().toISOString()}] IN /list called`, req.query);
  
  const limit = parseInt(req.query.limit) || 100;
  const delay = Math.floor(Math.random() * 300) + 200;
  
  setTimeout(() => {
    res.json({
      status: 'ok',
      statusCode: 200,
      result: generateListData('in', limit),
    });
  }, delay);
});

inRouter.get('/unstable', (req, res) => {
  const shouldFail = Math.random() > 0.6; // 40% 失败率
  
  if (shouldFail) {
    res.status(500).json({ 
      status: 'error',
      error: 'IN Server timeout',
      details: 'Connection timeout after 30s'
    });
  } else {
    res.json({ status: 'ok', result: generateTop5Data('in') });
  }
});

// 注册路由
app.use('/uk', ukRouter);
app.use('/cn', cnRouter);
app.use('/in', inRouter);

// 根路径信息
app.get('/', (req, res) => {
  res.json({
    service: 'Local Mock API Server for easy-nodejs-bff',
    version: '1.0.0',
    endpoints: {
      uk: {
        top5: '/uk/top5',
        list: '/uk/list?limit=100',
        unstable: '/uk/unstable (30% fail rate)',
      },
      cn: {
        top5: '/cn/top5',
        list: '/cn/list?limit=100',
        unstable: '/cn/unstable (20% fail rate)',
      },
      in: {
        top5: '/in/top5',
        list: '/in/list?limit=100',
        unstable: '/in/unstable (40% fail rate)',
      },
    },
    usage: 'Set these as your API_UK_BASE, API_CN_BASE, API_IN_BASE environment variables',
    examples: {
      bffConfig: {
        API_UK_BASE: `http://localhost:${PORT}`,
        API_CN_BASE: `http://localhost:${PORT}`,
        API_IN_BASE: `http://localhost:${PORT}`,
      }
    },
  });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║     🎭 Local Mock API Server Started              ║
╠═══════════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}                      ║
╠═══════════════════════════════════════════════════╣
║  Available Endpoints:                             ║
║  • GET /uk/top5       - UK Top 5                  ║
║  • GET /uk/list       - UK List                   ║
║  • GET /cn/top5       - China Top 5               ║
║  • GET /cn/list       - China List                ║
║  • GET /in/top5       - India Top 5               ║
║  • GET /in/list       - India List                ║
║                                                  ║
║  Unstable (for testing failure handling):         ║
║  • GET /uk/unstable   (30% fail)                 ║
║  • GET /cn/unstable   (20% fail)                 ║
║  • GET /in/unstable   (40% fail)                 ║
╚═══════════════════════════════════════════════════╝

To use with BFF:
  export API_UK_BASE=http://localhost:${PORT}
  export API_CN_BASE=http://localhost:${PORT}
  export API_IN_BASE=http://localhost:${PORT}
  npm run dev
  `);
});

module.exports = app;
