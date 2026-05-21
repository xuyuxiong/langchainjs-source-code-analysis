# LangChainJS 源码深度解析

> LangChainJS 完整源码学习指南 - 从 LCEL 到 Agent 系统

[![Status](https://img.shields.io/badge/status-complete-brightgreen)](https://github.com/xuyuxiong/langchainjs-source-code-analysis)
[![LangChain](https://img.shields.io/badge/LangChain-0.3+-1c1c1c)](https://js.langchain.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Chapters](https://img.shields.io/badge/chapters-37-orange)](https://xuyuxiong.github.io/langchainjs-source-code-analysis/)

---

## 📖 项目简介

本项目是一本完整的 LangChainJS 源码学习指南，共 **37 章**，深入解析 LCEL 表达式语言、Runnable 接口、消息系统、向量存储等核心机制。

相比其他教程，本项目的特点：
- 🔍 **源码级深度** — 逐行分析核心源码，不仅讲"是什么"，更讲"为什么"
- 📊 **架构图丰富** — 每章配备类层次图、流程图、模块关系图
- 🔗 **LangChainJS 0.3+** — 覆盖 LCEL、Runnable 接口、Agent 系统等最新特性
- 🧪 **示例完整** — 每章包含可运行示例、最佳实践、常见问题
- 📱 **暗色模式** — VitePress 驱动，支持亮色/暗色切换

👉 **在线阅读**：[https://xuyuxiong.github.io/langchainjs-source-code-analysis/](https://xuyuxiong.github.io/langchainjs-source-code-analysis/)

---

## ✅ 完成情况

| 部分 | 章节数 | 状态 |
|------|--------|------|
| 📘 指南篇 | 3/3 | ✅ 已完成 |
| 📗 架构篇 | 4/4 | ✅ 已完成 |
| 🔗 LCEL 篇 | 9/9 | ✅ 已完成 |
| 🧩 组件篇 | 13/13 | ✅ 已完成 |
| 🔌 集成篇 | 8/8 | ✅ 已完成 |
| **总计** | **37/37** | **✅ 全部完成** |

---

## 📚 内容目录

### 📘 指南篇 — 入门准备
| # | 章节 | 关键词 |
|---|------|--------|
| 1 | 项目概览 | 技术栈、核心特性 |
| 2 | 源码结构 | Monorepo 布局、包组织 |
| 3 | 开发调试 | 环境搭建、调试技巧、测试指南 |

### 📗 架构篇 — 整体架构
| # | 章节 | 关键词 |
|---|------|--------|
| 4 | 架构总览 | 分层设计、核心抽象 |
| 5 | Monorepo 结构 | libs/、包依赖 |
| 6 | LangChain Core | Runnable 接口、BaseChatModel |
| 7 | 包依赖关系 | @langchain/core、提供商包 |

### 🔗 LCEL 篇 — 表达式语言

**核心接口**

| # | 章节 | 关键词 |
|---|------|--------|
| 8 | LCEL 总览 | 设计理念、并行执行 |
| 9 | Runnable 接口 | invoke、batch、stream、bind |

**组合组件**

| # | 章节 | 关键词 |
|---|------|--------|
| 10 | RunnableSequence | 顺序链、管道组合 |
| 11 | RunnableParallel | 并行执行、多分支 |
| 12 | RunnableMap | 字段映射、输入输出转换 |
| 13 | RunnableLambda | 自定义函数包装 |
| 14 | RunnableBranch | 条件分支、路由 |

**高级主题**

| # | 章节 | 关键词 |
|---|------|--------|
| 15 | 参数绑定 | bind、部分应用 |
| 16 | 流式处理 | 流式生成、增量输出 |

### 🧩 组件篇 — 核心组件

**基础组件（4 章）**

| # | 章节 | 关键词 |
|---|------|--------|
| 17 | 组件总览 | 60+ 核心抽象 |
| 18 | 语言模型 | BaseLLM、BaseChatModel、ChatOpenAI |
| 19 | 消息系统 | HumanMessage、AIMessage、SystemMessage |
| 20 | 提示模板 | PromptTemplate、ChatPromptTemplate |

**数据处理（4 章）**

| # | 章节 | 关键词 |
|---|------|--------|
| 21 | 嵌入模型 | Embeddings、向量嵌入 |
| 22 | 向量存储 | VectorStore、相似度搜索 |
| 23 | 输出解析器 | StructuredOutputParser、JSON 解析 |
| 24 | 工具系统 | Tool、Tool Calling、Zod Schema |

**高级组件（5 章）**

| # | 章节 | 关键词 |
|---|------|--------|
| 25 | 记忆管理 | BufferMemory、SummaryMemory |
| 26 | 文档加载器 | TextLoader、PDFLoader、WebLoader |
| 27 | 文本分割器 | RecursiveCharacter、MarkdownTextSplitter |
| 28 | 检索器 | BaseRetriever、向量检索 |
| 29 | Agent 机制 | AgentExecutor、规划与执行 |

### 🔌 集成篇 — 提供商集成

**核心系统（4 章）**

| # | 章节 | 关键词 |
|---|------|--------|
| 30 | 回调系统 | CallbackManager、事件处理 |
| 31 | 追踪器 | LangSmith、跟踪调试 |
| 32 | 缓存系统 | BaseCache、LLM 缓存 |
| 33 | KV 存储 | BaseStore、键值存储 |

**提供商集成（4 章）**

| # | 章节 | 关键词 |
|---|------|--------|
| 34 | OpenAI 集成 | ChatOpenAI、OpenAIEmbeddings |
| 35 | Anthropic 集成 | ChatAnthropic、Claude |
| 36 | 其他 LLM | Cohere、Google、HuggingFace |
| 37 | 向量数据库 | Pinecone、Supabase、PGVector |

---

## 🚀 快速开始

```bash
# 克隆项目
git clone https://github.com/xuyuxiong/langchainjs-source-code-analysis.git
cd langchainjs-source-code-analysis

# 安装依赖
npm install

# 启动开发服务器
npm run docs:dev
```

访问 http://localhost:5173/langchainjs-source-code-analysis/

```bash
# 构建静态文件
npm run docs:build

# 预览构建结果
npm run docs:preview
```

---

## 🛠️ 技术栈

| 项目 | 技术 |
|------|------|
| 文档框架 | [VitePress](https://vitepress.dev) |
| 构建工具 | Vite |
| 代码高亮 | Shiki |
| 图表 | ASCII 文本图 + Mermaid |
| 部署 | GitHub Actions + GitHub Pages |

---

## 📁 项目结构

```
langchainjs-source-code-analysis/
├── docs/
│   ├── .vitepress/          # VitePress 配置
│   │   └── config.mts       # 侧边栏、导航栏配置
│   ├── guide/               # 📘 指南篇 (3 章)
│   ├── architecture/        # 📗 架构篇 (4 章)
│   ├── lcel/                # 🔗 LCEL 篇 (9 章)
│   ├── components/          # 🧩 组件篇 (13 章)
│   ├── integrations/        # 🔌 集成篇 (8 章)
│   │   ├── providers/       #   提供商集成 (4 章)
│   ├── index.md             # 首页
│   └── README.md
├── .github/
│   └── workflows/
│       └── deploy-gh-pages.yml  # GitHub Actions 自动部署
├── package.json
└── README.md
```

---

## 🗺️ 学习路线

```
指南篇(入门准备) → 架构篇(设计思想) → LCEL 篇(表达式语言)
    → 组件篇 (核心组件) → 集成篇 (提供商集成)
```

建议按顺序阅读，每章包含：
- 📊 **架构图** — 类层次结构和数据流
- 🔧 **源码解析** — 逐行分析核心实现
- 💡 **关键细节** — 容易忽略的实现要点
- 📖 **实战示例** — 可运行的代码示例
- 🐛 **常见问题** — FAQ 解答
- ✅ **最佳实践** — 推荐用法和陷阱

---

## 🎯 适合人群

- ✅ 有 1-2 年 LangChain 使用经验，想深入理解原理
- ✅ 熟悉 JavaScript/TypeScript 基础
- ✅ 对 LLM 应用开发有热情
- ✅ 准备面试或技术分享，需要源码级理解

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

[MIT License](LICENSE)

---

## 👋 关于作者

本项目由 [xuyuxiong](https://github.com/xuyuxiong) 创作并维护。

如果你从中受益，欢迎给项目一个 ⭐ Star！