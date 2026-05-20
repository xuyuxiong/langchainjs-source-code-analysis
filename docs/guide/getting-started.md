# LangChainJS 项目概览

> 基于 LangChainJS 最新源码，深入剖析 LLM 应用开发框架的架构设计

## 📋 项目简介

LangChainJS 是一个用于构建大语言模型 (LLM) 应用程序的 JavaScript/TypeScript 框架。作为 LangChain 的 JavaScript 实现，它提供了丰富的抽象和工具，帮助开发者快速构建基于 LLM 的应用。

**项目特点**：
- **Monorepo 架构**: 使用 pnpm workspaces 管理 40+ 包
- **LCEL (LangChain Expression Language)**: 声明式编程接口
- **模块化设计**: 核心包 + 提供商集成分离
- **类型安全**: 完整的 TypeScript 支持
- **流式处理**: 原生支持流式响应

## 🗂️ 源码结构

```
langchainjs/
├── libs/                           # 核心包目录
│   ├── langchain-core/            # 核心抽象层
│   │   └── src/
│   │       ├── runnables/        # LCEL 运行时
│   │       ├── language_models/  # LLM/Chat 抽象
│   │       ├── messages/         # 消息类型
│   │       ├── prompts/          # 提示模板
│   │       ├── output_parsers/   # 输出解析
│   │       ├── callbacks/        # 回调系统
│   │       └── vectorstores.ts   # 向量存储
│   │
│   ├── langchain/                 # 主要实现包
│   │   └── src/
│   │       ├── chains/           # Chain 实现
│   │       ├── agents/           # Agent 实现
│   │       └── ...
│   │
│   ├── langchain-classic/        # 经典 API
│   ├── langchain-textsplitters/  # 文本分割
│   └── providers/                # 35+ 提供商
│       ├── openai/
│       ├── anthropic/
│       ├── google-genai/
│       └── ...
│
├── internal/                     # 内部工具
├── examples/                      # 示例代码
└── docs/                         # 官方文档
```

## 📦 核心包分析

| 包名 | 路径 | 职责 | 大小 |
|------|------|------|------|
| langchain-core | `libs/langchain-core/` | 核心抽象、接口定义、工具函数 | ~15,000 行 |
| langchain | `libs/langchain/` | 高级 API、预构建组件 | ~8,000 行 |
| langchain-classic | `libs/langchain-classic/` | 兼容旧版 API | ~5,000 行 |
| langchain-textsplitters | `libs/langchain-textsplitters/` | 文本分割策略 | ~3,000 行 |
| providers/* | `libs/providers/*/` | 第三方集成 | 35+ 包 |

## 🔄 核心依赖

```
LangChainJS 依赖关系：

┌─────────────────────────────────────────────┐
│  应用代码                                   │
└────────────┬────────────────────────────────┘
             │ import
             ▼
┌─────────────────────────────────────────────┐
│  @langchain/core                            │
│  ├── Runnable Interface                      │
│  ├── Messages                               │
│  ├── Callbacks                              │
│  └── Base Classes                            │
└──────┬──────────────────────┬─────────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐   ┌──────────────────────────┐
│ @langchain/* │   │ @langchain/openai        │
│ - chains     │   │ @langchain/anthropic     │
│ - agents     │   │ @langchain/pinecone      │
│ - memory     │   │ ... (35+ 提供商)         │
└──────────────┘   └──────────────────────────┘
```

## 🎯 核心抽象层

### 1. Runnable 接口 (LCEL 核心)

**源文件**: `libs/langchain-core/src/runnables/base.ts`

```typescript
// Runnable 是所有组件的基础接口
interface Runnable<RunInput = unknown, CallOptions = any, RunOutput = any> {
  // 核心执行方法
  invoke(input: RunInput, options?: CallOptions): Promise<RunOutput>;
  stream(input: RunInput, options?: CallOptions): AsyncGenerator<RunOutput>;
  batch(inputs: RunInput[], options?: CallOptions): Promise<RunOutput[]>;
  
  // 组合方法
  pipe<NewOutput>(other: Runnable<RunOutput, any, NewOutput>): RunnableSequence;
  bind(boundArgs: CallOptions): Runnable;
  withConfig(config: RunnableConfig): Runnable;
}
```

### 2. 语言模型抽象

**源文件**: `libs/langchain-core/src/language_models/base.ts`

```
BaseLanguageModel
    ├── BaseLLM (传统 LLM)
    │       └── OpenAI, Anthropic, Google...
    │
    └── BaseChatModel (聊天模型)
            ├── ChatOpenAI
            ├── ChatAnthropic
            └── ChatGoogleGenerativeAI
```

### 3. 消息系统

**源文件**: `libs/langchain-core/src/messages/` (19 个文件)

```
┌─────────────────────────────────────────────┐
│  BaseMessage (基类)                         │
├─────────────────────────────────────────────┤
│  ├── HumanMessage (用户消息)                │
│  ├── AIMessage (AI 回复)                    │
│  │       ├── content                         │
│  │       ├── tool_calls                      │
│  │       └── usage_metadata                 │
│  ├── SystemMessage (系统提示)               │
│  ├── FunctionMessage (函数结果)               │
│  ├── ToolMessage (工具结果)                 │
│  └── ChatMessage (通用角色)                   │
└─────────────────────────────────────────────┘
```

## ⚙️ 执行模型

### LCEL 执行流程

```
Input Data
    │
    ▼  invoke()
┌───────────────────┐
│ 1. Transform/     │
│    Serialize      │
└────────┬──────────┘
         │
    ▼  pre-combining
┌───────────────────┐
│ 2. Runnable       │
│    Pipeline       │
│    - Sequence     │
│    - Parallel     │
│    - Map          │
└────────┬──────────┘
         │
    ▼  LLM Call
┌───────────────────┐
│ 3. BaseLanguage   │
│    Model          │
│    + Token Usage  │
└────────┬──────────┘
         │
    ▼  post-processing
┌───────────────────┐
│ 4. Output Parser  │
└────────┬──────────┘
         │
    ▼
Output Data
```

## 📊 项目统计

| 指标 | 数量 |
|------|------|
| 核心包 | 7 个 |
| 提供商包 | 35+ 个 |
| 核心源码行数 | ~50,000 行 |
| 示例代码 | ~10,000 行 |
| 测试代码 | ~30,000 行 |

## 🚀 快速开始

```bash
# 安装核心包
npm install @langchain/core

# 安装特定提供商
npm install @langchain/openai

# 使用示例
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  modelName: 'gpt-4',
  temperature: 0.7,
});

const response = await model.invoke([
  new HumanMessage({ content: 'Hello!' })
]);
```

## 📚 学习路径

1. **入门**: 了解项目结构和核心抽象
2. **LCEL**: 掌握 Runnable 接口和表达式语言
3. **组件**: 深入各核心组件实现
4. **集成**: 学习回调系统和提供商集成
5. **实战**: 构建复杂 LLM 应用

---

**参考源码**: `/Users/xilin/Documents/sources/langchainjs/`