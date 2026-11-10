# 面试官模式 v1

0.6.0 起，插件在同一套 DSH 插件里提供两个工作区：**候选人** 和 **面试官**。首次进入时选择身份，之后可在面板右上角随时切换。

## 目标

面试官模式解决的是“按一位候选人的材料准备面试、逐题记录、最后整理评估草稿”这条闭环；它不替面试官做录用决定，也不提供实时答案 HUD。

v1 的范围：

- 单候选人。
- 面试官工作区与候选人工作区数据隔离。
- 准备 → 计划 → 面试 → 评估 → 题库五个页签。
- 面试官不做实时 HUD。
- 最终录用决定由人完成。

## 工作流

1. **准备**：填写候选人姓名/代号、目标岗位、级别、轮次、时长，粘贴 JD 和简历（支持 `.txt/.md/.docx`）。保存后会生成候选人自己的记忆卡片。
2. **计划**：选择 6/8/10 题，生成一版计划。每题包含层级、主题、观察点、可追问和红线；可以直接编辑题干、移除题目，保存后开始。
3. **面试**：逐题显示问题和观察点，记录候选人的回答、补充笔记和 `强/中性/弱` 信号；可切换“隐藏提示”用于投屏保护。记录后进入下一题，也可以提前结束。
4. **评估**：结束面试后生成四维评估草稿：技术深度、问题解决、沟通表达、岗位匹配。每个维度给出 1–5 分和可追溯的原文证据；证据不足时分数为 `null`。面试官可以修改总结、建议、分数和下一轮建议。
5. **题库**：只读展示 120 道预置题；候选人的“我的题”不会进入面试官工作区。

## 评估规则

- 只依据面试官记录的回答、笔记和信号；不根据年龄、性别、婚育、籍贯、民族、宗教、学校等与岗位无关的信息评分。
- 每条证据必须能在记录中逐字找到；找不到就不能作为评分依据。
- 少于 2 道不同题的回答时，四个维度分数全部为 `null`，建议固定为“证据不足”，避免用一段回答给四个维度凑分。
- 建议值：`strong_hire / hire / lean_hire / no_hire / insufficient`；最终决定仍由面试官做出。
- LLM 不可用或返回非法 JSON 时，计划回退到预置题库，评估回退到基于信号/笔记的规则草稿；记录本身不会丢失。

## 数据隔离

```text
$DSH_HOME/storages/interview-coach/
  interviewer/
    candidates/<candidateId>.json
    plans/<planId>.json
    sessions/<sessionId>.json
    current.json
```

候选人工作区的 `profile.json`、`memory.json`、`sessions.json`、`personal-bank.json`、`answer-bank.json` 不会被面试官工作区读取。面试官候选人数据也不会出现在候选人的 Setup / Mock / 回答库中。

## API

| Method | Path | 作用 |
| --- | --- | --- |
| POST | `/interview-coach/role` | 选择/切换身份 |
| GET | `/interview-coach/state` | 按身份返回状态；面试官状态不含候选人记忆 |
| POST | `/interview-coach/interviewer/candidate` | 保存候选人材料、重建卡片 |
| POST | `/interview-coach/interviewer/plan/generate` | 生成计划草稿（可回退题库） |
| POST | `/interview-coach/interviewer/plan` | 保存计划 |
| POST | `/interview-coach/interviewer/start` | 开始或恢复本轮面试 |
| POST | `/interview-coach/interviewer/answer` | 记录一题回答、笔记和信号 |
| POST | `/interview-coach/interviewer/finish` | 结束并生成评估草稿 |
| GET/POST | `/interview-coach/interviewer/report` | 读取/修订评估 |

## 边界

- 不做多候选人对比、人才库、面试安排或日历。
- 不做实时 ASR、摄像头或系统音频采集。
- 不做面试官 HUD；面试官需要看的是自己的记录，不是给候选人提示。
- 评估是证据整理草稿，不是自动录用决策。
