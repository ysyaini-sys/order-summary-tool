# AI Workstation Service

这是工作台的本地 AI 接入层。浏览器页面不保存 API Key；服务端从 `OPENAI_API_KEY` 读取密钥，并通过 OpenAI Responses API 调用模型。未配置密钥时，`/health` 会报告 `aiConfigured: false`，`/api/assistant` 返回安全的 `ai_not_configured`，不会伪造 AI 结果。

启动：

```text
OPENAI_API_KEY=... node server/index.js
```

默认监听 `127.0.0.1:8787`。从 `http://127.0.0.1:8787/ai-assistant.html` 打开 AI 助手，从 `http://127.0.0.1:8787/detail-page.html` 打开商品详情页工作台。助手最近 12 条对话按 Project ID 保存在浏览器本地存储，可单独清空。

服务提供任务路由、上下文组装、只读工具调用和商品详情页结果归档。详情页身份信息不全时，服务端会在调用模型前拒绝请求。订单、投放与千川页面的 AI 解读均由用户主动触发，并且只发送经过限定的汇总指标；原有计算继续由现有模块负责。
