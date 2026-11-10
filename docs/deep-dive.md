# 深挖追问（Deep Dive）

## 目标

主问题回答并评分后，继续沿候选人刚才的回答往下追问，避免停在“参考答案 + 静态追问列表”。

## 非目标

- 不替代主问题评分，不改变 10 题 Mock 的抽题顺序。
- 不在候选人作答时展示参考答案；HUD 仍遵守“先答后看”。
- 不强制追问；候选人可跳过并进入下一题。

## 交互

1. 主回答提交后，反馈区出现「深挖追问」入口。
2. 点击后生成第 1 层，候选人作答；提交后立即评分，并生成下一层。
3. 三层固定为：机制与细节 → 边界与权衡 → 实战与度量。
4. 第 3 层结束后显示深挖均分、重复 gap 和完整追问链。
5. 深挖记录挂在原主问题下；总复盘单独列出深挖题数与均分，并参与深度维度。

## 数据

```json
{
  "status": "active|done",
  "level": 1,
  "maxLevel": 3,
  "probes": [
    {
      "level": 1,
      "focus": "机制与细节",
      "question": "……",
      "answer": "……",
      "feedback": { "score": 0, "strengths": [], "gaps": [], "suggestions": [] },
      "submittedAt": 0
    }
  ],
  "current": { "level": 2, "focus": "边界与权衡", "question": "……" },
  "summary": { "average": 0, "depthScore": 0, "gaps": [] }
}
```

存储位置：`sessions.json` 中对应 `answers[].drill`，不需要迁移。

## API

- `POST /interview-coach/mock/drill/start`
  - `{ sessionId, questionId }`
  - 幂等：已有 drill 直接返回；只能对已作答的主问题开启。
- `POST /interview-coach/mock/drill/answer`
  - `{ sessionId, questionId, answer }`
  - 评分当前层；未到第 3 层时返回 `nextQuestion`，到第 3 层返回 `done: true` 与 summary。

## Prompt 约束

- 只问一个问题，中文，30–60 字，不给答案。
- 必须引用上一轮回答中的具体说法或缺口。
- 第 2 层追问边界/失败模式/替代方案；第 3 层追问真实案例、指标、复盘。
- 第 3 层不再生成下一问。
- 评分只针对当前层回答；简历仍是事实最高优先级，不编造项目与数字。

## 失败降级

- LLM 不可用或 JSON 非法：使用题库 `followups` 或层级模板生成问题，使用确定性评分兜底。
- 深挖失败不能阻塞主流程；用户仍可下一题/生成复盘。

> 补充提问（用户点击问题、教练解释参考答案）是独立链路，不参与深挖评分；见 `docs/design.md`。
