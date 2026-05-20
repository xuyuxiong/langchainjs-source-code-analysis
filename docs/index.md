# LangChainJS 源码深度解析

深入剖析 LangChainJS 架构、LCEL 表达式语言、Agent 系统与 35+ 提供商集成实现原理。

## 📚 文档导航

<div class="vp-doc">

### 🚀 入门指南
- [项目概览](./guide/getting-started.md) — 技术栈、核心依赖、架构概览
- [源码结构](./guide/structure.md) — Monorepo 组织、核心包结构
- [开发调试](./guide/development.md) — 环境搭建、调试技巧

### 🏗️ 核心架构
- [架构总览](./architecture/overview.md) — 分层架构设计
- [Monorepo 结构](./architecture/monorepo.md) — 包组织与依赖关系
- [LangChain Core](./architecture/langchain-core.md) — 核心抽象层

### 🔄 LCEL (LangChain Expression Language)
- [LCEL 总览](./lcel/overview.md) — 表达式语言设计理念
- [Runnable 接口](./lcel/runnable-interface.md) — 核心抽象
- [RunnableSequence](./lcel/runnable-sequence.md) — 链式组合
- [RunnableParallel](./lcel/runnable-parallel.md) — 并行执行
- [流式处理](./lcel/streaming.md) — 实时响应

### 🧩 核心组件
- [组件总览](./components/overview.md) — 60+ 核心抽象
- [语言模型](./components/language-models.md) — LLM/Chat Model 架构
- [提示模板](./components/prompts.md) — Prompt 工程系统
- [消息系统](./components/messages.md) — 消息类型与处理
- [Agent 系统](./components/agents.md) — ReAct/Plan-and-Execute

### 🔌 集成与工具
- [回调系统](./integrations/callbacks.md) — CallbackManager 机制
- [追踪系统](./integrations/tracers.md) — LangSmith 集成
- [提供商集成](./integrations/providers/) — OpenAI/Anthropic/35+

</div>

## 🎯 核心概念速查

```
LangChainJS 分层架构：

┌─────────────────────────────────────────────┐
│  应用层 (Application)                        │
│  ├── Chains (Legacy)                         │
│  ├── Agents                                    │
│  └── LCEL Pipelines                           │
├─────────────────────────────────────────────┤
│  LangChain (libs/langchain)                 │
│  ├── 高级抽象与工厂函数                       │
│  └── 预构建 Chain 实现                        │
├─────────────────────────────────────────────┤
│  LangChain Core (libs/langchain-core)       │
│  ├── BaseLanguageModel                       │
│  ├── Runnable Interface                      │
│  ├── Messages & Prompts                      │
│  ├── Callbacks & Tracing                     │
│  └── Utilities                               │
├─────────────────────────────────────────────┤
│  Providers (libs/providers/*)               │
│  ├── OpenAI, Anthropic, Google             │
│  ├── Vector Stores (35+)                   │
│  └── Document Loaders                        │
└─────────────────────────────────────────────┘
```

```
LCEL 执行流程：

Input
  │
  ▼  invoke()
Runnable
  │
  ├──▶ RunnableSequence (顺序执行)
  │       ├── Step 1
  │       ├── Step 2
  │       └── Step 3
  │
  ├──▶ RunnableParallel (并行执行)
  │       ├── Branch A
  │       └── Branch B
  │
  └──▶ RunnableBranch (条件分支)
          ├── Condition 1 → Runnable A
          └── Condition 2 → Runnable B
                │
                ▼
              Output
```

## 📝 版本信息

| 项目 | 版本 |
|------|------|
| LangChainJS | 最新源码 |
| langchain-core | 0.3.x |
| langchain | 0.3.x |
| 提供商集成 | 35+ |

## 🌐 在线阅读

- [GitHub Pages](https://xuyuxiong.github.io/langchainjs-source-code-analysis/)

## 📄 License

MIT