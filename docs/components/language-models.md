# 语言模型抽象

> BaseLanguageModel 与 BaseChatModel 架构深度解析

## 📋 概述

语言模型是 LangChainJS 的核心组件，提供了与 LLM 交互的统一接口。

**源码位置**: `libs/langchain-core/src/language_models/`

**文件数**: 约 10 个主要文件

## 🏗️ 类层次结构

```
Serializable
    │
    └── Runnable (继承所有 Runnable 方法)
            │
            └── BaseLanguageModel<MessageLike, MessageChunkLike, CallOptions>
                    │
                    ├── BaseLLM (传统完成 API)
                    │       └── 提供商实现
                    │
                    └── BaseChatModel (聊天对话 API - 主要使用)
                            │
                            └── 提供商实现：ChatOpenAI, ChatAnthropic...
```

## 🔑 BaseLanguageModel 核心接口

**源文件**: `libs/langchain-core/src/language_models/base.ts`

> ⚠️ **注意**: `BaseLanguageModel` 是抽象基类，大部分方法由子类 `BaseChatModel` 实现。

```typescript
abstract class BaseLanguageModel<
  MessageLike = unknown,
  MessageChunkLike = unknown,
  CallOptions extends BaseLanguageModelCallOptions = BaseLanguageModelCallOptions
> extends Runnable<MessageLike[], MessageChunkLike, CallOptions> {
  
  // ========== 从 Runnable 继承的方法 ==========\n  /***
   * Runnable 接口方法（继承自 Runnable 基类）
   * - invoke(), batch(), stream() - 调用入口
   * - pipe() - 管道组合，返回 Runnable<RunInput, Exclude<NewRunOutput, Error>>
   * - bind() - 参数绑定
   * - withConfig() - 配置包装
   * - withRetry() - 重试包装，返回 RunnableRetry
   * - withFallbacks() - Fallback 包装
   */
  
  // ========== 抽象方法 (由 BaseChatModel 实现) ==========\n  /**
   * 核心生成方法
   * @returns ChatGeneration 或 ChatGenerationChunk
   */
  abstract _generate(\n    messages: BaseMessage[],\n    options: this['ParsedCallOptions'],\n    runManager?: CallbackManagerForLLMRun\n  ): Promise<ChatGeneration | ChatGenerationChunk>;
  
  /**
   * 流式生成
   */
  abstract *_streamResponseChunks(\n    messages: BaseMessage[],\n    options: this['ParsedCallOptions'],\n    runManager?: CallbackManagerForLLMRun\n  ): AsyncGenerator<ChatGenerationChunk>;
  
  // ========== 类型定义 ==========\n  /**
   * 解析后的调用选项类型
   */
  ParsedCallOptions: any;
  
  /**
   * 输入消息转换
   */
  protected _convertInputToMessages(input: MessageLike): BaseMessage[];
}
```

## 🔑 BaseChatModel 实现

**源文件**: `libs/langchain-core/src/language_models/chat_models.ts`

`BaseChatModel` 继承 `BaseLanguageModel` 并实现具体方法。

```typescript
abstract class BaseChatModel extends BaseLanguageModel {
  
  // ========== 抽象方法 (提供商必须实现) ==========\n  /**
   * 核心生成方法
   */
  abstract _generate(\n    messages: BaseMessage[],\n    options: this['ParsedCallOptions'],\n    runManager?: CallbackManagerForLLMRun\n  ): Promise<ChatGeneration | ChatGenerationChunk>;
  
  /**
   * 流式生成\n   */\n  abstract *_streamResponseChunks(\n    messages: BaseMessage[],\n    options: this['ParsedCallOptions'],\n    runManager?: CallbackManagerForLLMRun\n  ): AsyncGenerator<ChatGenerationChunk>;
  
  // ========== 实现的方法 ==========\n  /**
   * 单次调用
   */\n  async invoke(\n    input: BaseMessageLike[],\n    options?: Partial<CallOptions>\n  ): Promise<BaseMessage> {\n    const messages = coerceMessageLikeToMessages(input);\n    const result = await this._generate(messages, options ?? {});\n    return result.message;\n  }
  
  /**
   * 流式响应\n   */\n  async *stream(\n    input: BaseMessageLike[],\n    options?: Partial<CallOptions>\n  ): AsyncGenerator<BaseMessageChunk> {\n    const messages = coerceMessageLikeToMessages(input);\n    const fullGenerator = this._streamResponseChunks(messages, options);\n    \n    for await (const chunk of fullGenerator) {\n      yield chunk.message;\n    }\n  }\n}
```

## 📝 使用示例

### 示例 1: 基础调用

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  modelName: 'gpt-4',
  temperature: 0.7
});

// 使用 invoke（从 Runnable 继承）
const response = await model.invoke([\n  new SystemMessage('你是一个有帮助的助手'),\n  new HumanMessage('你好！')\n]);\n\nconsole.log(response.content);
```

### 示例 2: 流式响应

```typescript
// 使用 stream 方法
const stream = await model.stream([\n  new HumanMessage('写一首短诗')\n]);\n\nfor await (const chunk of stream) {\n  process.stdout.write(chunk.content as string);\n}
```

### 示例 3: 管道组合

```typescript
import { ChatPromptTemplate } from '@langchain/core/prompts';

const prompt = ChatPromptTemplate.fromMessages([\n  ['system', '你是一个{name}专家'],\n  ['human', '{question}']\n]);\n\n// pipe() 返回 Runnable<RunInput, Exclude<NewRunOutput, Error>>\nconst chain = prompt.pipe(model);\n\nconst result = await chain.invoke({\n  name: '量子物理',\n  question: '什么是量子纠缠？'\n});
```

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 使用 BaseChatModel 的子类（如 ChatOpenAI）\nconst model = new ChatOpenAI({ modelName: 'gpt-4' }); // ✅

// 2. 利用 Runnable 接口的方法\nconst chain = prompt.pipe(model).withRetry({ stopAfterAttempt: 3 }); // ✅

// 3. 流式处理长响应\nfor await (const chunk of await model.stream(messages)) { // ✅\n  process.stdout.write(chunk.content);\n}
```

---

**源码参考**: `libs/langchain-core/src/language_models/`