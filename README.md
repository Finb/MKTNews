# MKTNews 自动推送到 Bark

每天早上 9 点（中国时区）自动抓取 MKTNews 的"过去 24 小时关键新闻"，翻译成中文后推送到 Bark。

## 功能特点

- ⏰ 定时任务：每天早上 9:00 自动执行
- 📰 智能抓取：从 MKTNews API 获取 Past 24 Hours 关键新闻
- 🌐 自动翻译：使用 翻译 API 将英文翻译为中文
- 📱 推送通知：通过 Bark 发送到 iOS 设备
- 🎨 格式保留：保持 Markdown 格式（粗体、换行）

## 部署步骤

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 CloudFlare

```bash
wrangler login
```

### 3. 配置 Bark Device Key

编辑 `wrangler.toml` 文件，填入你的 Bark Device Key：

```toml
[vars]
BARK_DEVICE_KEY = "your_device_key_here"
```

### 4. 部署到 CloudFlare Workers

```bash
wrangler deploy
```

## 手动测试

部署后，可以通过访问 Worker 的 URL 来手动触发执行（用于测试）：

```bash
curl https://your-worker.workers.dev
```

## 文件说明

- `wrangler.toml` - CloudFlare Worker 配置文件
- `src/index.js` - 主程序逻辑

## 工作流程

1. 每天 UTC 01:00（中国时区 09:00）自动触发
2. 请求 MKTNews API 获取数据
3. 在 "Chinese Policy & Markets" (id: 1001) 节点中搜索包含 "【Past 24 Hours" 的新闻
4. 提取新闻内容，转换 HTML 标签为占位符
5. 使用 翻译 API 分段翻译内容
6. 还原为 Markdown 格式（`**粗体**` 和换行）
7. 推送到 Bark

## 注意事项

- 如果未找到符合条件的新闻，程序会静默退出
- 如果翻译失败，不会推送通知
- 内容会自动分段翻译以避免超出单次翻译字数限制
