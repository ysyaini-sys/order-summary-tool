# Projects

这里保存内容或经营项目的外围元数据与产物索引。第一阶段不接入订单、投放和千川计算链路。

每个项目使用独立目录；原始上传文件、凭证和敏感数据不得提交到仓库。

## 商品详情页续接

商品详情页项目可在目录内保存 `continuation.json`，用于实现 “Continuing from” 续接。它应记录：

- `continuingFrom`：上次任务或对话来源；
- `product`：商品名称、主体图和规格；
- `platforms`：抖音/千川、天猫、拼多多等目标平台；
- `completed`、`current`、`next`：已完成步骤、当前步骤和下一步；
- `claims`：卖点及证据状态。

缺少商品名称、主体图、规格或目标平台时，状态必须为 `BLOCKED_IDENTITY`；认证、功效、销量等 claims 未有证据时不能进入最终成稿。
