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
- **📈 内置可视化仪表盘 (Dashboard UI)** - 零配置实时监控界面，Chart.js 图表展示
- **🎭 本地 Mock API 服务** - 开箱即用的多地区模拟接口，无需真实后端即可调试
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

### 方式一：一键启动（推荐，含 Mock API + Dashboard）

**Windows 用户：**
```bash
# 双击运行 start-all.bat
# 或在 PowerShell 中执行：
start-all.bat
```

**自动完成：**
1. 启动 Mock API 服务 (端口 3100) - 模拟 UK/CN/IN 接口
2. 启动 BFF 应用 (端口 3000) - 含监控和 Dashboard
3. 自动打开浏览器访问 `http://localhost:3000/dashboard`

**Linux/Mac：**
```bash
npm install

# 终端1: 启动 Mock API
npm run mock:api &

# 终端2: 启动 BFF 服务
npm run dev

# 终端3 (可选): 生成测试数据
for i in $(seq 1 10); do
    curl -s http://localhost:3000/api/global-top5 > /dev/null
done

# 打开浏览器
open http://localhost:3000/dashboard  # Mac
xdg-open http://localhost:3000/dashboard  # Linux
```

### 方式二：仅启动 BFF（连接真实 API）

```bash
npm install
npm run dev
# 访问 http://localhost:3000/dashboard
```

### 方式三：Docker 完整栈（含 Prometheus + Grafana）

详见下方 [Docker 部署](#docker-部署)

---

### 基础代码使用示例

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
# 开发模式 (含热重载)
npm run dev

# 生产模式
NODE_ENV=production npm start

# 仅启动 Mock API
npm run mock:api

# Mock API + BFF 同时启动
npm run dev:mock
```

**访问地址汇总：**

| 功能 | URL | 说明 |
|------|-----|------|
| **📊 监控仪表盘** | http://localhost:3000/dashboard | 可视化界面 |
| **❤️ 健康检查** | http://localhost:3000/health | 服务状态 |
| **📡 Prometheus 指标** | http://localhost:3000/metrics | 原始指标数据 |
| **🌍 Global Top5** | http://localhost:3000/api/global-top5 | 聚合示例接口 |
| **📋 Cross Region List** | http://localhost:3000/api/cross-region-list?pageSize=10 | 分页示例接口 |
| **🎭 Mock API 首页** | http://localhost:3100/ | 所有模拟端点列表 |

> **提示：** 首次访问 Dashboard 时可能没有数据，请先调用几次 `/api/*` 接口生成 Prometheus 指标，再刷新页面即可看到图表。

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

---

## 🖥️ 内置可视化仪表盘 (Dashboard UI)

easy-nodejs-bff 提供了**开箱即用的可视化监控仪表盘**，无需额外部署 Grafana 即可实时查看系统运行状态。

> **访问地址：** `http://localhost:3000/dashboard`
>
> **依赖：** 仅需浏览器，无需安装任何前端构建工具（纯 HTML/CSS/JS + Chart.js CDN）

### ✨ 功能亮点

| 特性 | 说明 |
|------|------|
| 🎨 **现代化 UI** | 渐变紫色主题、毛玻璃效果、响应式设计 |
| 📊 **6 大核心指标卡片** | 总请求数、平均/P95 响应时间、错误率、下游成功率 |
| 📈 **5 种图表类型** | 折线趋势图、柱状分布图、环形饼图、雷达对比图 |
| ⚡ **实时刷新** | 支持 5s / 10s / 30s 自动刷新或手动模式 |
| 🔗 **服务状态检测** | 实时显示 BFF 服务、Mock API、Metrics 端点在线状态 |
| 🌍 **多地区对比** | 雷达图直观展示 UK/CN/IN 三地延迟差异 |
| 📋 **端点状态表** | 下游 API 详细信息（成功/失败次数、健康状态） |
| 💫 **数字动画** | 指标数值平滑过渡动画，提升用户体验 |

### 🎛️ 界面布局

```
┌─────────────────────────────────────────────────────────────┐
│  📊 easy-nodejs-bff 监控仪表盘                               │
│  多地区 API 聚合 · 实时性能监控 · 数据可视化                   │
├─────────────────────────────────────────────────────────────┤
│  [● BFF服务] [● Mock API] [● 指标端点]    [🔄 刷新] [▶️自动] │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────┤
│ 总请求数   │ 平均延迟   │ P95延迟   │ 错误率    │ 连接数    │ 成功率 │
│   1,234   │   245ms  │   520ms  │   2.3%   │   UK/CN/IN│ 97%   │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────┘

┌─────────────────────────────────────────────────────────────┐
│  📈 HTTP 请求响应时间趋势 (最近 20 个采样点)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ╱╲  折线图: 平均响应时间 + P95响应时间               │   │
│  │ ╱  ╲╱╲╱╲╱  (Chart.js 动态渲染)                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────────────┬──────────────────────────────┐
│  📊 各路由请求量分布            │  🔴 HTTP 状态码分布          │
│  ┌───────────────────┐       │      ○                     │
│  │ ▐▐▐▐▐▐▐ 柱状图     │       │    ○ ● ○                 │
│  │ /global-top5      │       │   200/400/500             │
│  │ /cross-region     │       │                            │
│  └───────────────────┘       └──────────────────────────────┘
└───────────────────────────────┴──────────────────────────────┘

┌───────────────────────────────┬──────────────────────────────┐
│  🌐 下游 API 调用统计           │  📍 地区延迟雷达图           │
│  ┌───────────────────┐       │        IN                    │
│  │  ○ 饼图: UK/CN/IN  │       │       ╱│╲                    │
│  │  成功/失败占比     │       │   CN ╱ │ ╲ UK                │
│  └───────────────────┘       │     ╱──┼──╲                  │
│                                └──────────────────────────────┘
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  📋 下游 API 端点状态                                        │
│  ┌──────┬──────────────┬──────┬──────┬────────┬────────┐   │
│  │ 地区  │ 端点 URL       │ 状态  │ 延迟  │ 成功数  │ 失败数 │   │
│  ├──────┼──────────────┼──────┼──────┼────────┼────────┤   │
│  │ UK   │ .../uk/top5   │ ✅正常│ 180ms│   42   │   1   │   │
│  │ CN   │ .../cn/top5   │ ✅正常│ 220ms│   38   │   0   │   │
│  │ IN   │ .../in/top5   │ ✅正常│ 280ms│   35   │   2   │   │
│  └──────┴──────────────┴──────┴──────┴────────┴────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 📊 核心指标说明

#### 1. 关键指标卡片 (KPI Cards)

| 指标 | 图标 | 计算方式 | 正常范围 |
|------|------|----------|----------|
| **总请求数** | 📈 | 累加 `http_requests_total` | 持续增长 |
| **平均响应时间** | ⚡ | `sum(duration)/count` | < 500ms |
| **P95 响应时间** | ⏱️ | 直方图第95百分位 | < 1000ms |
| **错误率** | ⚠️ | `(error/total) × 100%` | < 5% |
| **活跃连接数** | 🌐 | 当前调用的地区数量 | 3 (UK+CN+IN) |
| **下游成功率** | ✅ | `(downstream_success/downstream_total)` | > 90% |

#### 2. 可视化图表详解

**📈 响应时间趋势折线图**
- 展示最近 20 个采样点的平均响应时间和 P95 响应时间
- 双线对比，直观发现性能波动
- X轴为时间戳，Y轴为毫秒数

**📊 路由请求量柱状图**
- 展示各 BFF 接口 (`/api/global-top5`, `/api/cross-region-list`) 的调用量
- 不同颜色区分路由
- 快速定位热点接口

**🔴 状态码环形图**
- HTTP 200/4xx/5xx 的请求占比
- 一眼看出错误比例是否异常
- 悬停显示具体数值和百分比

**🌐 下游调用饼图**
- UK / CN / IN 三个地区的 API 调用量占比
- 区分各地区负载均衡情况

**📍 地区延迟雷达图**
- 三轴雷达图展示 UK/CN/IN 的平均响应时间和 P95 时间
- 覆盖面积越小表示整体性能越好
- 可快速发现某个地区的性能瓶颈

#### 3. API 端点状态表

| 字段 | 说明 |
|------|------|
| 地区 | UK (英国) / CN (中国) / IN (印度) |
| 端点 URL | 完整的 Mock API 地址 |
| 状态 | ✅ 正常 (>80%成功率) 或 ⚠️ 异常 |
| 响应时间 | 最近一次调用耗时 (模拟值) |
| 成功/失败次数 | 从 Prometheus 指标统计 |
| 最后检查时间 | 当前刷新时刻 |

### 🎮 操作指南

#### 启动方式

```bash
# 方式一：一键启动所有服务（推荐）
# 双击 start-all.bat 或在终端执行：
start-all.bat

# 方式二：分步启动
npm run mock:api    # 终端1: Mock API (端口 3100)
npm run dev         # 终端2: BFF 服务 (端口 3000)
# 浏览器打开 http://localhost:3000/dashboard
```

#### 使用步骤

**Step 1: 生成测试数据**

启动服务后，先调用几次 BFF 接口以产生指标数据：

```bash
# Windows PowerShell
for ($i=1; $i -le 10; $i++) {
    Invoke-RestMethod -Uri 'http://localhost:3000/api/global-top5'
    Invoke-RestMethod -Uri 'http://localhost:3000/api/cross-region-list?page=1&pageSize=20'
}

# Linux/Mac
for i in {1..10}; do
    curl -s http://localhost:3000/api/global-top5 > /dev/null
    curl -s 'http://localhost:3000/api/cross-region-list?page=1&pageSize=20' > /dev/null
done
```

**Step 2: 打开仪表盘**

浏览器访问：`http://localhost:3000/dashboard`

**Step 3: 配置与交互**

| 操作 | 方法 | 效果 |
|------|------|------|
| 手动刷新 | 点击「🔄 刷新数据」按钮 | 立即获取最新指标 |
| 开启自动刷新 | 点击「▶️ 开始自动刷新」 | 定时更新（默认10秒） |
| 调整刷新间隔 | 选择下拉框 5s/10s/30s/手动 | 改变自动刷新频率 |
| 修改目标地址 | 在输入框修改 BFF URL | 连接不同的 BFF 实例 |

#### 自定义配置

如果需要连接远程服务器或在非标准端口运行：

```javascript
// dashboard.js 中修改默认配置
const CONFIG = {
    bffUrl: 'http://your-production-server:8080',
    mockUrl: 'http://your-mock-api:3100',
};
```

或者在页面加载时直接在地址栏参数中传入：
```
http://localhost:3000/dashboard?bffUrl=http://remote-server:3000
```

### 🔧 Dashboard 技术实现

| 组件 | 技术 | 版本 |
|------|------|------|
| 图表库 | Chart.js | 4.4.1 (CDN) |
| 数据源 | Prometheus 文本格式 | `/metrics` 端点 |
| 解析引擎 | 原生 JavaScript | ES2018+ |
| UI 框架 | 无 (Vanilla HTML/CSS/JS) | - |
| CSS 特性 | Grid/Flexbox/Backdrop-filter | 现代 CSS3 |
| 兼容性 | Chrome 88+, Firefox 85+, Safari 14+, Edge 88+ | |

### 📁 Dashboard 相关文件

```
dashboard/
├── index.html      # 主页面（HTML结构 + CSS样式）
└── dashboard.js    # 业务逻辑（数据获取、解析、图表渲染）

start-all.bat       # 一键启动脚本（含自动打开浏览器）
```

### 🎨 UI 设计规范

- **主色调**: 紫色渐变 (#667eea → #764ba2)
- **辅助色**: 
  - 成功/正向: 绿色 (#10b981, #059669)
  - 警告/中性: 橙色 (#f97316, #d97706)
  - 错误/负向: 红色 (#ef4444, #dc2626)
  - 信息/技术: 蓝色 (#3b82f6, #667eea)
- **字体**: 系统字体栈 (PingFang SC, Segoe UI)
- **圆角**: 12px ~ 16px (卡片), 8px (按钮)
- **阴影**: 0 8px 32px rgba(0,0,0,0.08)
- **动画**: 平滑过渡 0.3s, 数字缓动 800ms

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
├── dashboard/               # 📊 内置可视化仪表盘 (新增!)
│   ├── index.html          # 仪表盘主页面 (HTML+CSS)
│   └── dashboard.js        # 图表渲染逻辑 (Chart.js)
│
├── mock-api/                # 🎭 本地 Mock API 服务 (新增!)
│   └── server.js           # 模拟 UK/CN/IN 接口
│
├── src/
│   ├── config/               # 配置管理
│   │   └── index.js
│   ├── bff-engine/           # 核心引擎
│   │   ├── orchestrator.js   # 请求编排器
│   │   ├── handler-builder.js # DSL 处理链构建
│   │   └── transformers/     # 数据处理函数库
│   │       ├── array.js      # 数组操作
│   │       ├── object.js     # 对象操作
│   │       ├── transform.js  # 高级转换
│   │       └── index.js      # 统一导出
│   ├── routes/               # 业务路由 (示例)
│   │   ├── global-top5.js    # 全球 Top5 聚合接口
│   │   └── cross-region-list.js  # 跨地区列表(分页/过滤/排序)
│   ├── monitoring/           # 监控模块
│   │   ├── metrics.js        # Prometheus 指标定义
│   │   ├── logger.js         # Pino 结构化日志
│   │   └── middleware.js     # HTTP 监控中间件
│   ├── utils/                # 工具函数
│   │   ├── retry.js          # 重试机制 + 断路器
│   │   └── cache.js          # Redis/内存缓存工具
│   ├── app.js                # 应用入口 (含 Dashboard 路由)
│   └── index.js              # 框架核心导出 (createBFFApp)
│
├── tests/                    # 单元测试
│   └── app.test.js
│
├── grafana/                  # Grafana 配置 (Docker 部署用)
│   ├── dashboard.json        # 预置仪表盘 JSON
│   └── provisioning/
│       ├── datasources/      # 数据源配置
│       └── dashboards/      # Dashboard 导入配置
│
├── prometheus.yml            # Prometheus 抓取规则
├── Dockerfile                # 多阶段构建
├── docker-compose.yml        # 编排: BFF + Prometheus + Grafana [+Redis]
├── start-all.bat             # 🚀 Windows 一键启动脚本 (全部服务)
├── start-dev.bat             # 开发环境启动
├── start-mock.bat            # 单独启动 Mock API
├── QUICKSTART.md             # 快速调试指南
├── package.json              # 项目依赖
├── .gitignore
└── README.md                 # 本文档
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

---

## 🎭 Mock API 服务 (本地调试)

为了方便开发调试，框架内置了 **Mock API 服务器**，模拟 UK/CN/IN 三个地区的真实接口。

### 启动方式

```bash
# 单独启动 (默认端口 3100)
npm run mock:api

# 自定义端口
MOCK_API_PORT=3200 node mock-api/server.js
```

### 提供的接口

| 地区 | 端点 | 说明 | 数据量 |
|------|------|------|--------|
| **UK** | `/uk/top5` | 英国 Top5 排行榜 | 5 条（体育/新闻/科技） |
| **UK** | `/uk/list` | 列表数据 | 100 条（可配置 limit 参数） |
| **UK** | `/uk/unstable` | 不稳定接口 | **30% 失败率** |
| **CN** | `/cn/top5` | 中国 Top5 排行榜 | 5 条（娱乐/科技/新闻） |
| **CN** | `/cn/list` | 列表数据 | 100 条 |
| **CN** | `/cn/unstable` | 不稳定接口 | **20% 失败率** |
| **IN** | `/in/top5` | 印度 Top5 排行榜 | 5 条（体育/娱乐/文化） |
| **IN** | `/in/list` | 列表数据 | 100 条 |
| **IN** | `/in/unstable` | 不稳定接口 | **40% 失败率** |

### Mock 数据特性

- ✅ **延迟模拟**: 每个请求随机延迟 200-500ms（模拟网络环境）
- ✅ **地区特色内容**: 各地区有独特的业务数据（如英超、春晚、板球）
- ✅ **不同失败率**: 用于测试容错机制（30%/20%/40%）
- ✅ **CORS 支持**: 允许浏览器跨域访问
- ✅ **控制台日志**: 记录每次请求的时间戳

### 使用场景

1. **本地开发**: 无需依赖真实后端服务即可开发 BFF 层
2. **测试容错**: 使用 unstable 接口测试重试、断路器功能
3. **性能测试**: 调整延迟参数测试超时处理
4. **演示 Demo**: 快速搭建完整的演示环境

详细说明请查看 `QUICKSTART.md` 文件。

---

## 🛠️ 可用脚本命令

```bash
# 开发
npm run dev              # 启动 BFF 开发服务器 (热重载)
npm run dev:mock         # 同时启动 Mock API + BFF

# Mock API
npm run mock:api         # 仅启动 Mock API 服务

# 测试
npm test                 # 运行单元测试
npm run test:watch       # 测试监听模式
```

---

## ❓ 常见问题 (FAQ)

<details>
<summary><strong>Dashboard 显示"暂无数据"怎么办？</strong></summary>

Dashboard 从 Prometheus `/metrics` 端点读取指标。首次启动后需要：

1. **确保监控已启用**: 检查 BFF 启动日志中是否有 `Monitoring: enabled`
2. **调用几次接口生成指标**:
   ```bash
   curl http://localhost:3000/api/global-top5
   curl http://localhost:3000/api/cross-region-list
   ```
3. **刷新 Dashboard 页面**

如果仍然无数据，直接访问 http://localhost:3000/metrics 检查是否返回 Prometheus 格式的文本。
</details>

<details>
<summary><strong>Mock API 连接失败？</strong></summary>

- 确认 Mock API 已运行在 `http://localhost:3100`
- 访问 http://localhost:3100/ 验证是否返回 JSON
- 如果使用自定义端口，设置环境变量：`MOCK_API_BASE=http://localhost:3200 npm run dev`
</details>

<details>
<summary><strong>如何修改 Mock 返回的数据？</strong></summary>

编辑 `mock-api/server.js` 文件中的以下函数：
- `generateTop5Data(region)` - Top5 数据生成器
- `generateListData(region, limit)` - 列表数据生成器

修改后无需重启，Mock API 支持热更新（如使用了 nodemon）或手动重启即可生效。
</details>

---

## 📈 功能路线图

- [x] v1.0 - 核心框架 + 监控 + Dashboard UI + Mock API
- [ ] v1.1 - Redis 缓存集成完善
- [ ] v1.2 - WebSocket 实时推送（替代轮询）
- [ ] v1.3 - 多主题切换（暗色模式）
- [ ] v1.4 - 告警规则配置与通知
- [ ] v2.0 - Web Admin 管理后台

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

## Author
- 🚀 Powered by Moshow郑锴(大狼狗) 
- 🌟 Might the holy code be with you ! 
- CSDN传送门️️➡️ https://zhengkai.blog.csdn.net
- 微信公众号➡️ 软件开发大百科

---

**easy-nodejs-bff** - 让 BFF 开发更简单 🚀
