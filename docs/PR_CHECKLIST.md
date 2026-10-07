# PR 合并检查表

提交 PR 前：

- [ ] 分支不是 `main`
- [ ] PR 只包含本次需求相关文件
- [ ] 没有提交 Excel、CSV、密码或本地绝对路径
- [ ] 没有整文件覆盖另一方正在开发的页面
- [ ] 未提交真实 Profile / Project、checkpoint、AI 产物或 Gateway/API 凭据
- [ ] 内容中心无 AI 配置时仍可建立 Profile/Project、保存并恢复断点
- [ ] 六阶段与非详情页 Skills 可从内容中心入口访问
- [ ] OpenClaw endpoint 仅使用本机配置，服务仍只监听 loopback
- [ ] 发布/账号/投放/通知相关操作没有自动化外部副作用
- [ ] 原订单、投放、千川页面与计算脚本无非必要改动
- [ ] 已说明修改文件和测试方式

用户测试时：

- [ ] 首页能打开
- [ ] 订单上传区能打开
- [ ] 千川分析入口能打开
- [ ] 上传测试文件后能分析
- [ ] 分析结果弹窗或页面正常
- [ ] 下载和在线表格功能正常
- [ ] 错误提示清楚

合并前：

- [ ] 用户明确确认可以合并
- [ ] PR 没有未解决的冲突
- [ ] PR 没有未处理的审查意见
- [ ] 合并后已打开 GitHub Pages 正式地址复查

- [ ] GitHub Actions 的 `test` 检查已通过
- [ ] 分支已更新到最新 `main`
- [ ] `main` 分支保护规则仍然开启
- [ ] GitHub Pages 已从合并后的 `main` 提交发布
- [ ] 已打开 https://ysyaini-sys.github.io/order-summary-tool/ 复查正式版本
