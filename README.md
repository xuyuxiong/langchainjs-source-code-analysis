# LangChainJS 源码深度解析

> 深入剖析 LangChainJS 架构、LCEL (LangChain Expression Language)、Agent 系统与 35+ 提供商集成实现原理

## 🌐 在线阅读

- [GitHub Pages](https://xuyuxiong.github.io/langchainjs-source-code-analysis/)

## 🚀 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run docs:dev

# 构建静态站点
npm run docs:build

# 预览构建结果
npm run docs:preview
```

## 📚 目录结构

### 入门指南
- [项目概览](docs/guide/getting-started.md) — 技术栈、核心依赖、架构概览
- [源码结构](docs/guide/structure.md) — Monorepo 组织、核心包结构
- [开发调试](docs/guide/development.md) — 环境搭建、调试技巧

### 核心架构
- [架构总览](docs/architecture/overview.md) — 分层架构设计
- [Monorepo 结构](docs/architecture/monorepo.md) — 包组织与依赖关系
- [LangChain Core](docs/architecture/langchain-core.md) — 核心抽象层
- [包依赖关系](docs/architecture/dependencies.md) — 依赖图分析

### LCEL (LangChain Expression Language)
- [LCEL 总览](docs/lcel/overview.md) — 表达式语言设计理念
- [Runnable 接口](docs/lcel/runnable-interface.md) — 核心抽象
- [RunnableSequence](docs/lcel/runnable-sequence.md) — 链式组合
- [RunnableParallel](docs/lcel/runnable-parallel.md) — 并行执行
- [RunnableMap](docs/lcel/runnable-map.md) — 映射转换
- [RunnableLambda](docs/lcel/runnable-lambda.md) — 自定义函数
- [RunnableBranch](docs/lcel/runnable-branch.md) — 条件分支
- [绑定与配置](docs/lcel/binding-config.md) — bind 机制
- [流式处理](docs/lcel/streaming.md) — 实时响应

### 核心组件
- [组件总览](docs/components/overview.md) — 60+ 核心抽象
- [语言模型](docs/components/language-models.md) — LLM/Chat Model 架构
- [提示模板](docs/components/prompts.md) — Prompt 工程系统
- [消息系统](docs/components/messages.md) — 消息类型与处理
- [输出解析器](docs/components/output-parsers.md) — 结构化输出
- [嵌入模型](docs/components/embeddings.md) — Embeddings 接口
- [向量存储](docs/components/vectorstores.md) — VectorStore 抽象
- [Agent 系统](docs/components/agents.md) — ReAct/Plan-and-Execute
- [工具定义](docs/components/tools.md) — Tool 接口与实现
- [记忆系统](docs/components/memory.md) — 对话历史管理
- [文档加载器](docs/components/document-loaders.md) — 文档解析
- [文本分割器](docs/components/text-splitters.md) — 分块策略
- [检索器](docs/components/retrievers.md) — 向量检索

### 回调与追踪
- [回调系统](docs/integrations/callbacks.md) — CallbackManager 机制
- [追踪系统](docs/integrations/tracers.md) — LangSmith 集成

### 存储与缓存
- [缓存系统](docs/integrations/caches.md) — 结果缓存
- [存储抽象](docs/integrations/stores.md) — KV/File Store

### 提供商集成
- [OpenAI](docs/integrations/providers/openai.md)
- [Anthropic](docs/integrations/providers/anthropic.md)
- [其他 LLM](docs/integrations/providers/llms.md)
- [向量数据库](docs/integrations/providers/vectorstores.md)

## 🔑 核心概念速查

```
LangChainJS 架构分层：

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
│  ├── Runnable Interface                      │
│  ├── BaseLanguageModel                       │
│  ├── Messages & Prompts                      │
│  ├── Output Parsers                          │
│  ├── Callbacks & Tracing                     │
│  └── VectorStores                            │
├─────────────────────────────────────────────┤
│  Providers (libs/providers/*)               │
│  ├── OpenAI, Anthropic, Google             │
│  ├── Vector Stores (Pinecone, Chroma, etc.)  │
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
  ├──▶ RunnableSequence ──▶ 顺序执行
  │       [Step1] → [Step2] → [Step3]
  │
  ├──▶ RunnableParallel ──▶ 并行执行
  │       ├── Branch A
  │       └── Branch B
  │
  └──▶ RunnableBranch ──▶ 条件分支
          Condition? ──▶ Runnable A
          Condition? ──▶ Runnable B
                │
                ▼
              Output
```

## 📝 版本信息

| 项目 | 版本 |
|------|------|
| LangChainJS 源码 | 最新 |
| langchain-core | 0.3.x |
| langchain | 0.3.x |
| 提供商集成 | 35+ |

## 📄 License

MIT