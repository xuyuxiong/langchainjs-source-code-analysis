# LangChain Core 深度解析

> 核心抽象层与基础接口定义

## 📋 概述

`@langchain/core` 是 LangChainJS 的核心库，提供所有基础抽象和接口定义。所有提供商集成和高级功能都构建在这些核心抽象之上。

**npm 包**: `@langchain/core@0.2.x`

**源码位置**: `libs/langchain-core/src/`


## 🏗️ 核心模块

基于2024年5月源码分析：

```
@langchain/core/
├── src/
│   ├── runnables/           # LCEL 运行时
│   │   ├── base.ts          # Runnable 接口定义 
│   │   ├── sequence.ts      # RunnableSequence
│   │   ├── parallel.ts      # RunnableParallel
│   │   ├── map.ts           # RunnableMap
│   │   ├── lambda.ts        # RunnableLambda
│   │   ├── branch.ts        # RunnableBranch
│   │   ├── config.ts        # 配置管理
│   │   ├── graph.ts         # 图结构支持
│   │   └── ...              # 其他运行时组件
│   │
│   ├── language_models/     # 语言模型抽象
│   │   ├── base.ts          # BaseLanguageModel
│   │   ├── chat_models.ts   # BaseChatModel
│   │   ├── llms.ts          # BaseLLM
│   │   └── types.ts         # 类型定义
│   │
│   ├── messages/            # 消息系统
│   │   ├── base.ts          # BaseMessage
│   │   ├── human.ts         # HumanMessage
│   │   ├── ai.ts            # AIMessage
│   │   ├── system.ts        # SystemMessage
│   │   ├── tool.ts          # ToolMessage
│   │   ├── chat.ts          # 聊天相关
│   │   └── ...              # 其他消息类型
│   │
│   ├── prompts/             # 提示系统
│   │   ├── prompt.ts        # PromptTemplate
│   │   ├── chat.ts          # ChatPromptTemplate
│   │   ├── few_shot.ts      # FewShotPromptTemplate
│   │   └── ...              # 其他提示模板
│   │
│   ├── embeddings/          # 嵌入模型
│   │   └── base.ts          # Embeddings 接口
│   │
│   ├── vectorstores/        # 向量存储
│   │   └── base.ts          # VectorStore 接口 (~3,500行)
│   │
│   ├── retrievers/          # 检索器
│   │   └── base.ts          # BaseRetriever 接口
│   │
│   ├── tools/               # 工具系统
│   │   └── base.ts          # Tool / StructuredTool
│   │
│   ├── callbacks/           # 回调系统 (8+个文件)
│   │   ├── base.ts          # 回调处理器基类
│   │   ├── manager.ts       # CallbackManager
│   │   └── ...              # 各种回调实现
│   │
│   ├── tracers/             # 追踪系统
│   │   ├── base.ts          # 基础追踪器
│   │   └── langsmith.ts     # LangSmith追踪
│   │
│   ├── caches/              # 缓存系统
│   │   └── base.ts          # BaseCache
│   │
│   ├── stores/              # KV存储
│   │   └── base.ts          # BaseStore
│   │
│   ├── outputs.ts           # 输出定义
│   ├── chat_history.ts      # 聊天历史
│   ├── singletons/          # 单例管理
│   └── types/               # 类型定义
```

## 🔑 核心抽象

### 1. Runnable 接口

```typescript
// 来自 libs/langchain-core/src/runnables/base.ts
export abstract class Runnable<
  RunInput = any,
  CallOptions extends RunnableConfigFields = any,
  RunOutput = any
> extends Serializable {
  /**
   * 单次调用
   */
  abstract invoke(
    input: RunInput,
    options?: Partial<CallOptions>
  ): Promise<RunOutput>;

  /**
   * 批量调用
   */
  async batch(
    inputs: RunInput[],
    options?: Partial<CallOptions> | Partial<CallOptions>[],
    batchOptions?: RunnableBatchOptions
  ): Promise<RunOutput[]> {
    // 实际实现包含并发控制
  }

  /**
   * 流式调用
   */
  async *stream(
    input: RunInput,
    options?: Partial<CallOptions>
  ): AsyncGenerator<RunOutput> {
    // 默认实现委托给invoke
  }

  /**
   * 管道组合
   */
  pipe<NewRunOutput>(
    coerceable: RunnableLike<RunOutput, NewRunOutput>
  ): RunnableSequence<RunInput, NewRunOutput> {
    // 创建新的序列
  }

  /**
   * 绑定配置
   */
  withConfig(
    config: Partial<RunnableConfig>
  ): Runnable<RunInput, CallOptions, RunOutput> {
    // 返回新的Runnable实例
  }
}
```

### 2. BaseChatModel

```typescript
// 来自 libs/langchain-core/src/language_models/chat_models.ts
export abstract class BaseChatModel<
  CallOptions extends BaseLanguageModelCallOptions = BaseLanguageModelCallOptions
> extends BaseLanguageModel<BaseMessage[], CallOptions, BaseMessage> {
  /**
   * 生成响应
   */
  protected abstract _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult>;

  /**
   * 流式生成
   */
  protected abstract *_streamResponseChunks(
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
    return result.generations[0].message;
  }
}
```

### 3. BaseMessage

```typescript
// 来自 libs/langchain-core/src/messages/base.ts
export abstract class BaseMessage extends Serializable {
  /**
   * 消息内容
   */
  content: MessageContent;

  /**
   * 消息名称（可选）
   */
  name?: string;

  /**
   * 消息ID
   */
  id?: string;

  /**
   * 附加参数
   */
  additional_kwargs: Record<string, unknown>;

  /**
   * 响应元数据
   */
  response_metadata: Record<string, unknown>;

  /**
   * 获取消息类型
   */
  abstract _getType(): MessageType;

  /**
   * 克隆消息
   */
  cloneWithFields(fields: Partial<BaseMessageFields>): this {
    // 实现消息克隆
  }
}

// 具体消息类型
export class HumanMessage extends BaseMessage {
  static lc_name() {
    return "HumanMessage";
  }

  _getType(): MessageType {
    return "human";
  }
}

export class AIMessage extends BaseMessage {
  static lc_name() {
    return "AIMessage";
  }

  _getType(): MessageType {
    return "ai";
  }

  /**
   * 工具调用
   */
  tool_calls?: ToolCall[];

  /**
   * 使用统计
   */
  usage_metadata?: UsageMetadata;
}
```

### 4. PromptTemplate

```typescript
// 来自 libs/langchain-core/src/prompts/prompt.ts
export class PromptTemplate<
  RunInput extends InputValues = any,
  PartialVariableName extends string = string
> extends BaseStringPromptTemplate<RunInput, PartialVariableName> {
  /**
   * 模板字符串
   */
  template: string;

  /**
   * 输入变量
   */
  inputVariables: Extract<keyof RunInput, string>[];

  /**
   * 模板格式
   */
  templateFormat: TemplateFormat = "f-string";

  /**
   * 验证模板
   */
  validateTemplate = true;

  /**
   * 格式化提示词
   */
  async format(values: RunInput): Promise<string> {
    const allValues = await this.mergePartialAndUserVariables(values);
    return interpolateFString(this.template, allValues);
  }

  /**
   * 创建部分模板
   */
  partial<NewPartial extends Partial<RunInput>>(
    values: NewPartial
  ): PromptTemplate<Omit<RunInput, keyof NewPartial>, PartialVariableName> {
    // 返回新的部分模板实例
  }
}
```

## 📦 实际包依赖关系

```
@langchain/core (核心库)
    │
    ├── 内部依赖：无（最底层）
    │
    └── 外部依赖：
        ├── zod@^3.22.4 (类型验证)
        ├── uuid@^10.0.0 (UUID生成)
        ├── js-tiktoken@^1.0.12 (token计算)
        └── @langchain/langgraph-checkpoint@~0.0.15 (检查点)

所有提供商包 (@langchain/openai, @langchain/anthropic等)
    │
    └── 依赖于 @langchain/core@workspace:*

langchain (高级API)
    │
    ├── 依赖于 @langchain/core@workspace:*
    └── 依赖于各提供商包
```

## 🔧 实际使用示例

### 示例1: 基础聊天模型

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 1000
});

const messages = [
  new SystemMessage('你是一个量子物理学专家'),
  new HumanMessage('解释量子纠缠现象')
];

const response = await model.invoke(messages);
console.log(response.content);
```

### 示例2: LCEL链式调用

```typescript
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';

const prompt = ChatPromptTemplate.fromMessages([
  ['system', '你是一个{field}专家'],
  ['human', '{question}']
]);

const model = new ChatOpenAI({ model: 'gpt-4' });
const parser = new StringOutputParser();

const chain = RunnableSequence.from([
  prompt,
  model,
  parser
]);

const result = await chain.invoke({
  field: '人工智能',
  question: '什么是深度学习？'
});
```

### 示例3: 自定义回调处理器

```typescript
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { ChatOpenAI } from '@langchain/openai';

class LoggingCallbackHandler extends BaseCallbackHandler {
  name = 'LoggingCallbackHandler';
  
  async handleLLMStart(llm: any, prompts: string[]) {
    console.log(`开始调用LLM: ${llm.id.join('.')}`);
    console.log(`提示词数量: ${prompts.length}`);
  }
  
  async handleLLMEnd(output: any) {
    console.log('LLM调用完成');
    console.log(`使用的token: ${output.llmOutput?.tokenUsage?.totalTokens}`);
  }
  
  async handleLLMError(error: Error) {
    console.error('LLM调用失败:', error.message);
  }
}

const model = new ChatOpenAI({
  model: 'gpt-4',
  callbacks: [new LoggingCallbackHandler()]
});
```

## 📊 实际类型层次

```typescript
// 实际的类继承关系
Serializable (所有类的基类)
  ├── Runnable (可执行组件)
  │   ├── BaseLanguageModel
  │   │   ├── BaseLLM
  │   │   └── BaseChatModel
  │   ├── BasePromptTemplate
  │   │   ├── PromptTemplate
  │   │   └── ChatPromptTemplate
  │   ├── BaseRetriever
  │   ├── BaseDocumentLoader
  │   ├── TextSplitter
  │   └── BaseTool
  │
  ├── BaseMessage (消息系统)
  │   ├── HumanMessage
  │   ├── AIMessage (包含tool_calls, usage_metadata)
  │   ├── SystemMessage
  │   ├── ToolMessage
  │   └── FunctionMessage
  │
  └── BaseCallbackHandler (回调系统)
      ├── ConsoleCallbackHandler
      ├── LangChainTracer
      └── Custom handlers
```

## 💡 设计原则

### ✅ 核心原则

1. **接口统一**: 所有组件实现Runnable接口
2. **组合优于继承**: 使用RunnableSequence等组合模式
3. **异步优先**: 所有IO操作都是异步的
4. **类型安全**: 完整的TypeScript类型定义
5. **可扩展**: 提供商只需实现少量抽象方法

### 🎯 性能优化

- **懒加载**: 大型依赖按需加载
- **缓存**: 支持多种缓存策略
- **并发**: 批量操作支持并发控制
- **流式**: 原生支持流式处理

---