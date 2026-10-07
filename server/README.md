# AI Workstation Service

这是工作台的本地 AI 接入层。浏览器页面不保存 API Key 或 Gateway token；服务端支持 OpenAI Responses API，也支持 OpenAI-compatible Responses endpoint。未配置凭据时，`/health` 会报告 `aiConfigured: false`，`/api/assistant` 返回安全的 `ai_not_configured`，不会伪造 AI 结果。

启动：

```text
export OPENAI_API_KEY='你的 OpenAI API Key'
node server/index.js
```

也可将本机 OpenClaw Gateway 作为模型提供方，不需要把工作台部署到云端。先在本机启动并配置好 OpenClaw，再在同一个终端设置 Gateway 地址、模型别名和 token：

```bash
export OPENAI_BASE_URL='http://127.0.0.1:18789/v1'
export OPENAI_MODEL='openclaw/default'
export OPENCLAW_GATEWAY_TOKEN='你的本机 Gateway token'
node server/index.js
```

`18789` 是 OpenClaw Gateway 常见默认端口；若你的实例使用其他本机端口或模型别名，请以本机 Gateway 配置为准。未显式设置 `OPENAI_BASE_URL` 时，Gateway token 默认只发往 `127.0.0.1:18789`；如果配置的 Gateway 地址不是 loopback，本服务会拒绝创建该 provider，防止把 Gateway token 发往外部。Gateway token 只由服务端发送，不能写入 HTML、浏览器存储、Profile/Project 文件或 Git。`/health` 仅显示是否配置及提供方名称，不返回地址或凭据。若同时设置 `OPENCLAW_GATEWAY_TOKEN` 和 `OPENAI_API_KEY`，当前配置会选择 OpenClaw；不设置 Gateway token 时保持默认 OpenAI 行为。

默认监听 `127.0.0.1:8787`。从 `http://127.0.0.1:8787/content-center.html` 打开通用电商内容中心，也可打开 AI 助手或商品详情页工作台。助手最近 12 条对话按 Project ID 保存在浏览器本地存储，可单独清空。

服务提供任务路由、可审查的 Skill 注册、上下文组装、只读工具调用和按版本归档。Profile/Project API 仅绑定本机服务；运行数据按 `.gitignore` 规则留在本地。内容中心支持无 AI 的画像与项目管理、六阶段断点续做及 JSON 导出。详情页身份信息不全时，服务端会在调用模型前拒绝请求。订单、投放与千川页面的 AI 解读均由用户主动触发，并且只发送经过限定的汇总指标；原有计算继续由现有模块负责。

未配置 AI 时，服务端会返回 `ai_not_configured`，错误提示可配置 `OPENAI_API_KEY` 或 `OPENCLAW_GATEWAY_TOKEN`；本地内容管理不受影响。
