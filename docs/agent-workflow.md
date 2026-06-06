# VoltPilot Agent 工作流

## 总体设计

VoltPilot 不把大模型当成唯一决策者，而是设计成“LLM + 工具 + 策略约束 + 人工确认”的 Agent 产品系统。

## Agent 分工

| Agent | 作用 | 工具 |
| --- | --- | --- |
| Intent Agent | 从自然语言中抽取起终点、时间、偏好和约束 | `nlp.extract_trip_constraints` |
| Vehicle Twin Agent | 读取 SOC、SOH、电池温度、历史能耗画像 | `vehicle.get_state` |
| Energy Forecast Agent | 结合路线、天气、速度和温度预测真实耗电 | `model.predict_energy` |
| Charging Network Agent | 查询充电站、价格、排队、功率和故障风险 | `charging.search_and_filter` |
| Decision Agent | 按时间、成本、电池安全做多目标排序 | `optimizer.rank_plans` |
| Experience Agent | 生成可解释方案，等待用户确认后执行 | `ux.render_confirmable_plan` |

## 产品化原则

- 关键计算不用 LLM 自由生成，避免不可控。
- 每次推荐必须保存候选站点、权重、工具输出和解释。
- 涉及支付、导航同步、强制车队调度时必须人工确认。
- DeepSeek 主要用于自然语言解释、场景总结和用户追问。

## 核心指标

- 续航预测误差：目标低于 6%。
- 充电站排队预测误差：目标低于 8 分钟。
- 推荐采纳率：目标高于 65%。
- Agent 工具调用成功率：目标高于 97%。
- 人工接管率：用于识别高风险场景和工具缺口。
- 到达低电量风险：SOC 低于 10% 的行程占比持续下降。
