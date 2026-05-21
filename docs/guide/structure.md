# LangChainJS 源码结构

> 深入解析 Monorepo 组织方式、核心包职责与模块依赖关系

## 📁 根目录结构

**源码位置**: `/Users/xilin/Documents/sources/langchainjs/`

```
langchainjs/
├── README.md                      # 项目说明
├── package.json                   # 根包配置 (pnpm workspace)
├── pnpm-workspace.yaml            # pnpm 工作区定义
├── pnpm-lock.yaml                 # 依赖锁定
├── turbo.json                     # Turborepo 构建配置
│
├── libs/                          # 核心包目录
│   ├── langchain-core/           # 核心抽象层 (~15,000 行)
│   ├── langchain/                # 主要实现 (~8,000 行)
│   ├── langchain-classic/        # 经典 API (~5,000 行)
│   ├── langchain-textsplitters/  # 文本分割 (~3,000 行)
│   ├── langchain-mcp-adapters/   # MCP 适配器
│   └── providers/                # 35+ 提供商包
│
├── internal/                      # 内部工具包
│   ├── test-helpers/             # 测试辅助
│   └── scripts/                  # 构建脚本
│
├── examples/                      # 示例代码
│   └── src/                      # 各种示例
│
├── docs/                          # 官方文档
└── environment_tests/            # 环境测试
```

## 📦 libs/ 核心包详解

### 1. langchain-core

**路径**: `libs/langchain-core/src/`

**代码规模**: ~15,000 行

**核心职责**:
- 定义所有核心抽象接口
- 实现 LCEL 运行时
- 提供通用工具和类型

```
langchain-core/src/
├── index.ts                    # 统一导出
├── agents.ts                   # Agent 抽象
├── chat_history.ts            # 对话历史
├── context.ts                 # 上下文管理
├── embedding.ts               # 嵌入模型接口
├── memory.ts                  # 记忆系统
├── outputs.ts                 # 输出类型
├── prompt_values.ts           # 提示词值
├── stores.ts                  # KV 存储抽象
├── vectorstores.ts            # 向量存储 (~3,500 行)
│
├── runnables/                 # LCEL 核心 (~15 文件)
│   ├── base.ts               # BaseRunnable (~3,500 行)
│   ├── types.ts              # 类型定义
│   ├── config.ts             # RunnableConfig
│   ├── branch.ts             # RunnableBranch
│   ├── graph.ts              # 图结构
│   ├── history.ts            # 历史记录
│   ├── iter.ts               # 迭代工具
│   ├── passthrough.ts        # 透传
│   ├── router.ts             # 路由
│   └── wrappers.ts           # 包装器
│
├── language_models/           # 语言模型 (~10 文件)
│   ├── base.ts               # BaseLanguageModel
│   ├── utils.ts              # 工具函数
│   └── ...
│
├── messages/                  # 消息系统 (~19 文件)
│   ├── base.ts               # BaseMessage
│   ├── human.ts              # HumanMessage
│   ├── ai.ts                 # AIMessage
│   ├── system.ts             # SystemMessage
│   ├── tool.ts               # ToolMessage
│   └── ...
│
├── prompts/                   # 提示模板 (~15 文件)
│   ├── base.ts               # BasePromptTemplate
│   ├── chat.ts               # ChatPromptTemplate
│   ├── few_shot.ts           # FewShotPrompt
│   └── ...
│
├── output_parsers/            # 输出解析 (~12 文件)
│   ├── base.ts               # BaseOutputParser
│   ├── string.ts             # StringOutputParser
│   ├── json.ts               # JsonOutputParser
│   └── ...
│
├── callbacks/                 # 回调系统 (~8 文件)
│   ├── manager.ts            # CallbackManager
│   ├── base.ts               # CallbackHandler
│   └── ...
│
├── tracers/                   # 追踪系统 (~10 文件)
│   ├── base.ts               # BaseTracer
│   ├── log_stream.ts         # LogStreamHandler
│   ├── event_stream.ts       # EventStreamHandler
│   └── ...
│
├── tools/                     # 工具系统 (~6 文件)
│   ├── base.ts               # Tool
│   ├── utils.ts              # 工具工具函数
│   └── ...
│
├── caches/                    # 缓存系统 (~4 文件)
│   ├── base.ts               # BaseCache
│   └── ...
│
├── document_loaders/          # 文档加载器 (~10 文件)
│   ├── base.ts               # BaseDocumentLoader
│   └── ...
│
├── documents/                 # 文档系统 (~6 文件)
│   ├── document.ts           # Document
│   └── ...
│
├── example_selectors/         # 示例选择器 (~5 文件)
│   └── ...
│
├── indexing/                  # 索引系统 (~4 文件)
│   └── ...
│
├── load/                      # 序列化加载 (~10 文件)
│   ├── serializable.ts       # Serializable 基类
│   └── ...
│
├── retrievers/                # 检索器 (~6 文件)
│   └── ...
│
├── types/                     # 类型定义 (~5 文件)
│   └── ...
│
├── singletons/                # 单例模式 (~4 文件)
│   └── ...
│
├── structured_query/          # 结构化查询 (~8 文件)
│   └── ...
│
├── testing/                   # 测试工具 (~6 文件)
│   └── ...
│
└── utils/                     # 工具函数 (~33 文件)
    ├── stream.ts             # 流式处理
    ├── async_caller.ts       # 异步调用
    ├── signal.ts             # Signal 处理
    ├── types/
    │   ├── zod.ts            # Zod 类型工具
    │   └── ...
    └── ...
```

### 2. langchain

**路径**: `libs/langchain/`

**代码规模**: ~8,000 行

**核心职责**: 高级 API 实现与预构建组件

```
langchain/src/
├── chains/                   # Chain 实现
│   ├── base.ts              # BaseChain
│   ├── stuff.ts            # StuffDocumentsChain
│   ├── map_reduce.ts       # MapReduceChain
│   └── ...
│
├── agents/                   # Agent 实现
│   ├── agent.ts            # BaseSingleActionAgent
│   ├── executor.ts         # AgentExecutor
│   └── structured_chat/    # StructuredChatAgent
│
├── memory/                   # 记忆实现
│   ├── buffer.ts           # BufferMemory
│   ├── buffer_window.ts    # BufferWindowMemory
│   └── ...
│
└── ...
```

### 3. langchain-textsplitters

**路径**: `libs/langchain-textsplitters/`

**代码规模**: ~3,000 行

```
langchain-textsplitters/src/
├── base.ts                   # TextSplitter 抽象
├── character.ts             # CharacterTextSplitter
├── recursive_character.ts   # RecursiveCharacterTextSplitter
├── token.ts                 # TokenTextSplitter
├── markdown.ts              # MarkdownTextSplitter
└── ...
```

### 4. providers/

**路径**: `libs/providers/`

**数量**: 35+ 独立包

```
providers/
├── openai/                   # OpenAI 集成
│   ├── chat_models.ts       # ChatOpenAI
│   ├── llms.ts             # OpenAI (LLM)
│   ├── embeddings.ts       # OpenAIEmbeddings
│   └── types.ts
│
├── anthropic/                # Anthropic 集成
│   ├── chat_models.ts      # ChatAnthropic
│   └── ...
│
├── google-genai/             # Google Generative AI
│   ├── chat_models.ts      # ChatGoogleGenerativeAI
│   ├── llms.ts
│   └── embeddings.ts
│
├── cohere/                   # Cohere 集成
├── mistralai/                # Mistral AI 集成
├── fireworks/                # Fireworks 集成
├── together/                 # Together AI 集成
├── ai21/                     # AI21 Labs 集成
├── bedrock/                  # AWS Bedrock 集成
│
├── pinecone/                 # Pinecone 向量库
├── chroma/                   # Chroma 向量库
├── pgvector/                 # PostgreSQL 向量扩展
├── supabase/                 # Supabase 向量库
├── redis/                    # Redis 向量存储
├── qdrant/                   # Qdrant 向量库
└── ...                       # 25+ 其他提供商
```

## 🔗 依赖关系

### 核心依赖链

```
应用代码
    │
    ├──────────────────────────────────────────┐
    ▼                                        ▼
@langchain/core                          @langchain/openai
(所有包的基础)                              │
    │                                      │
    │                              ┌───────┴───────┐
    │                              │               │
    ▼                              ▼               ▼
@langchain/*                   @langchain/     @langchain/
- chains                       pinecone        - chroma
- agents                                     - pgvector
- memory                                     - ...
```

### pnpm workspace 配置

**文件**: `pnpm-workspace.yaml`

```yaml
packages:
  - 'libs/*'
  - 'libs/providers/*'
  - 'internal/*'
  - 'examples/*'
```

### 包依赖示例

**@langchain/core/package.json**:
```json
{
  "name": "@langchain/core",
  "version": "0.3.0",
  "dependencies": {
    "ansi-styles": "^5.2.0",
    "camelcase": "6",
    "decamelize": "1.2.0",
    "js-tiktoken": "^1.0.12",
    "langsmith": "^0.3.30",
    "mustache": "^4.2.0",
    "p-queue": "^6.6.2",
    "p-retry": "4",
    "uuid": "^10.0.0",
    "zod": "^3.22.4",
    "zod-to-json-schema": "^3.22.3"
  }
}
```

**@langchain/openai/package.json**:
```json
{
  "name": "@langchain/openai",
  "version": "0.3.0",
  "dependencies": {
    "@langchain/core": "workspace:*",
    "openai": "^4.77.0",
    "tiktoken": "^1.0.11",
    "zod": "^3.22.4"
  }
}
```

## 📊 模块依赖图

```
┌─────────────────────────────────────────────────────────────┐
│                      应用层 (你的代码)                       │
└──────────────┬──────────────────────────────────────────────┘
               │
         ┌─────┴─────┐
         │           │
         ▼           ▼
┌─────────────┐ ┌─────────────────────────────────────────────┐
│@langchain/  │ │  @langchain/providers/*                      │
│langchain    │ │  - @langchain/openai                        │
│             │ │  - @langchain/anthropic                     │
│ • Chains    │ │  - @langchain/google-genai                  │
│ • Agents    │ │  - @langchain/pinecone                      │
│ • Memory    │ │  - @langchain/chroma                        │
└──────┬──────┘ │  - ... (35+)                                │
       │         └─────────────────┬───────────────────────────┘
       │                           │
       └───────────┬───────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │ @langchain/core │
         │                 │
         │ • Runnables     │
         │ • Messages      │
         │ • Prompts       │
         │ • Embeddings    │
         │ • VectorStores  │
         │ • Callbacks     │
         │ • Tracers       │
         └─────────────────┘
```

## 🔍 核心源码文件详解

### 1. runnables/base.ts

**行数**: ~3,500 行

**位置**: `libs/langchain-core/src/runnables/base.ts`

**主要类**:
```typescript
// 导出的核心类
export {
  // 基础类
  Runnable,
  RunnableBinding,
  RunnableSequence,
  RunnableParallel,
  RunnableMap,
  RunnableLambda,
  RunnableBranch,
  
  // 工具类
  RunnablePassthrough,
  RunnablePick,
  
  // 包装器
  RunnableWithFallbacks,
  RunnableWithRetry,
  RunnableEach,
  
  // 配置相关
  RunnableConfig,
  ensureConfig,
  patchConfig,
}
```

**关键方法**:
```typescript
class Runnable<RunInput, CallOptions, RunOutput> {
  invoke(input: RunInput, options?: CallOptions): Promise<RunOutput>;
  stream(input: RunInput, options?: CallOptions): AsyncGenerator<RunOutput>;
  batch(inputs: RunInput[], options?: CallOptions): Promise<RunOutput[]>;
  
  pipe(other: Runnable): RunnableSequence;
  bind(kwargs: Partial<CallOptions>): Runnable;
  withConfig(config: RunnableConfig): Runnable;
  withRetry(config?: RetryConfig): Runnable;
  withFallbacks(fallbacks: Runnable[]): Runnable;
}
```

### 2. messages/ 目录

**文件数**: 19 个

**核心文件**:
| 文件 | 类 | 用途 |
|------|----|----|
| `base.ts` | BaseMessage | 消息基类 |
| `human.ts` | HumanMessage | 用户消息 |
| `ai.ts` | AIMessage | AI 回复 |
| `system.ts` | SystemMessage | 系统提示 |
| `tool.ts` | ToolMessage | 工具调用结果 |
| `function.ts` | FunctionMessage | 函数调用结果 |
| `chat.ts` | ChatMessage | 通用角色消息 |

### 3. vectorstores.ts

**行数**: ~3,500 行

**位置**: `libs/langchain-core/src/vectorstores.ts`

**核心类**:
```typescript
abstract class VectorStore extends Serializable {
  // 核心方法
  addVectors(vectors: number[], documents: Document[]): Promise<string[]>;
  addDocuments(documents: Document[]): Promise<string[]>;
  similaritySearch(query: string, k?: number): Promise<Document[]>;
  similaritySearchVector(query: number[], k?: number): Promise<Document[]>;
  
  // 检索器
  asRetriever(): VectorStoreRetriever<this>;
  
  // 删除操作
  delete(params?: { ids?: string[] }): Promise<void>;
}
```

### 4. callbacks/manager.ts

**位置**: `libs/langchain-core/src/callbacks/manager.ts`

**核心类**:
```typescript
class CallbackManager {
  // 添加处理器
  addHandler(handler: BaseCallbackHandler): void;
  
  // 生命周期事件
  handleLLMStart(llm: Serialized, prompts: string[]): Promise<void>;
  handleLLMEnd(output: LLMResult): Promise<void>;
  handleChainStart(chain: Serialized, inputs: ChainValues): Promise<void>;
  handleChainEnd(outputs: ChainValues): Promise<void>;
  handleToolStart(tool: Serialized, input: string): Promise<void>;
  handleToolEnd(output: string): Promise<void>;
  handleRetrieverStart(retriever: Serialized, query: string): Promise<void>;
  handleRetrieverEnd(documents: Document[]): Promise<void>;
}
```

## 📈 代码统计

| 模块 | 文件数 | 代码行数 | 说明 |
|------|--------|----------|------|
| runnables/ | 15 | ~8,000 | LCEL 运行时 |
| language_models/ | 8 | ~3,000 | LLM/Chat 抽象 |
| messages/ | 19 | ~4,000 | 消息类型系统 |
| prompts/ | 15 | ~3,500 | 提示模板 |
| output_parsers/ | 12 | ~2,000 | 输出解析 |
| callbacks/ | 8 | ~2,000 | 回调管理 |
| tracers/ | 10 | ~2,500 | 追踪器 |
| vectorstores.ts | 1 | ~3,500 | 向量存储 |
| tools/ | 6 | ~1,500 | 工具定义 |
| **Core 总计** | ~100 | **~30,000** | 核心抽象库 |
| langchain/ | ~50 | ~8,000 | 高级 API |
| providers/ | 35+ | ~50,000 | 第三方集成 |

---

**源码参考**: `/Users/xilin/Documents/sources/langchainjs/`