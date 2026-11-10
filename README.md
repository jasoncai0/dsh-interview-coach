# DSH Interview Coach

Mock-first 面试教练插件：把 Agent / LLM 应用开发题库、简历优先的记忆、模拟面试和复盘放进 DeepSeek Harness。

> 当前版本是 **0.2.1（Mock + 深挖 + 补充提问）**。它不采集系统音频、不接摄像头、不依赖 TTS，也不在面试中替候选人说话；它先解决“题库 + 简历记忆 + 模拟问答 + 复盘”这条闭环。

## 当前能做什么

- **Setup**：粘贴简历、目标 JD、补充材料；支持 `.txt` / `.md` / `.docx` 导入（`.docx` 走 macOS `textutil`，PDF 请粘贴文本）。
- **Memory**：把简历、JD、补充材料拆成卡片，保留来源权重；简历权重最高，冲突时优先简历。检索使用 BM25 + 本地哈希向量 + 来源权重的混合排序。
- **Mock**：从 120 道 Agent 题库中抽题（L0–L4，每级 24 道，40 道精修），逐题作答；HUD 在作答时只显示题号/计时，不显示答案。
- **Feedback**：提交后调用 DSH `ctx.llm.stream`，按 `cue → short_answer → full_answer` 生成提示、短答和完整参考；模型失败或返回非法 JSON 时自动回退到题库答案。
- **Deep Dive**：主问题提交后可继续三层追问（机制与细节 → 边界与权衡 → 实战与度量）；每层单独评分，生成下一问，最后汇总深挖均分与重复缺口。
- **补充提问**：参考答案下方自动给出 3 个可点击的追问，点一下就让教练基于参考答案 + 简历解释；回答后继续生成新的追问选项，不需要自己输入问题。
- **Review**：汇总平均分、维度分、重复出现的 gap 和逐题改进点；深挖记录挂在原题下，并参与深度维度；可重新开始一轮。
- **HUD**：`shell.overlay` 常驻，可折叠/隐藏；深挖作答时只显示追问和计时，不展示答案；`⌘⇧H` panic hide，`Esc` 折叠已展开的答案。

## 还没做（明确边界）

- 实时 ASR / 面试官与候选人分离：当前 Mock 使用文字题卡；麦克风转写和火山流式 ASR 是下一阶段。
- 系统音频、视频、手机采集、BlackHole：未接入。
- TTS：未接入；配置项保留但默认关闭。
- 真正的 BGE-small 模型：当前 `lib/memory.js` 是确定性的本地哈希词向量（无网络、无模型下载），用于先把检索链路跑通；BGE ONNX 适配器是后续替换点。
- 20 道个性化题、GitHub/博客自动抓取：未实现；当前通过 Setup 的补充材料承接。
- 联网搜索：当前答案只基于 Setup 记忆 + 题库；`ctx.web.search` 尚未接入，避免在无搜索 provider 时阻塞 Mock。
- 屏幕共享保护：`shell.overlay` 是 HTML 层，无法从屏幕捕获中排除；正式面试请使用第二块屏幕/手机，或明确接受暴露风险。

## 安装

在 DSH 中通过 Plugin Manager 安装本目录（不要手改 profile）：

```text
plugin_manager install_bundle  <本目录绝对路径>
```

安装后刷新 DSH Web GUI。插件会出现在侧边栏“面试教练”。配置在 `cordis.patch.yml`：

```yaml
provider: deepseek-account
model: deepseek-flash
mockQuestionCount: 10
embeddingProvider: local
ttsEnabled: false
```

模型不可用时，反馈会自动回退到题库参考答案，不会让 Mock 卡死。

## 使用

1. 打开“面试教练” → **Setup**，粘贴简历（必须）、JD、补充材料，保存。
2. 到 **Mock**，选择题量/层级/主题，开始。
3. 用自己的话回答；HUD 只显示题目和计时。
4. 提交后看 `cue`、`short_answer`、`full_answer`；在“补充提问”里点自动生成的问题追问参考答案，或点“开始深挖”继续三层追问，或直接进入下一题。
5. 结束后到 **Review** 看总分、维度分、深挖均分和改进行动。
6. **Bank** 可浏览 120 道题及精修标记，不会泄露参考答案。

## 数据位置

```text
$DSH_HOME/storages/interview-coach/
  profile.json
  memory.json
  sessions.json
```

所有写入是原子替换；卡片 embedding 不落盘，加载时重建。题库在 `bank/agent.jsonl`，按级别拆分在 `bank/L0.jsonl` … `L4.jsonl`。

## 故障处理

- 页面提示“这轮 Mock 已失效”时，说明本地页面还持有已经被清理或重启前的 session；客户端会自动清掉旧状态，重新开始一场即可。
- 插件重启/升级后如果侧边栏仍是旧界面，刷新一次 DSH Web GUI；不要继续在旧页面里提交上一轮的答案。
- 同一时间只保留一个 active Mock；新开一场会把旧的未完成 session 标记为 abandoned，避免 HUD 和复盘串场。

## 开发

```bash
cd dsh-interview-coach
npm test
node --check lib/index.js
node --check lib/client.js
```

题库生成脚本：

```bash
node scripts/make-l0.mjs > bank/L0.jsonl
# …L1–L4
node -e "..."  # 合并为 bank/agent.jsonl
```

## 设计文档

架构、记忆权重、Prompt 约束、深挖设计和 P5/P6 路线：

- [docs/design.md](docs/design.md)
- [docs/deep-dive.md](docs/deep-dive.md)

## License

MIT
