/**
 * 应用入口文件
 */

const express = require('express');
const path = require('path');
const { mergeConfig } = require('./config');
const { createBFFApp } = require('./index');
const globalTop5 = require('./routes/global-top5');
const crossRegionList = require('./routes/cross-region-list');

// 加载配置
const config = mergeConfig({
  // 可在此处覆盖默认配置
  monitoring: {
    enabled: true,
  },
});

// 创建 BFF 应用
const app = createBFFApp(config);

// 注册业务路由
app.use('/api', globalTop5);
app.use('/api', crossRegionList);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// 监控仪表盘 UI (静态页面)
app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dashboard', 'index.html'));
});

// 提供仪表盘静态资源
app.use('/dashboard', express.static(path.join(__dirname, '..', 'dashboard')));

// 根路径重定向到仪表盘或显示信息
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.redirect('/dashboard');
  }
  
  res.json({ 
    message: 'easy-nodejs-bff server is running!',
    endpoints: {
      health: '/health',
      dashboard: '/dashboard',
      metrics: config.monitoring.enabled ? config.monitoring.metricsPath : null,
      api: {
        globalTop5: '/api/global-top5',
        crossRegionList: '/api/cross-region-list',
      },
    },
    documentation: 'See README.md for details',
  });
});

// 启动服务
const server = app.listen(config.port, () => {
  console.log(`🚀 easy-nodejs-bff server running on port ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Monitoring: ${config.monitoring.enabled ? 'enabled' : 'disabled'}`);
  if (config.monitoring.enabled) {
    console.log(`   Metrics: http://localhost:${config.port}${config.monitoring.metricsPath}`);
  }
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };
