# VoltPilot AI EV Agent Platform

[GitHub 仓库](https://github.com/1402605737-create/voltpilot-ai-ev-agent) · [线上 Demo](https://voltpilot-ai-ev-agent-web.vercel.app) · [后端健康检查](https://voltpilot-ai-ev-agent-api.vercel.app/health)

**线上状态：** Vercel 前后端已部署 · Supabase Postgres 已连接 · DeepSeek V4 Flash 已配置 · 真实 Agent 调用已验证

VoltPilot 是一个面向 AI 产品经理作品集的新能源汽车复杂 AI 产品 Demo，覆盖“补能规划 + 电池健康 + 充电站运营 + 车队调度 + 模型评估 + 数据权限”。

## 产品亮点

- **AI 补能 Agent**：将用户自然语言目标拆解为车辆状态读取、路线能耗预测、充电站检索、多目标排序和确认式执行。
- **电池健康数字孪生**：展示 SOH、快充占比、深度放电、模组温差和残值风险。
- **运营后台**：模拟充电站需求预测、动态定价、故障巡检和分流策略。
- **模型评估看板**：展示续航预测误差、拥堵预测、解释一致性和工具调用成功率。
- **DeepSeek 双模式**：没有 API Key 时可完整 mock 演示；配置 Key 后后端调用 DeepSeek 生成决策解释。
- **隔离部署**：使用独立 `voltpilot` Schema、独立 `voltpilot_app` 数据库角色和独立 Vercel 前后端项目，不影响其他应用。

## 运行方式

```bash
npm install
npm run dev
```

前端默认运行在 `http://127.0.0.1:5190`，后端 API 默认运行在 `http://127.0.0.1:8795`。

## 接入 DeepSeek

复制 `.env.example` 为 `.env`，填入你的 Key：

```bash
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
PORT=8795
VITE_API_BASE=http://127.0.0.1:8795
```

前端不会直接读取 API Key。浏览器只调用本地 `/api/agent`，后端负责调用 DeepSeek，避免密钥泄露。

## 作品集讲解建议

面试时可以按这条主线讲：

1. 用户痛点：新能源车主长途出行的续航焦虑、排队不确定、补能成本和电池健康不透明。
2. 产品方案：VoltPilot 用 Agent 编排多个确定性工具，输出可确认、可解释、可兜底的补能决策。
3. AI 边界：大模型负责意图理解和解释生成，能耗预测、站点排序、费用计算等关键决策由结构化工具完成。
4. 数据闭环：用户实际到站 SOC、真实等待、充电失败原因和推荐采纳情况反哺模型评估。
5. 商业价值：C 端提升长途体验，B 端提升站点利用率和车队补能效率，车企侧可形成售后和电池健康服务。
