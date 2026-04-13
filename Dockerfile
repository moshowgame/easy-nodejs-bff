# 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app

# 复制包文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci --only=production

# 生产镜像
FROM node:18-alpine

LABEL maintainer="easy-nodejs-bff"
LABEL description="Lightweight BFF Framework for Multi-Region API Aggregation"

WORKDIR /app

# 从 builder 阶段复制依赖
COPY --from=builder /app/node_modules ./node_modules

# 复制源代码
COPY src/ ./src/

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV METRICS_ENABLED=true
ENV LOG_LEVEL=info

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动应用
CMD ["node", "src/app.js"]
