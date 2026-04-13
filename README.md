# easy-nodejs-bff

轻量级 BFF (Backend for Frontend) 框架(基于Express.js)，专为多地区 API 聚合与数据处理而设计，提供开箱即用的监控能力。

## Author
- 🚀 Powered by Moshow郑锴(大狼狗) 
- 🌟 Might the holy code be with you !
- CSDN传送门️️➡️ https://zhengkai.blog.csdn.net
- 微信公众号➡️ 软件开发大百科


## ✨ 核心特性

- **🌍 多地区 API 并发调用** - 自动编排，支持部分失败
- **🔧 开箱即用的数据处理** - 内置排序、分页、聚合、裁剪等常用操作
- **📊 生产级监控** - Prometheus 指标 + 结构化日志 (pino)
- **⚡ 容错与重试** - 可配置的重试机制和退避策略
- **🔌 插件机制** - 支持自定义 transformer 和中间件
- **🐳 Docker 就绪** - 一键部署，含监控栈 (Prometheus + Grafana)

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                     客户端 (Web/App)                      │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP
┌─────────────────────────▼───────────────────────────────┐
│                  easy-nodejs-bff 服务                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │  接入层：Express (带中间件)              │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  核心引擎：API 调用编排 + 数据处理流水线           │  │
│  │  - 并发请求 (Promise.allSettled)                  │  │
│  │  - 内置 transform 函数库                          │  │
│  │  - 可配置的容错与重试                             │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  监控模块：Metrics + Logging + Tracing            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
       UK API          CN API          IN API
```

## 📦 安装

```bash
git clone <repository-url>
cd easy-nodejs-bff
npm install
```

## 🚀 快速开始

### 基础使用

```javascript
const { createBFFApp } = require('easy-nodejs-bff');
const { orchestrate } = require('./src/bff-engine/orchestrator');
const { sortBy, merge } = require('./src/bff-engine/transformers');

const app = createBFFApp({
  monitoring: true,
  defaultTimeout: 5000,
  retryOptions: { retries: 1 }
});

// 定义路由
app.get('/api/data', async (req, res) => {
  const apiGroups = {
    regions: [
      { name: 'uk', url: 'https://uk.api.example.com/data' },
      { name: 'cn', url: 'https://cn.api.example.com/data' },
      { name: 'in', url: 'https://in.api.example.com/data' },
    ],
  };
  
  const results = await orchestrate(apiGroups);
  
  // 处理数据...
  const allData = merge(
    ...results.regions.filter(r => r.ok).map(r => r.data.items)
  );
  const sorted = sortBy(allData, 'score', 'desc').slice(0, 10);
  
  res.json({ code: 200, data: sorted });
});

app.listen(3000);
```

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
NODE_ENV=production npm start
```

访问 `http://localhost:3000/health` 检查服务状态。

## 📖 API 文档

### createBFFApp(config)

创建 BFF 应用实例。

**参数：**
- `config.monitoring` (boolean) - 是否启用监控，默认 false
- `config.port` (number) - 端口号，默认 3000
- `config.api.defaultTimeout` (number) - API 默认超时时间(ms)，默认 5000
- `config.api.retry.retries` (number) - 默认重试次数，默认 2
- `config.cache.enabled` (boolean) - 是否启用 Redis 缓存
- `config.tracing.enabled` (boolean) - 是否启用 OpenTelemetry 追踪

### orchestrate(apiGroups, options?, context?)

并发调用多个 API 组。

**参数：**
- `apiGroups` (Object) - 分组的 API 配置对象
- `options.concurrency` (number) - 并发限制
- `options.failFast` (boolean) - 快速失败模式
- `options.timeout` (number) - 整体超时时间(ms)

**返回：** Promise<Object> 所有调用的结果

**示例：**

```javascript
const results = await orchestrate({
  regions: [
    { name: 'uk', url: 'https://uk.api/top5', timeout: 2000 },
    { name: 'cn', url: 'https://cn.api/top5', timeout: 2000 },
  ],
});

// results:
// {
//   regions: [
//     { ok: true, data: {...}, name: 'uk', duration: 150 },
//     { ok: true, data: {...}, name: 'cn', duration: 120 },
//   ],
//   _meta: { totalGroups: 1, timestamp: '...' }
// }
```

### Transformers (数据处理函数库)

#### 数组操作

```javascript
const { sortBy, paginate, merge, groupBy, unique, take, pluck } = require('./src/bff-engine/transformers');

// 排序
sortBy([{score: 3}, {score: 1}, {score: 2}], 'score', 'desc')
// → [{score: 3}, {score: 2}, {score: 1}]

// 分页（带元信息）
paginate([1,2,3,...,100], page=2, pageSize=10)
// → { data: [11,12,...,20], pagination: { page: 2, total: 100, totalPages: 10 } }

// 合并数组
merge([1,2], [3,4], [5])
// → [1,2,3,4,5]

// 分组
groupBy([{id:1,type:'a'}, {id:2,type:'b'}, {id:3,type:'a'}], 'type')
// → { a: [{...}, {...}], b: [{...}] }

// 去重
unique([{id:1}, {id:2}, {id:1}], 'id')
// → [{id:1}, {id:2}]
```

#### 对象操作

```javascript
const { pick, omit, renameKeys, mapValues } = require('./src/bff-engine/transformers');

pick({a:1,b:2,c:3}, ['a','c'])     // → {a:1, c:3}
omit({a:1,b:2,c:3}, ['b'])         // → {a:1, c:3}
renameKeys({a:1,b:2}, {a:'x'})     // → {x:1, b:2}
mapValues({a:1,b:2}, v => v * 10) // → {a:10, b:20}
```

#### 数据转换

```javascript
const { transformArray, filterBy, findWhere, sumBy, countBy } = require('./src/bff-engine/transformers');

// 数组元素转换
transformArray(items, item => ({ ...item, price: item.priceUSD * 6.5 }));

// 过滤
filterBy(items, { status: 'active' });

// 查找
findWhere(items, { id: 123 });

// 聚合计算
sumBy(items, 'amount');        // 求和
avgBy(items, 'score');         // 平均值
countBy(items, 'category');    // 分组计数
```

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | 3000 |
| `NODE_ENV` | 运行环境 | development |
| `METRICS_ENABLED` | 启用 Prometheus 监控 | false |
| `LOG_LEVEL` | 日志级别 | info |
| `DEFAULT_TIMEOUT` | API 默认超时(ms) | 5000 |
| `RETRY_COUNT` | 默认重试次数 | 2 |
| `RETRY_DELAY` | 重试延迟基数(ms) | 300 |
| `REDIS_URL` | Redis 连接 URL | null |
| `CACHE_TTL` | 缓存默认 TTL(秒) | 60 |
| `TRACING_ENABLED` | 启用分布式追踪 | false |

### API 端点配置

通过环境变量配置各地区的 API 基础地址：

```bash
export API_UK_BASE=https://uk.api.example.com
export API_CN_BASE=https://cn.api.example.com
export API_IN_BASE=https://in.api.example.com
```

## 📊 监控

### Prometheus 指标

启用监控后，访问 `/metrics` 端点获取指标数据：

- `http_request_duration_ms` - HTTP 请求延迟直方图
- `http_requests_total` - HTTP 请求总数计数器
- `downstream_calls_total` - 下游 API 调用计数器
- Node.js 默认指标 (CPU、内存等)

### 结构化日志

使用 pino 输出 JSON 格式日志：

```json
{
  "level": 30,
  "time": "2024-01-01T00:00:00.000Z",
  "request": { "method": "GET", "url": "/api/data" },
  "response": { "statusCode": 200, "durationMs": 45 }
}
```

## 🐳 Docker 部署

### 使用 docker-compose

```bash
# 构建并启动所有服务（包括监控）
docker-compose up -d --build

# 仅启动 BFF 服务
docker-compose up -d bff
```

服务启动后：
- BFF 服务: http://localhost:3000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

### 手动 Docker 构建

```bash
docker build -t easy-nodejs-bff .
docker run -d \
  -p 3000:3000 \
  -e METRICS_ENABLED=true \
  -e NODE_ENV=production \
  easy-nodejs-bff
```

### Grafana Dashboard 导入

1. 访问 Grafana (http://localhost:3001)
2. Import Dashboard → 上传 `grafana/dashboard.json`
3. 选择 Prometheus 数据源

## 🔌 扩展性

### 自定义 Transformer

```javascript
const transformers = require('./src/bff-engine/transformers');

// 注册自定义 transformer
transformers.register('myCustomFn', (data, params) => {
  // 自定义逻辑
  return processedData;
});
```

### Redis 缓存集成

设置 `REDIS_URL` 环境变量自动启用缓存：

```bash
REDIS_URL=redis://localhost:6379 CACHE_TTL=120 npm start
```

### 断路器

在 API 配置中启用断路器：

```javascript
await orchestrate({
  services: [{
    name: 'risky-api',
    url: 'https://unstable.api.com/data',
    circuitBreaker: {
      enabled: true,
      threshold: 5,      // 失败5次后打开
      timeout: 10000,    // 单次调用超时10s
      resetTimeout: 30000, // 30秒后半开状态
    },
  }],
});
```

### 分布式追踪

设置环境变量启用 OpenTelemetry：

```bash
TRACING_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318 \
npm start
```

## 🧪 测试

```bash
# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 监听模式
npm run test:watch
```

## 📁 项目结构

```
easy-nodejs-bff/
├── src/
│   ├── config/               # 配置管理
│   ├── bff-engine/           # 核心引擎
│   │   ├── orchestrator.js   # 请求编排器
│   │   ├── transformers/     # 数据处理函数库
│   │   │   ├── array.js      # 数组操作
│   │   │   ├── object.js     # 对象操作
│   │   │   ├── transform.js  # 高级转换
│   │   │   └── index.js      # 统一导出
│   │   └── handler-builder.js # DSL 处理链构建
│   ├── routes/               # 业务路由
│   │   ├── global-top5.js
│   │   └── cross-region-list.js
│   ├── monitoring/           # 监控模块
│   │   ├── metrics.js        # Prometheus 指标
│   │   ├── logger.js         # 结构化日志
│   │   └── middleware.js     # 监控中间件
│   ├── utils/                # 工具函数
│   │   ├── retry.js          # 重试机制
│   │   └── cache.js          # 缓存工具
│   ├── app.js                # 应用入口
│   └── index.js              # 框架核心导出
├── tests/                    # 测试文件
├── grafana/
│   └── dashboard.json        # Grafana 仪表盘配置
├── prometheus.yml            # Prometheus 抓取配置
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

---

**easy-nodejs-bff** - 让 BFF 开发更简单 🚀
