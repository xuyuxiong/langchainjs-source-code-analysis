# LangChainJS 架构总览

> 深入剖析 LangChainJS 的分层架构设计、核心抽象与执行流程

## 📋 架构分层

LangChainJS 采用清晰的分层架构设计：

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Application)                      │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   LangGraph     │  │   Custom Apps    │                │
│  │  (状态图/Agent)  │  │   (自定义应用)    │                │
│  └──────────────────┘  └──────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│              LangChain (libs/langchain)                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ • Chains (传统链式 API)                                 ││
│  │ • Agents (预构建 Agent)                                 ││
│  │ • Memory (记忆实现)                                     ││
│  │ • Tools (工具集合)                                      ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│            LangChain Core (libs/langchain-core)             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │  Runnable 接口       │  │  BaseLanguageModel           │  │
│  │  - invoke()         │  │  - BaseLLM                   │  │
│  │  - stream()         │  │  - BaseChatModel             │  │
│  │  - batch()          │  │                              │  │
│  ├─────────────────────┤  ├─────────────────────────────┤  │
│  │  Messages           │  │  Prompts                     │  │
│  │  - HumanMessage     │  │  - PromptTemplate            │  │
│  │  - AIMessage        │  │  - ChatPromptTemplate        │  │
│  │  - SystemMessage    │  │  - FewShotPromptTemplate     │  │
│  │  - ToolMessage      │  │                              │  │
│  ├─────────────────────┤  ├─────────────────────────────┤  │
│  │  Output Parsers     │  │  Callbacks & Tracers         │  │
│  │  - BaseOutputParser │  │  - CallbackManager           │  │
│  │  - JsonOutputParser │  │  - LangChainTracer           │  │
│  │  - XMLParser        │  │                              │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│              Providers (libs/providers/*)                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  LLM 提供商：OpenAI, Anthropic, Google, Cohere...       ││
│  │  VectorStore: Pinecone, Chroma, PGVector, Supabase...  ││
│  │  Document Loaders: PDF, CSV, HTML, Notion...           ││
│  └─────────────────────────────────────────────────────────┘│
│  35+ 独立包，每个包独立版本管理                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 核心设计理念

### 1. Runnable 统一接口

所有组件都实现 `Runnable` 接口，确保一致性：

```typescript
interface Runnable<RunInput, CallOptions, RunOutput> {
  // 单次调用
  invoke(input: RunInput, options?: Partial<CallOptions>): Promise<RunOutput>;
  
  // 流式响应
  stream(input: RunInput, options?: Partial<CallOptions>): AsyncGenerator<RunOutput>;
  
  // 批量处理
  batch(inputs: RunInput[], options?: Partial<CallOptions>, batchOptions?: RunnableBatchOptions): Promise<RunOutput[]>;
  
  // 组合方法
  pipe<NewRunOutput>(next: Runnable<RunOutput, CallOptions, NewRunOutput>): RunnableSequence<RunInput, NewRunOutput>;
  bind(boundArgs: Partial<CallOptions>): Runnable<RunInput, CallOptions, RunOutput>;
  withConfig(config: RunnableConfig): Runnable<RunInput, CallOptions, RunOutput>;
}
```

**优势**：
- 所有组件可以互换使用
- 统一的错误处理机制
- 一致的流式处理支持
- 链式组合语法糖

### 2. LCEL (LangChain Expression Language)

基于 Runnable 的声明式组合语言：

```typescript
// 声明式链式调用
const chain = prompt
  | model
  | outputParser;

// 等同于
const chain = new RunnableSequence({
  first: prompt,
  last: new RunnableSequence({
    first: model,
    last: outputParser
  })
});
```

**核心特性**：
- **声明式**：像 Unix 管道一样组合组件
- **类型安全**：TypeScript 类型推导
- **流式优先**：原生支持流式响应
- **可组合**：任意 Runnable 可以组合

### 3. 消息抽象

统一的消息类型系统：

```
┌─────────────────────────────────────────────┐
│  BaseMessage (基类)                         │
│  ├─ content: string | ArrayContent         │
│  ├─ name?: string                          │
│  ├─ id?: string                            │
│  ├─ additional_kwargs: Record<string, any> │
└─────────────────────────────────────────────┘
         │
    ┌────┼────┬────────────┬────────────┐
    ▼    ▼    ▼            ▼            ▼
HumanMessage  AIMessage  SystemMessage  ToolMessage
├─ content    ├─ content  ├─ content     ├─ tool_call_id
└─ type       ├─ tool_calls             └─ artifact
              ├─ usage_metadata
              ├─ refusal
              └─ id
```

### 4. 回调与追踪系统

```
CallbackManager
    │
    ├── handleLLMStart()       ──▶  LLM 调用开始
    ├── handleLLMEnd()         ──▶  LLM 调用结束
    ├── handleChainStart()     ──▶  Chain 执行开始
    ├── handleChainEnd()       ──▶  Chain 执行结束
    ├── handleToolStart()      ──▶  Tool 调用开始
    ├── handleToolEnd()        ──▶  Tool 调用结束
    └── handleRetrieverStart() ──▶  检索器开始

实现类:
├── ConsoleCallbackHandler   (控制台输出)
├── LangChainTracer          (LangSmith 追踪)
├── LogStreamCallbackHandler (流式日志)
└── CustomHandler            (自定义实现)
```

## 📦 Monorepo 结构 (2024年5月更新)

### 包组织

```
langchainjs/
├── libs/
│   ├── langchain-core/        # 核心抽象与接口 (~35,000 行)
│   │   ├── src/
│   │   │   ├── runnables/     # LCEL 运行时 (16 个文件)
│   │   │   ├── language_models/ # LLM/Chat 抽象
│   │   │   ├── messages/      # 19 种消息类型
│   │   │   ├── prompts/       # 15+ 种提示模板
│   │   │   ├── output_parsers/# 输出解析器
│   │   │   ├── callbacks/     # 回调系统
│   │   │   ├── tracers/       # 追踪器
│   │   │   └── vectorstores.ts# 向量存储接口
│   │   └── tests/
│   │
│   ├── langchain/            # 高级 API (~8,000 行)
│   │   ├── src/
│   │   │   ├── chains/       # Chain 实现
│   │   │   ├── agents/       # Agent 实现
│   │   │   └── memory/       # 记忆实现
│   │   └── tests/
│   │
│   ├── langchain-classic/    # 兼容旧版 API (~5,000 行)
│   │
│   ├── langchain-textsplitters/ # 文本分割 (~3,000 行)
│   │
│   ├── langchain-mcp-adapters/  # MCP适配器 (~2,000 行，新增)
│   │
│   └── providers/            # 35+ 提供商集成 (~50,000+ 行)
│       ├── langchain-openai/
│       ├── langchain-anthropic/
│       ├── langchain-google-genai/
│       ├── langchain-cohere/
│       └── ...               # 30+ 其他提供商
│
├── create-langchain-integration/ # 集成创建工具
├── internal/                # 内部工具
├── examples/                # 示例代码
└── docs/                    # 官方文档
```

### 实际依赖关系

```
应用代码
    │
    ▼
┌─────────────────────────────────────────────┐
│  @langchain/core                            │
│  (所有包的基础依赖)                            │
└────────────┬────────────────────────────────┘
             │
      ┌──────┼──────┐
      ▼      ▼      ▼
┌──────────┐ ┌──────────┐ ┌──────────────────┐
│langchain │ │@langchain│ │  Providers       │
│          │ │/openai   │ │  - pinecone      │
│          │ ├──────────┤ │  - chroma        │
│          │ │@langchain│ │  - pgvector      │
│          │ │/anthropic│ │  - supabase      │
│          │ └──────────┘ │  - redis         │
│          │              │  - qdrant        │
│          │              │  - ...           │
└──────────┘              └──────────────────┘
```

## 🔄 执行模型

### Runnable 执行流

```
┌─────────────────────────────────────────────┐
│ 1. Input                                    │
└──────────────┬──────────────────────────────┘
               │ invoke()
               ▼
┌─────────────────────────────────────────────┐
│ 2. Pre-processing                          │
│    - Transform input                       │
│    - Validate schema                       │
│    - Serialize/deserialize                 │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ 3. Runnable Pipeline                       │
│    ┌─────────────────────────────────┐     │
│    │ RunnableSequence               │     │
│    │   ├─ Step 1: Transform         │     │
│    │   ├─ Step 2: LLM Call          │     │
│    │   └─ Step 3: Parse Output      │     │
│    └─────────────────────────────────┘     │
│    或                                      │
│    ┌─────────────────────────────────┐     │
│    │ RunnableParallel               │     │
│    │   ├─ Branch A (async)          │     │
│    │   └─ Branch B (async)          │     │
│    └─────────────────────────────────┘     │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ 4. BaseLanguageModel                       │
│    ├─ formatMessages()                     │
│    ├─ _generate()                          │
│    ├─ Token Usage Tracking                │
│    └─ _llmType()                           │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ 5. Post-processing                         │
│    - OutputParser.parse()                  │
│    - Transform to final output             │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ 6. Output                                  │
└─────────────────────────────────────────────┘
```

### 回调触发时机

```
invoke() 开始
    │
    ▼
onLLMStart() ──▶ 发送 LLM 启动事件
    │
    ├──────────────────────┐
    │                      │
    ▼                      ▼
LLM Processing         onRetrieverStart()
    │                      │
    │                      ▼
    │                  onRetrieverEnd()
    │
    ▼
onLLMEnd() ──▶ 发送 LLM 完成事件
    │
    ▼
invoke() 结束
```

## 📊 关键文件统计

| 模块 | 实际文件数 | 估计代码行数 | 主要功能 |
|------|------------|--------------|----------|
| runnables/ | 16 | ~15,000+ | LCEL 运行时 |
| language_models/ | 10 | ~5,000 | LLM/Chat 抽象 |
| messages/ | 19 | ~4,000 | 消息类型系统 |
| prompts/ | 15+ | ~3,500 | 提示模板 |
| output_parsers/ | 12+ | ~2,000 | 输出解析 |
| callbacks/ | 8+ | ~2,000 | 回调管理 |
| vectorstores.ts | 1 | ~3,500 | 向量存储接口 |
| **Core 总计** | ~60+ | **~35,000** | 核心抽象 |
| langchain/ | ~50+ | ~8,000 | 高级 API |
| providers/ | 35+包 | ~50,000+ | 第三方集成 |

## 🔑 核心类关系图

```
┌─────────────────────────────────────────────────────────────┐
│  Serializable (基类)                                        │
│  ├─ lc_namespace                                            │
│  ├─ toDict()                                                │
│  └─ fromDict()                                              │
└────┬────────────────────────────────────────────────────────┘
     │ 继承
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Runnable (核心接口)                                        │
│  ├─ invoke(), stream(), batch()                            │
│  ├─ pipe(), bind(), withConfig()                           │
│  └─ config: RunnableConfig                                 │
└────┬────────────────────────────────────────────────────────┘
     │ 继承/实现
     ├─────────────────┬─────────────────┬─────────────────┐
     ▼                 ▼                 ▼                 ▼
┌─────────┐    ┌──────────────┐  ┌──────────────┐  ┌────────────┐
│Prompt   │    │BaseLanguage  │  │BaseOutput   │  │ BaseTool   │
│Template │    │Model         │  │Parser       │  │            │
└────┬────┘    └──────┬───────┘  └──────┬───────┘  └─────┬──────┘
     │               │                  │                │
     │          ┌────┴────┐             │                │
     │          │         │             │                │
     ▼          ▼         ▼             ▼                ▼
 ChatPrompt  BaseLLM  BaseChat    JsonOutput     FunctionTool
 Template           Model      Parser         StructuredTool
```

## 💡 设计优势

| 优势 | 实际验证结果 |
|------|--------------|
| **统一接口** | ✅ 所有组件实现 Runnable，可互换组合 |
| **类型安全** | ✅ 完整 TypeScript 类型推导 |
| **流式优先** | ✅ 原生支持 AsyncGenerator 流式响应 |
| **可组合** | ✅ 像 Unix 管道一样组合组件 |
| **回调系统** | ✅ 统一的生命周期事件追踪 |
| **模块化** | ✅ 40+独立包，按需安装 |
