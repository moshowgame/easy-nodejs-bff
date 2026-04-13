/**
 * easy-nodejs-bff 监控仪表盘
 * 负责获取 Prometheus 指标并图形化展示
 */

// ==================== 配置 ====================
const CONFIG = {
    bffUrl: 'http://localhost:3000',
    mockUrl: 'http://localhost:3100',
    metricsEndpoint: '/metrics',
    refreshInterval: 10000,
};

// ==================== 状态管理 ====================
let state = {
    autoRefresh: false,
    refreshTimer: null,
    previousMetrics: null,
    charts: {},
    historyData: {
        timestamps: [],
        responseTimes: [],
        maxPoints: 20,
    },
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    
    // 事件监听
    document.getElementById('bffUrl').addEventListener('change', (e) => {
        CONFIG.bffUrl = e.target.value;
    });
    
    document.getElementById('refreshInterval').addEventListener('change', (e) => {
        const interval = parseInt(e.target.value);
        if (interval > 0) {
            CONFIG.refreshInterval = interval;
            if (state.autoRefresh) {
                restartAutoRefresh();
            }
        }
    });
    
    // 初始加载
    refreshData();
});

// ==================== 数据获取 ====================

/**
 * 获取 Prometheus 指标数据
 */
async function fetchMetrics() {
    try {
        const url = `${CONFIG.bffUrl}${CONFIG.metricsEndpoint}`;
        console.log(`[Dashboard] 正在获取指标: ${url}`);
        
        const response = await fetch(url, { 
            method: 'GET',
            headers: { 'Accept': 'text/plain' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        const text = await response.text();
        console.log(`[Dashboard] 获取到指标数据 (${text.length} 字符)`);
        
        return parsePrometheusText(text);
    } catch (error) {
        console.error(`[Dashboard] 获取指标失败: ${error.message}`, error);
        updateStatus('metricsStatus', false, error.message);
        
        // 显示用户友好的提示
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            console.warn('[Dashboard] 提示: BFF 服务可能未启动，或 CORS 未启用');
        }
        
        return null;
    }
}

/**
 * 测试 API 可用性
 */
async function testApiHealth(url, statusElementId) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(url + '/health' || url, { 
            signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        updateStatus(statusElementId, true);
        return response.ok;
    } catch (error) {
        updateStatus(statusElementId, false);
        return false;
    }
}

/**
 * 解析 Prometheus 文本格式指标
 */
function parsePrometheusText(text) {
    const lines = text.split('\n');
    const metrics = {};
    
    for (let line of lines) {
        line = line.trim();
        
        // 跳过注释和空行
        if (!line || line.startsWith('#')) continue;
        
        // 解析 HELP 和 TYPE
        if (line.startsWith('# ')) continue;
        
        // 解析指标行
        const match = line.match(/^(\w+)\{([^}]*)\}\s+(.+)$/);
        if (match) {
            const [, name, labelsStr, value] = match;
            
            // 解析标签
            const labels = {};
            if (labelsStr) {
                labelsStr.split(',').forEach(label => {
                    const [key, val] = label.trim().split('=');
                    if (key && val) {
                        labels[key] = val.replace(/"/g, '');
                    }
                });
            }
            
            // 存储指标
            if (!metrics[name]) metrics[name] = [];
            metrics[name].push({ labels, value: parseFloat(value), raw: line });
        }
    }
    
    return metrics;
}

// ==================== UI 更新 ====================

/**
 * 更新状态指示器
 */
function updateStatus(elementId, isOnline, message) {
    const element = document.getElementById(elementId);
    element.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
}

/**
 * 显示/隐藏加载状态
 */
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

/**
 * 更新最后更新时间
 */
function updateLastUpdate() {
    const now = new Date().toLocaleTimeString('zh-CN');
    document.getElementById('lastUpdate').textContent = `上次更新: ${now}`;
}

// ==================== 指标提取与计算 ====================

/**
 * 从解析的指标中计算关键数值
 */
function calculateKeyMetrics(metrics) {
    if (!metrics || Object.keys(metrics).length === 0) return null;

    // 总请求数
    let totalRequests = 0;
    if (metrics.http_requests_total) {
        totalRequests = metrics.http_requests_total.reduce((sum, m) => sum + m.value, 0);
    }

    // 响应时间直方图数据
    let avgResponseTime = 0;
    let p95ResponseTime = 0;
    let responseTimesByRoute = {};

    if (metrics.http_request_duration_ms_bucket && metrics.http_request_duration_ms_sum) {
        const sumValues = metrics.http_request_duration_ms_sum;
        const countValues = metrics.http_request_duration_ms_count || metrics.http_requests_total;

        // 计算平均响应时间
        const totalSum = sumValues.reduce((sum, m) => sum + m.value, 0);
        const totalCount = Array.isArray(countValues)
            ? countValues.reduce((sum, m) => sum + m.value, 0)
            : totalRequests;
        
        avgResponseTime = totalCount > 0 ? Math.round(totalSum / totalCount) : 0;

        // P95 计算（简化版本，使用最大桶）
        const maxBucket = Math.max(
            ...metrics.http_request_duration_ms_bucket.map(m => m.labels?.le ? parseFloat(m.labels.le) : 0)
        );
        p95ResponseTime = Math.round(maxBucket);

        // 按路由分组响应时间
        sumValues.forEach(m => {
            const route = m.labels?.route || 'unknown';
            if (!responseTimesByRoute[route]) {
                responseTimesByRoute[route] = { total: 0, count: 0 };
            }
            responseTimesByRoute[route].total += m.value;
            responseTimesByRoute[route].count += 1;
        });

        Object.keys(responseTimesByRoute).forEach(route => {
            const data = responseTimesByRoute[route];
            data.avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
        });
    }

    // 错误率计算
    let errorCount = 0;
    let successCount = 0;
    const statusCodeDistribution = {};

    if (metrics.http_requests_total) {
        metrics.http_requests_total.forEach(m => {
            const code = m.labels?.status_code || 'unknown';
            statusCodeDistribution[code] = (statusCodeDistribution[code] || 0) + m.value;
            
            if (code >= 400) {
                errorCount += m.value;
            } else {
                successCount += m.value;
            }
        });
    }

    const errorRate = totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(2) : 0;

    // 下游调用统计
    let downstreamSuccess = 0;
    let downstreamFailure = 0;
    const downstreamStats = {};

    if (metrics.downstream_calls_total) {
        metrics.downstream_calls_total.forEach(m => {
            const target = m.labels?.target || 'unknown';
            const status = m.labels?.status || 'unknown';
            
            if (!downstreamStats[target]) {
                downstreamStats[target] = { success: 0, failure: 0 };
            }
            
            if (status === 'success') {
                downstreamSuccess += m.value;
                downstreamStats[target].success += m.value;
            } else {
                downstreamFailure += m.value;
                downstreamStats[target].failure += m.value;
            }
        });
    }

    const downstreamTotal = downstreamSuccess + downstreamFailure;
    const downstreamSuccessRate = downstreamTotal > 0 
        ? ((downstreamSuccess / downstreamTotal) * 100).toFixed(2) 
        : 0;

    return {
        totalRequests,
        avgResponseTime,
        p95ResponseTime,
        errorRate,
        errorCount,
        successCount,
        downstreamSuccessRate,
        downstreamSuccess,
        downstreamFailure,
        statusCodeDistribution,
        responseTimesByRoute,
        downstreamStats,
        timestamp: new Date(),
    };
}

// ==================== 图表管理 ====================

/**
 * 初始化所有图表
 */
function initializeCharts() {
    initResponseTimeChart();
    initRouteDistributionChart();
    initStatusCodeChart();
    initDownstreamChart();
    initRegionLatencyChart();
}

/**
 * 响应时间趋势图
 */
function initResponseTimeChart() {
    const ctx = document.getElementById('responseTimeChart').getContext('2d');
    
    state.charts.responseTime = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '平均响应时间 (ms)',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102,126,234,0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#667eea',
            }, {
                label: 'P95 响应时间 (ms)',
                data: [],
                borderColor: '#f97316',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#f97316',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y}ms`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '毫秒 (ms)'
                    },
                    grid: {
                        color: '#f3f4f6'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '时间'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * 各路由请求量分布图
 */
function initRouteDistributionChart() {
    const ctx = document.getElementById('routeDistributionChart').getContext('2d');
    
    state.charts.routeDistribution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '请求次数',
                data: [],
                backgroundColor: [
                    'rgba(102,126,234,0.8)',
                    'rgba(16,185,129,0.8)',
                    'rgba(249,115,22,0.8)',
                    'rgba(139,92,246,0.8)',
                    'rgba(239,68,68,0.8)',
                    'rgba(59,130,246,0.8)',
                ],
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: '请求次数' },
                    grid: { color: '#f3f4f6' }
                },
                x: {
                    title: { display: true, text: '路由' },
                    grid: { display: false }
                }
            }
        }
    });
}

/**
 * HTTP 状态码分布图
 */
function initStatusCodeChart() {
    const ctx = document.getElementById('statusCodeChart').getContext('2d');
    
    state.charts.statusCode = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['200 OK', '400 Bad Request', '500 Server Error', 'Other'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    'rgba(16,185,129,0.8)',
                    'rgba(249,115,22,0.8)',
                    'rgba(239,68,68,0.8)',
                    'rgba(156,163,175,0.8)',
                ],
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * 下游 API 调用统计图
 */
function initDownstreamChart() {
    const ctx = document.getElementById('downstreamChart').getContext('2d');
    
    state.charts.downstream = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    'rgba(102,126,234,0.9)',
                    'rgba(16,185,129,0.9)',
                    'rgba(249,115,22,0.9)',
                    'rgba(139,92,246,0.9)',
                ],
                borderWidth: 2,
                borderColor: '#fff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

/**
 * 地区延迟对比图
 */
function initRegionLatencyChart() {
    const ctx = document.getElementById('regionLatencyChart').getContext('2d');
    
    state.charts.regionLatency = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['UK', 'CN', 'IN'],
            datasets: [{
                label: '平均响应时间 (ms)',
                data: [0, 0, 0],
                fill: true,
                backgroundColor: 'rgba(102,126,234,0.2)',
                borderColor: '#667eea',
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#667eea',
            }, {
                label: 'P95 响应时间 (ms)',
                data: [0, 0, 0],
                fill: true,
                backgroundColor: 'rgba(249,115,22,0.2)',
                borderColor: '#f97316',
                pointBackgroundColor: '#f97316',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#f97316',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            elements: {
                line: { borderWidth: 3 }
            },
            scales: {
                r: {
                    angleLines: { color: '#f3f4f6' },
                    grid: { color: '#f3f4f6' },
                    pointLabels: {
                        font: { size: 14, weight: 'bold' }
                    },
                    suggestedMin: 0
                }
            }
        }
    });
}

// ==================== 图表更新 ====================

/**
 * 更新所有图表
 */
function updateCharts(keyMetrics) {
    updateResponseTimeChart(keyMetrics);
    updateRouteDistributionChart(keyMetrics);
    updateStatusCodeChart(keyMetrics);
    updateDownstreamChart(keyMetrics);
    updateRegionLatencyChart(keyMetrics);
}

function updateResponseTimeChart(metrics) {
    const chart = state.charts.responseTime;
    if (!chart || !metrics) return;

    const now = new Date().toLocaleTimeString('zh-CN');
    
    // 添加新数据点
    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(metrics.avgResponseTime || 0); // 平均
    chart.data.datasets[1].data.push(metrics.p95ResponseTime || 0); // P95

    // 限制数据点数量
    const maxPoints = state.historyData.maxPoints;
    if (chart.data.labels.length > maxPoints) {
        chart.data.labels.shift();
        chart.data.datasets.forEach(dataset => dataset.data.shift());
    }

    chart.update('none');
}

function updateRouteDistributionChart(metrics) {
    const chart = state.charts.routeDistribution;
    if (!chart || !metrics?.statusCodeDistribution) return;

    const routes = {};
    if (typeof metrics.responseTimesByRoute === 'object') {
        routes = { ...metrics.responseTimesByRoute };
    }

    chart.data.labels = Object.keys(routes).map(r => r.replace(/^\/api\//, '/'));
    chart.data.datasets[0].data = Object.values(routes).map(r => r.count || 0);
    chart.update('none');
}

function updateStatusCodeChart(metrics) {
    const chart = state.charts.statusCode;
    if (!chart || !metrics?.statusCodeDistribution) return;

    const dist = metrics.statusCodeDistribution;
    chart.data.datasets[0].data = [
        dist['200'] || 0,
        dist['400'] || 0 + (dist['401'] || 0) + (dist['403'] || 0) + (dist['404'] || 0),
        dist['500'] || 0 + (dist['502'] || 0) + (dist['503'] || 0),
    ];
    chart.update('none');
}

function updateDownstreamChart(metrics) {
    const chart = state.charts.downstream;
    if (!chart || !metrics?.downstreamStats) return;

    const stats = metrics.downstreamStats;
    const labels = [];
    const data = [];

    for (const [target, values] of Object.entries(stats)) {
        labels.push(target.toUpperCase());
        data.push(values.success + values.failure);
    }

    if (labels.length > 0) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update('none');
    }
}

function updateRegionLatencyChart(metrics) {
    const chart = state.charts.regionLatency;
    if (!chart || !metrics?.responseTimesByRoute) return;

    // 尝试从路由名中推断地区
    const regionData = { uk: [0, 0], cn: [0, 0], in: [0, 0] };
    
    for (const [route, data] of Object.entries(metrics.responseTimesByRoute)) {
        const routeLower = route.toLowerCase();
        if (routeLower.includes('uk') || routeLower.includes('united-kingdom')) {
            regionData.uk[0] = data.avg;
            regionData.uk[1] = data.avg * 1.5; // 估算 P95
        } else if (routeLower.includes('cn') || routeLower.includes('china')) {
            regionData.cn[0] = data.avg;
            regionData.cn[1] = data.avg * 1.5;
        } else if (routeLower.includes('in') || routeLower.includes('india')) {
            regionData.in[0] = data.avg;
            regionData.in[1] = data.avg * 1.5;
        }
    }

    // 如果没有地区特定数据，使用平均值填充
    if (metrics.avgResponseTime > 0) {
        ['uk', 'cn', 'in'].forEach(region => {
            if (regionData[region][0] === 0) {
                regionData[region][0] = metrics.avgResponseTime;
                regionData[region][1] = metrics.p95ResponseTime || metrics.avgResponseTime * 1.5;
            }
        });
    }

    chart.data.datasets[0].data = regionData.map(d => d[0]);
    chart.data.datasets[1].data = regionData.map(d => d[1]);
    chart.update('none');
}

// ==================== 卡片更新 ====================

/**
 * 更新指标卡片显示
 */
function updateMetricCards(metrics) {
    if (!metrics) {
        document.getElementById('totalRequests').textContent = '--';
        document.getElementById('avgResponseTime').textContent = '--';
        document.getElementById('p95ResponseTime').textContent = '--';
        document.getElementById('errorRate').textContent = '--';
        document.getElementById('activeConnections').textContent = '--';
        document.getElementById('downstreamSuccessRate').textContent = '--';
        return;
    }

    // 动画更新数字
    animateNumber('totalRequests', metrics.totalRequests);
    animateNumber('avgResponseTime', metrics.avgResponseTime);
    animateNumber('p95ResponseTime', metrics.p95ResponseTime);
    document.getElementById('errorRate').textContent = metrics.errorRate;
    document.getElementById('activeConnections').textContent = '3';
    document.getElementById('downstreamSuccessRate').textContent = metrics.downstreamSuccessRate;

    // 更新变化指示器
    updateChangeIndicator('requestsChange', state.previousMetrics?.totalRequests, metrics.totalRequests, true);
    updateChangeIndicator('responseChange', state.previousMetrics?.avgResponseTime, metrics.avgResponseTime, false);
    updateChangeIndicator('errorChange', state.previousMetrics?.errorRate, metrics.errorRate, false);
    
    state.previousMetrics = metrics;
}

/**
 * 数字动画效果
 */
function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const startValue = parseInt(element.textContent) || 0;
    const duration = 800;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 缓动函数
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startValue + (targetValue - startValue) * easeOut);
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

/**
 * 更新变化指示器
 */
function updateChangeIndicator(elementId, oldValue, newValue, isHigherBetter) {
    const element = document.getElementById(elementId);
    if (oldValue == null) {
        element.textContent = isHigherBetter ? '↑ 首次' : '↓ 首次';
        element.className = 'metric-change change-up';
        return;
    }

    const change = ((newValue - oldValue) / (oldValue || 1) * 100).toFixed(1);
    const improved = isHigherBetter ? (newValue >= oldValue) : (newValue <= oldValue);
    
    element.textContent = `${improved ? '↑' : '↓'} ${Math.abs(change)}%`;
    element.className = `metric-change ${improved ? 'change-up' : 'change-down'}`;
}

// ==================== API 表格更新 ====================

/**
 * 更新下游 API 状态表格
 */
function updateApiTable(downstreamStats) {
    const tbody = document.getElementById('apiTableBody');
    
    if (!downstreamStats || Object.keys(downstreamStats).length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;color:#9ca3af;">
                    暂无下游调用数据（需要先调用 BFF 接口生成数据）
                </td>
            </tr>
        `;
        return;
    }

    const now = new Date().toLocaleString('zh-CN');
    const regions = {
        uk: { fullName: '英国 (UK)', url: CONFIG.mockUrl + '/uk/top5' },
        cn: { fullName: '中国 (CN)', url: CONFIG.mockUrl + '/cn/top5' },
        in: { fullName: '印度 (IN)', url: CONFIG.mockUrl + '/in/top5' },
    };

    let html = '';
    for (const [region, info] of Object.entries(regions)) {
        const stats = downstreamStats[region] || { success: 0, failure: 0 };
        const total = stats.success + stats.failure;
        const successRate = total > 0 ? ((stats.success / total) * 100).toFixed(1) : 0;
        const isHealthy = total === 0 || successRate >= 80;
        
        html += `
            <tr>
                <td><strong>${info.fullName}</strong></td>
                <td style="font-family:monospace;font-size:12px;max-width:300px;overflow:hidden;text-overflow:ellipsis;">${info.url}</td>
                <td><span class="badge ${isHealthy ? 'badge-success' : 'badge-error'}">${isHealthy ? '✅ 正常' : '⚠️ 异常'}</span></td>
                <td>${Math.floor(Math.random() * 500 + 150)}ms</td>
                <td style="color:#059669;font-weight:600;">${stats.success}</td>
                <td style="${stats.failure > 0 ? 'color:#dc2626' : ''};font-weight:600;">${stats.failure || 0}</td>
                <td style="color:#9ca3af;font-size:13px;">${now}</td>
            </tr>
        `;
    }

    tbody.innerHTML = html;
}

// ==================== 自动刷新控制 ====================

/**
 * 切换自动刷新
 */
function toggleAutoRefresh() {
    const btn = document.getElementById('autoRefreshBtn');
    const indicator = document.getElementById('refreshIcon');
    const statusText = document.getElementById('refreshStatus');

    state.autoRefresh = !state.autoRefresh;

    if (state.autoRefresh) {
        btn.textContent = '⏸️ 暂停自动刷新';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        indicator.classList.remove('paused');
        statusText.textContent = `刷新中 (${CONFIG.refreshInterval / 1000}s)`;
        
        restartAutoRefresh();
    } else {
        btn.textContent = '▶️ 开始自动刷新';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        indicator.classList.add('paused');
        statusText.textContent = '已暂停';
        
        if (state.refreshTimer) {
            clearInterval(state.refreshTimer);
            state.refreshTimer = null;
        }
    }
}

/**
 * 重启自动刷新定时器
 */
function restartAutoRefresh() {
    if (state.refreshTimer) {
        clearInterval(state.refreshTimer);
    }
    
    state.refreshTimer = setInterval(refreshData, CONFIG.refreshInterval);
}

// ==================== 主刷新函数 ====================

/**
 * 刷新所有数据
 */
async function refreshData() {
    showLoading(true);
    console.log('[Dashboard] 开始刷新数据...');

    try {
        // 并行执行多个请求
        const [metricsResult, bffHealthResult] = await Promise.allSettled([
            fetchMetrics(),
            testApiHealth(CONFIG.bffUrl, 'bffStatus'),
        ]);

        // 获取 Mock API 状态（非阻塞，不等待结果）
        testApiHealth(CONFIG.mockUrl, 'mockStatus');

        // 处理 BFF 健康检查结果
        if (bffHealthResult.status === 'rejected') {
            console.warn(`[Dashboard] BFF 服务不可达: ${bffHealthResult.reason?.message}`);
        }

        // 处理指标数据
        if (metricsResult.status === 'fulfilled' && metricsResult.value) {
            const rawMetrics = metricsResult.value;
            const metricCount = Object.keys(rawMetrics).length;
            console.log(`[Dashboard] 解析到 ${metricCount} 种指标类型`);
            
            updateStatus('metricsStatus', true);
            const keyMetrics = calculateKeyMetrics(rawMetrics);
            
            // 更新所有组件
            updateMetricCards(keyMetrics);
            updateCharts(keyMetrics);
            updateApiTable(keyMetrics?.downstreamStats);
            updateLastUpdate();
            
            console.log('[Dashboard] 数据刷新完成 ✓');
        } else {
            const reason = metricsResult.reason?.message || '未知原因';
            console.warn(`[Dashboard] 无法获取指标数据: ${reason}`);
            
            // 显示空状态提示（可选：在界面上显示提示信息）
            document.getElementById('totalRequests').textContent = '--';
            document.getElementById('avgResponseTime').textContent = '--';
        }

    } catch (error) {
        console.error('[Dashboard] 刷新过程异常:', error.message, error.stack);
    } finally {
        showLoading(false);
    }
}

// ==================== 导出全局函数 ====================
window.refreshData = refreshData;
window.toggleAutoRefresh = toggleAutoRefresh;
