# 语言模型抽象

> BaseLanguageModel 与 BaseChatModel 架构深度解析

## 📋 概述

语言模型是 LangChainJS 的核心组件，提供了与 LLM 交互的统一接口。

**源码位置**: `libs/langchain-core/src/language_models/`

## 🏗️ 类层次结构

```
Serializable
    │
    └── Runnable
            │
            └── BaseLanguageModel<MessageLike, MessageChunkLike, CallOptions>
                    │
                    ├── BaseLLM (传统完成 API)
                    │       │
                    │       └── 提供商实现：OpenAI, Cohere, AI21...
                    │
                    └── BaseChatModel (聊天对话 API)
                            │
                            └── 提供商实现：ChatOpenAI, ChatAnthropic...
```

## 🔑 BaseLanguageModel 核心接口

**源文件**: `libs/langchain-core/src/language_models/base.ts`

```typescript
abstract class BaseLanguageModel<
  MessageLike = unknown,
  MessageChunkLike = unknown,
  CallOptions extends BaseLanguageModelCallOptions = BaseLanguageModelCallOptions
> extends Runnable<MessageLike[], MessageChunkLike, CallOptions> {
  
  // ========== 抽象方法 (子类必须实现) ==========
  
  /**
   * 核心生成方法
   */
  abstract _generate(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatGenerationChunk | ChatGeneration>;
  
  /**
   * 流式生成
   */
  abstract _streamResponseChunks(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk>;
  
  // ========== 公共方法 ==========
  
  /**
   * 单次调用
   */
  async invoke(
    input: MessageLike,
    options?: Partial<CallOptions>
  ): Promise<MessageChunkLike> {
    const messages = this._convertInputToMessages(input);
    const result = await this.generate([messages], options);
    return result.generations[0][0].message;
  }
  
  /**
   * 批量调用
   */
  async batch(
    inputs: MessageLike[],
    options?: Partial<CallOptions>
  ): Promise<MessageChunkLike[]> {
    const messagesList = inputs.map(input => 
      this._convertInputToMessages(input)
    );
    return this._batchGenerateAll(messagesList, options);
  }
  
  /**
   * 流式响应
   */
  async *stream(
    input: MessageLike,
    options?: Partial<CallOptions>
  ): AsyncGenerator<MessageChunkLike> {
    const messages = this._convertInputToMessages(input);
    const fullGenerator = this._streamResponseChunks(messages, options);
    
    for await (const chunk of fullGenerator) {
      yield chunk.message;
    }
  }
  
  // ========== 工具方法 ==========
  
  /**
   * 绑定调用参数
   */
  bind(options: Partial<CallOptions>): this {
    return this.withConfig({ configurable: options });
  }
  
  /**
   * 工具调用支持
   */
  withStructuredOutput<Output>(
    schema: z.ZodType<Output> | Record<string, any>,
    config?: { includeRaw?: boolean }
  ): LanguageModelLike<Output> {
    // 添加工具调用格式支持
  }
  
  // ========== 静态方法 ==========
  
  /**
   * 获取支持的模型列表
   */
  supportedModels?(): string[];
}
```

## 📊 BaseLLM vs BaseChatModel

| 特性 | BaseLLM | BaseChatModel |
|------|---------|---------------|
| **API 类型** | 文本完成 (Completion) | 对话 (Chat) |
| **输入** | `string` (纯文本) | `BaseMessage[]` (消息列表) |
| **输出** | `string` | `BaseMessage` (AIMessage) |
| **适用模型** | GPT-3, Cohere, AI21 | GPT-4, Claude, Gemini |
| **消息角色** | ❌ 不支持 | ✅ 支持 (System/Human/AI) |
| **工具调用** | ❌ 不支持 | ✅ 支持 |
| **流式处理** | ✅ 支持 | ✅ 支持 |

### BaseLLM 实现示例

**源文件**: `libs/langchain/src/llms/openai.ts`

```typescript
class OpenAI extends BaseLLM {
  modelName = 'text-davinci-003';
  temperature = 0.7;
  maxTokens = 256;
  
  async _call(
    prompts: string[],
    options: this['ParsedCallOptions']
  ): Promise<string> {
    // 调用 OpenAI Completion API
    const response = await this.completionWithRetry({
      model: this.modelName,
      prompt: prompts[0],
      temperature: this.temperature,
      max_tokens: this.maxTokens
    });
    
    return response.choices[0].text;
  }
}
```

### BaseChatModel 实现示例

**源文件**: `libs/langchain/src/chat_models/openai.ts`

```typescript
class ChatOpenAI extends BaseChatModel {
  modelName = 'gpt-4';
  temperature = 0.7;
  
  protected _llmType(): string {
    return 'openai';
  }
  
  async _generate(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatGenerationChunk | ChatGeneration> {
    // 转换为 OpenAI 格式
    const formattedMessages = this._convertMessagesToOpenAI(messages);
    
    // 调用 Chat Completions API
    const response = await this.completionWithRetry({
      model: this.modelName,
      messages: formattedMessages,
      temperature: this.temperature,
      ...options
    });
    
    // 构建 AIMessage
    const message = new AIMessage({
      content: response.choices[0].message.content,
      additional_kwargs: response.choices[0].message.function_call,
      tool_calls: response.choices[0].message.tool_calls,
      usage_metadata: response.usage
    });
    
    return { message };
  }
  
  async *_streamResponseChunks(...): AsyncGenerator<ChatGenerationChunk> {
    // 流式处理
    const stream = await this.completionWithRetry({
      stream: true,
      // ...
    });
    
    for await (const chunk of stream) {
      yield new ChatGenerationChunk({
        message: new AIMessageChunk({
          content: chunk.choices[0]?.delta?.content ?? ''
        })
      });
    }
  }
}
```

## 🔄 消息转换流程

```
用户输入
    │
    ▼
┌─────────────────────────────────────────┐
│ ChatPromptTemplate.format()             │
│   Input: { topic: 'cats' }              │
│   ↓                                     │
│   Output: BaseMessage[]                │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ HumanMessage                            │
│   content: "Tell me a joke about cats"  │
│   role: "user"                          │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ ChatOpenAI._generate()                  │
│   1. 转换为 OpenAI API 格式              │
│   2. 调用 API                           │
│   3. 解析响应                           │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ AIMessage                               │
│   content: "Why did the cat..."         │
│   role: "assistant"                     │
│   tool_calls?: [...]                    │
│   usage_metadata?: {...}                │
└────────────────┬────────────────────────┘
                 │
                 ▼
              输出
```

## 🔧 关键组件

### 1. ChatGeneration

```typescript
interface ChatGeneration {
  message: BaseMessage;          // AI 回复
  text?: string;                  // 纯文本 (兼容旧 API)
  generationInfo?: Record<string, any>; // 元数据
}

interface ChatGenerationChunk extends ChatGeneration {
  message: BaseMessageChunk;     // 可流式分块
}
```

### 2. Usage Metadata

```typescript
interface UsageMetadata {
  input_tokens: number;   // 输入 Token 数
  output_tokens: number;  // 输出 Token 数
  total_tokens: number;   // 总 Token 数
}

// AIMessage 中的用法
const message = new AIMessage({
  content: 'Hello!',
  usage_metadata: {
    input_tokens: 10,
    output_tokens: 20,
    total_tokens: 30
  }
});
```

### 3. 工具调用 (Tool Calling)

```typescript
// AIMessage 中的工具调用
interface AIMessage extends BaseMessage {
  content: string | ArrayContent;
  tool_calls?: ToolCall[];
  invalid_tool_calls?: InvalidToolCall[];
}

interface ToolCall {
  name: string;
  args: Record<string, any>;
  id?: string;
  type: 'tool_call';
}

interface InvalidToolCall {
  name?: string;
  args?: string;
  id?: string;
  error?: string;
  type: 'invalid_tool_call';
}
```

## 📝 使用示例

### 示例 1: 基础调用

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  modelName: 'gpt-4',
  temperature: 0.7
});

// 单次调用
const message = new HumanMessage('Hello!');
const response = await model.invoke([message]);
console.log(response.content);

// 流式调用
const stream = await model.stream([message]);
for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}

// 批量调用
const responses = await model.batch([
  [new HumanMessage('Hello 1')],
  [new HumanMessage('Hello 2')]
]);
```

### 示例 2: 结构化输出

```typescript
import { z } from 'zod';

const model = new ChatOpenAI({ modelName: 'gpt-4' });

// 定义结构化输出 Schema
const JokeSchema = z.object({
  setup: z.string().describe('The setup of the joke'),
  punchline: z.string().describe('The punchline of the joke'),
  rating: z.number().optional().describe('Rating 1-10')
});

// 添加结构化输出
const structuredModel = model.withStructuredOutput(JokeSchema);

// 调用
const result = await structuredModel.invoke(
  'Tell me a joke about cats'
);
// { setup: '...', punchline: '...', rating: 8 }
```

### 示例 3: 工具调用

```typescript
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// 定义工具
const searchTool = new DynamicStructuredTool({
  name: 'web_search',
  description: 'Search the web for current information',
  schema: z.object({
    query: z.string().describe('Search query')
  }),
  func: async ({ query }) => {
    // 执行搜索
    return searchResult;
  }
});

// 绑定工具到模型
const model = new ChatOpenAI({ modelName: 'gpt-4' });
const modelWithTools = model.bind({
  tools: [searchTool],
  tool_choice: 'auto'
});

// 调用时可能返回工具调用
const response = await modelWithTools.invoke([
  new HumanMessage('What is the weather in Tokyo?')
]);

// 检查是否有工具调用
if (response.tool_calls?.length > 0) {
  const toolCall = response.tool_calls[0];
  // 执行工具调用
}
```

## ⚙️ 配置选项

### BaseLanguageModelCallOptions

```typescript
interface BaseLanguageModelCallOptions {
  // 回调处理
  callbacks?: Callbacks;
  
  // 标签和元数据
  tags?: string[];
  metadata?: Record<string, any>;
  runName?: string;
  
  // 流式控制
  stream?: boolean;
  
  // 超时配置
  timeout?: number;
  
  // 并发控制
  maxConcurrency?: number;
  
  // 重试配置
  maxRetries?: number;
}
```

### 提供商特定选项 (OpenAI 示例)

```typescript
interface ChatOpenAI ('gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  
  // 工具调用
  tools?: OpenAITool[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  
  // 视觉支持
  maxRetries?: number;
}
```

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 使用 ChatModel 而非传统 LLM
const model = new ChatOpenAI({ modelName: 'gpt-4' }); // ✅

// 2. 使用 withConfig 添加元数据
const modelWithMetadata = model.withConfig({
  tags: ['important'],
  metadata: { userId: '123' }
});

// 3. 添加错误处理
try {
  const result = await model.invoke(messages);
} catch (error) {
  if (error instanceof TokenExceededError) {
    // 处理 Token 超限
  }
}

// 4. 使用流式减少首字节延迟
const stream = await model.stream(messages);
for await (const chunk of stream) {
  // 实时处理
}
```

### ❌ 不推荐

```typescript
// 1. 避免硬编码 API Key
const model = new ChatOpenAI({ apiKey: 'sk-...' }); // ❌

// 应该使用环境变量
const model = new ChatOpenAI(); // ✅ 自动读取 OPENAI_API_KEY

// 2. 避免忽略错误
try {
  await model.invoke(messages);
} catch {} // ❌ 空错误处理

// 3. 避免过长的会话历史
const longHistory = [...]; // 数百条消息
await model.invoke(longHistory); // ❌ 成本高昂
```

---

**源码参考**:
- `libs/langchain-core/src/language_models/base.ts`
- `libs/langchain-core/src/language_models/chat_models.ts`
- `libs/langchain-core/src/language_models/llms.ts`