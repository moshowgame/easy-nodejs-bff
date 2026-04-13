# 🚀 快速调试指南

本文档帮助您快速启动本地 Mock API 并测试 BFF 框架。

## 一、安装依赖

```bash
npm install
```

## 二、启动 Mock API 服务

### 方式 1：单独启动 Mock API

```bash
# 终端 1 - 启动 Mock API（端口 3100）
npm run mock:api
```

Mock API 启动后会显示：
```
╔═══════════════════════════════════════════════════╗
║     🎭 Local Mock API Server Started              ║
║  URL: http://localhost:3100                       ║
╚═══════════════════════════════════════════════════╝
```

### 方式 2：同时启动 Mock API + BFF

```bash
npm run dev:mock
```

## 三、启动 BFF 服务

```bash
# 终端 2 - 启动 BFF 服务（端口 3000）
npm run dev
```

BFF 启动后：
```
🚀 easy-nodejs-bff server running on port 3000
   Environment: development
   Monitoring: enabled
   Metrics: http://localhost:3000/metrics
```

## 四、测试接口

### 1. 测试 Mock API 直接访问

在浏览器或 Postman 中打开：

**UK 接口：**
- Top5: `http://localhost:3100/uk/top5`
- 列表: `http://localhost:3100/uk/list?limit=50`
- 不稳定接口 (30%失败率): `http://localhost:3100/uk/unstable`

**CN 接口：**
- Top5: `http://localhost:3100/cn/top5`
- 列表: `http://localhost:3100/cn/list?limit=50`
- 不稳定接口 (20%失败率): `http://localhost:3100/cn/unstable`

**IN 接口：**
- Top5: `http://localhost:3100/in/top5`
- 列表: `http://localhost:3100/in/list?limit=50`
- 不稳定接口 (40%失败率): `http://localhost:3100/in/unstable`

**Mock API 首页：** `http://localhost:3100/` （查看所有可用端点）

---

### 2. 测试 BFF 聚合接口

#### 全球 Top5 排行榜（聚合 UK/CN/IN 数据并取前5）

```bash
curl http://localhost:3000/api/global-top5
```

预期返回：
```json
{
  "code": 200,
  "data": [
    {
      "id": 11,
      "title": "春节联欢晚会精彩瞬间",
      "score": 99,
      "category": "entertainment",
      "views": 3500000
    },
    // ... 其他 top5 项目
  ],
  "meta": {
    "durationMs": 450,
    "regionsQueried": 3,
    "regionsFailed": 0,
    "totalItems": 15
  }
}
```

#### 跨地区数据列表（带分页、过滤、排序）

```bash
# 基本查询（第1页，每页20条）
curl http://localhost:3000/api/cross-region-list

# 第2页，每页10条
curl "http://localhost:3000/api/cross-region-list?page=2&pageSize=10"

# 按 category 过滤
curl "http://localhost:3000/api/cross-region-list?category=tech"

# 按 region 过滤
curl "http://localhost:3000/api/cross-region-list?region=cn"

# 按 score 降序排序
curl "http://localhost:3000/api/cross-region-list?sort=-score"

# 组合条件
curl "http://localhost:3000/api/cross-region-list?page=1&pageSize=5&category=sports&sort=-views"
```

---

### 3. 健康检查

```bash
curl http://localhost:3000/health

# 返回：
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### 4. 监控指标（如果启用）

```bash
curl http://localhost:3000/metrics
```

返回 Prometheus 格式的指标数据。

---

## 五、测试错误处理

使用不稳定接口测试容错能力：

修改 `src/routes/global-top5.js`，临时将 URL 改为 unstable 端点：

```javascript
url: `${mockBase}/uk/unstable`,  // 30% 失败率
url: `${mockBase}/cn/unstable`,  // 20% 失败率  
url: `${mockBase}/in/unstable`,  // 40% 失败率
```

多次调用 `/api/global-top5`，观察部分失败时的响应：

```json
{
  "code": 200,
  "data": [...],  // 只有成功的地区数据
  "meta": {
    "regionsFailed": 1,  // 有一个地区失败了
    ...
  }
}
```

---

## 六、Mock API 特性说明

### 延迟模拟
每个接口会随机延迟 **200-500ms**，模拟真实网络环境。

### 不同失败率
- **UK unstable**: 30% 返回 500 错误
- **CN unstable**: 20% 返回 503 错误
- **IN unstable**: 40% 返回 500 错误

### 各地区特色数据
- **UK**: 体育（英超）、新闻、科技、音乐、美食
- **CN**: 娱乐（春晚）、科技（AI）、新闻（高铁）、美食（川菜）、音乐（国潮）
- **IN**: 体育（板球）、娱乐（宝莱坞）、文化（排灯节）、IT、街头美食

---

## 七、常见问题

### Q: Mock API 无法连接？
A: 确保 Mock API 已启动且运行在 `http://localhost:3100`。可以通过浏览器访问 `http://localhost:3100/` 验证。

### Q: 如何修改 Mock 端口？
A:
```bash
MOCK_API_PORT=3200 npm run mock:api
# 同时设置 BFF 的环境变量
MOCK_API_BASE=http://localhost:3200 npm run dev
```

### Q: 如何添加自定义 Mock 数据？
A: 编辑 `mock-api/server.js`，修改 `generateTop5Data()` 和 `generateListData()` 函数即可。

### Q: 如何测试缓存功能？
A: 在 docker-compose.yml 中启用 Redis：
```bash
docker-compose up --profile cache redis bff
```

---

## 八、Postman 导入

可以导入以下集合快速测试：

```json
{
  "info": { "name": "easy-nodejs-bff Test Collection" },
  "item": [
    { "name": "Health Check", "request": { "method": "GET", "header": [], "url": "http://localhost:3000/health" } },
    { "name": "Global Top5", "request": { "method": "GET", "header": [], "url": "http://localhost:3000/api/global-top5" } },
    { "name": "Cross Region List", "request": { "method": "GET", "header": [], "url": { "raw": "http://localhost:3000/api/cross-region-list?page=1&pageSize=10" } } },
    { "name": "UK Top5 (Direct)", "request": { "method": "GET", "header": [], "url": "http://localhost:3100/uk/top5" } },
    { "name": "CN Top5 (Direct)", "request": { "method": "GET", "header": [], "url": "http://localhost:3100/cn/top5" } },
    { "name": "IN Top5 (Direct)", "request": { "method": "GET", "header": [], "url": "http://localhost:3100/in/top5" } }
  ]
}
```

复制上面的 JSON，在 Postman 中 Import → Paste Raw Text 即可。

---

## 九、下一步

- [ ] 查看 README.md 了解完整文档
- [ ] 尝试自定义 Transformer
- [ ] 启用 Prometheus + Grafana 监控栈 (`docker-compose up`)
- [ ] 编写单元测试 (`npm test`)
