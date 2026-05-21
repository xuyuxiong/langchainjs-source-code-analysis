# LangChain Core

> 核心抽象层与基础接口定义

## 📋 概述

`@langchain/core` 是 LangChainJS 的核心库，提供所有基础抽象和接口定义。所有提供商集成和高级功能都构建在这些核心抽象之上。

**npm 包**: `@langchain/core`

**源码位置**: `libs/langchain-core/src/`

## 🏗️ 核心模块

```
@langchain/core
├── runnables/           # LCEL 运行时
│   ├── base.ts          # Runnable 接口定义
│   ├── sequence.ts      # RunnableSequence
│   ├── parallel.ts      # RunnableParallel
│   ├── map.ts           # RunnableMap
│   ├── lambda.ts        # RunnableLambda
│   └── branch.ts        # RunnableBranch
│
├── language_models/     # 语言模型
│   ├── base.ts          # BaseLLM / BaseChatModel
│   └── chat_models.ts   # ChatModel 实现
│
├── messages/            # 消息系统
│   ├── base.ts          # BaseMessage
│   └── human.ts         # HumanMessage
│   └── ai.ts            # AIMessage
│   └── system.ts        # SystemMessage
│
├── prompts/             # 提示系统
│   ├── prompt.ts        # PromptTemplate
│   └── chat.ts          # ChatPromptTemplate
│
├── embeddings/          # 嵌入模型
│   └── base.ts          # Embeddings 接口
│
├── vectorstores/        # 向量存储
│   └── base.ts          # VectorStore 接口
│
├── retrievers/          # 检索器
│   └── base.ts          # BaseRetriever 接口
│
├── tools/               # 工具
│   └── base.ts          # Tool / StructuredTool
│
├── agents/              # Agent
│   └── executor.ts      # AgentExecutor
│
├── memory/              # 记忆
│   └── base.ts          # BaseMemory 接口
│
├── document_loaders/    # 文档加载
│   └── base.ts          # BaseDocumentLoader
│
├── text_splitter/       # 文本分割
│   └── base.ts          # TextSplitter
│
├── callbacks/           # 回调系统
│   ├── manager.ts       # CallbackManager
│   └── base.ts          # CallbackHandler
│
├── tracers/             # 追踪
│   └── langsmith.ts     # LangSmith 追踪
│
├── caches/              # 缓存
│   └── base.ts          # BaseCache
│
├── stores/              # KV 存储
│   └── base.ts          # BaseStore
│
└── types/               # 类型定义
    └── index.ts         # 公共类型导出
```

## 🔑 核心抽象

### 1. Runnable 接口

所有 LangChain 组件的统一接口。

```typescript
// libs/langchain-core/src/runnables/types.ts
interface Runnable<RunInput = any, RunConfig = any, RunOutput = any> {
  /**
   * 单次调用
   */
  invoke(
    input: RunInput,
    config?: Partial<RunConfig> & { callbacks?: Callbacks }
  ): Promise<RunOutput>;
  
  /**
   * 批量调用
   */
  batch(
    inputs: RunInput[],
    config?: Partial<RunConfig> & { callbacks?: Callbacks },
    options?: { maxConcurrency?: number }
  ): Promise<RunOutput[]>;
  
  /**
   * 流式调用
   */
  stream(
    input: RunInput,
    config?: Partial<RunConfig> & { callbacks?: Callbacks }
  ): AsyncGenerator<RunOutput>;
  
  /**
   * 绑定配置
   */
  bind(
    kwargs: Partial<RunConfig>
  ): Runnable<RunInput, RunConfig, RunOutput>;
}
```

### 2. BaseChatModel

所有聊天模型的基类。

```typescript
// libs/langchain-core/src/language_models/chat_models.ts
abstract class BaseChatModel extends BaseLanguageModel {
  /**
   * 调用模型
   */
  abstract _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatGenerationChunk | ChatResult>;
  
  /**
   * 流式调用
   */
  abstract *_streamResponseChunks(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk>;
  
  /**
   * 公共调用方法
   */
  async invoke(
    input: BaseMessageLike[],
    options?: Partial<CallOptions>
  ): Promise<BaseMessage> {
    const messages = coerceMessageLikeToMessages(input);
    const result = await this._generate(messages, options ?? {});
    return result.message;
  }
}
```

### 3. BaseMessage

所有消息类型的基类。

```typescript
// libs/langchain-core/src/messages/base.ts
abstract class BaseMessage extends Serializable {
  /**
   * 消息内容
   */
  content: string | (|string|MessageContentComplex)[];
  
  /**
   * 附加名称（可选）
   */
  name?: string;
  
  /**
   * 额外数据
   */
  additional_kwargs?: Record<string, any>;
  
  /**
   * 响应元数据
   */
  response_metadata?: Record<string, any>;
  
  /**
   * 消息角色
   */
  abstract _getType(): MessageType;
  
  /**
   * 获取 LangChain 角色名
   */
  get_lc_role(): string {
    return this._getType();
  }
}

// 具体消息类型
class HumanMessage extends BaseMessage {
  _getType(): MessageType { return 'human'; }
}

class AIMessage extends BaseMessage {
  _getType(): MessageType { return 'ai'; }
}

class SystemMessage extends BaseMessage {
  _getType(): MessageType { return 'system'; }
}
```

### 4. PromptTemplate

提示词模板。

```typescript
// libs/langchain-core/src/prompts/prompt.ts
class PromptTemplate extends BaseStringPromptTemplate {
  /**
   * 模板字符串
   */
  template: string;
  
  /**
   * 输入变量
   */
  inputVariables: string[];
  
  /**
   * 模板格式（f-string 或 jinja2）
   */
  templateFormat: TemplateFormat = 'f-string';
  
  /**
   * 格式化提示词
   */
  async format(values: Record<string, any>): Promise<string> {
    const resolvedValues = await this.resolvePairs(values);
    return interpolate(this.template, resolvedValues, this.templateFormat);
  }
  
  /**
   * 创建部分模板
   */
  partial<V extends Partial<Record<string, string>>>(
    values: V
  ): PromptTemplatePartial<V> {
    // 返回新的 PromptTemplate，部分变量已绑定
  }
}
```

## 📦 包依赖关系

```
@langchain/core (核心库)
    │
    ├── 无内部依赖（最底层）
    │
    └── 外部依赖：
        ├── zod (类型验证)
        ├── ajv (JSON Schema)
        └── langsmith (追踪)

@langchain/openai, @langchain/anthropic, etc. (提供商)
    │
    └── 依赖于 @langchain/core

langchain (高级 API)
    │
    ├── 依赖于 @langchain/core
    └── 依赖于各提供商包
```

## 🔧 使用示例

### 示例 1: 基础聊天模型

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  modelName: 'gpt-4',
  temperature: 0.7
});

const messages = [
  new SystemMessage('你是一个有帮助的助手'),
  new HumanMessage('你好！')
];

const response = await model.invoke(messages);
console.log(response.content);
```

### 示例 2: LCEL 链式调用

```typescript
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';

const prompt = ChatPromptTemplate.fromMessages([
  ['system', '你是一个{name}专家'],
  ['human', '{question}']
]);

const model = new ChatOpenAI({ modelName: 'gpt-4' });

const chain = RunnableSequence.from([prompt, model]);

const result = await chain.invoke({
  name: '量子物理',
  question: '什么是量子纠缠？'
});
```

### 示例 3: 自定义 Callback

```typescript
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { ChatOpenAI } from '@langchain/openai';

class MyCallbackHandler extends BaseCallbackHandler {
  name = 'MyCallbackHandler';
  
  async handleLLMStart() {
    console.log('LLM 调用开始');
  }
  
  async handleLLMEnd(output) {
    console.log('LLM 调用结束:', output.generations);
  }
  
  async handleLLMError(error) {
    console.error('LLM 调用失败:', error);
  }
}

const model = new ChatOpenAI({
  modelName: 'gpt-4',
  callbacks: [new MyCallbackHandler()]
});
```

## 📊 类型层次

```typescript
// Serializable (所有类的基类)
//   │
//   ├── Runnable (可执行组件)
//   │     ├── BaseLanguageModel
//   │     │     ├── BaseLLM
//   │     │     └── BaseChatModel
//   │     ├── BasePromptTemplate
//   │     │     └── PromptTemplate
//   │     ├── BaseRetriever
//   │     ├── BaseDocumentLoader
//   │     ├── TextSplitter
//   │     └── ...
//   │
//   ├── BaseMessage (消息)
//   │     ├── HumanMessage
//   │     ├── AIMessage
//   │     └── SystemMessage
//   │
//   └── CallbackHandler (回调)
//         └── BaseTracer
```

## 💡 设计原则

### ✅ 核心原则

1. **接口统一**: 所有组件实现 Runnable 接口
2. **组合优于继承**: 使用 RunnableSequence 等组合模式
3. **异步优先**: 所有 IO 操作都是异步的
4. **类型安全**: 完整的 TypeScript 类型定义
5. **可扩展**: 提供商只需实现少量抽象方法

### 🏗️ 架构层次

```
┌─────────────────────────────────────────────┐
│           LangChain (高级 API)               │
│  Chains, Agents, Memory,高级组合             │
├─────────────────────────────────────────────┤
│      提供商集成 (@langchain/openai 等)        │
│  具体实现：ChatOpenAI, OpenAIEmbeddings 等     │
├─────────────────────────────────────────────┤
│         @langchain/core (核心抽象)           │
│  BaseChatModel, Runnable, BaseMessage 等      │
└─────────────────────────────────────────────┘
```

---

**源码参考**: `libs/langchain-core/src/`