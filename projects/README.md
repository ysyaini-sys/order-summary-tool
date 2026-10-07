# Projects

这里保存内容项目、六阶段工作流 checkpoint 和按版本归档的 AI 产物。内容中心支持建立/选择 Project、保存断点、恢复继续、推进阶段及导出 JSON。

每个项目使用独立目录；运行时 Project 数据受 `.gitignore` 保护，仅 `example/` 跟踪到 Git。原始上传文件、凭证和敏感数据不得保存在 Project 或提交到仓库。该模块不接管订单、投放和千川计算链路。

标准阶段为 `discover → plan → produce → review → publish → learn`。跳过阶段必须记录原因；发布阶段只准备内容供用户手动发布，不操作平台账号。

## 商品详情页续接

商品详情页项目可在目录内保存 `continuation.json`，用于实现 “Continuing from” 续接。它应记录：

- `continuingFrom`：上次任务或对话来源；
- `product`：商品名称、主体图和规格；
- `platforms`：抖音/千川、天猫、拼多多等目标平台；
- `completed`、`current`、`next`：已完成步骤、当前步骤和下一步；
- `claims`：卖点及证据状态。

缺少商品名称、主体图、规格或目标平台时，状态必须为 `BLOCKED_IDENTITY`；认证、功效、销量等 claims 未有证据时不能进入最终成稿。
