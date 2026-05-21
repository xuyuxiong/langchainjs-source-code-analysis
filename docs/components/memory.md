# 记忆系统 (Memory)

> 对话历史管理与状态保持

## 📋 概述

记忆系统负责管理和维护对话历史，使 LLM 能够记住之前的交互内容，实现连贯的多轮对话。

**源码位置**: `libs/langchain/src/memory/`

**文件数**: 15+ 个

## 🏗️ 类层次结构

```
Serializable
    │
    └── BaseMemory (抽象基类)
            │
            ├── BaseChatMemory (基于聊天历史)
            │       │
            │       ├── BufferMemory (完整历史)
            │       ├── BufferWindowMemory (滑动窗口)
            │       ├── ConversationSummaryMemory (摘要)
            │       ├── ConversationSummaryBufferMemory (摘要 + 窗口)
            │       ├── VectorStoreRetrieverMemory (向量检索)
            │       └── MotorheadMemory (外部服务)
            │
            └── ReadOnlySharedMemory (只读共享)
```

## 🔑 BaseMemory 核心接口

**源文件**: `libs/langchain/src/memory/base.ts`

```typescript
abstract class BaseMemory extends Serializable {
  
  /**
   * 返回的键名 (默认: 'history')
   */
  returnMessages = false;
  
  // ========== 抽象方法 ==========
  
  /**
   * 获取内存变量
   */
  abstract get inputKeys(): string[];
  
  abstract get outputKeys(): string[];
  
  // ========== 核心方法 ==========
  
  /**
   * 加载记忆历史
   * @returns 历史消息字符串或消息列表
   */
  abstract loadMemoryVariables(
    values: InputValues
  ): Promise<MemoryVariables>;
  
  /**
   * 保存新的交互到记忆
   */
  abstract saveContext(
    inputValues: InputValues,
    outputValues: OutputValues
  ): Promise<void>;
  
  /**
   * 清除记忆
   */
  abstract clear(): Promise<void>;
  
  // ========== 工具方法 ==========
  
  /**
   * 获取历史消息
   */
  async getChatHistory(): Promise<BaseMessage[]> {
    const result = await this.loadMemoryVariables({});
    return result.history;
  }
  
  /**
   * 对话摘要
   */
  async getBufferString(): Promise<string> {
    const history = await this.getChatHistory();
    return getBufferString(history);
  }
}
```

## 📊 记忆类型详解

### 1. BufferMemory

**源文件**: `libs/langchain/src/memory/buffer_memory.ts`

最简单的完整历史记忆，保存所有对话。

```typescript
class BufferMemory extends BaseChatMemory {
  /**
   * 历史消息列表
   */
  protected chatHistory: BaseMessage[] = [];
  
  /**
   * 人类消息前缀
   */
  humanPrefix = 'Human';
  
  /**
   * AI 消息前缀
   */
  aiPrefix = 'AI';
  
  /**
   * 消息分隔符
   */
  memoryKey = 'history';
  
  async loadMemoryVariables(
    values: InputValues
  ): Promise<MemoryVariables> {
    if (this.returnMessages) {
      return {
        [this.memoryKey]: this.chatHistory
      };
    }
    
    // 转换为字符串格式
    return {
      [this.memoryKey]: getBufferString(
        this.chatHistory,
        this.humanPrefix,
        this.aiPrefix
      )
    };
  }
  
  async saveContext(
    inputValues: InputValues,
    outputValues: OutputValues
  ): Promise<void> {
    const input = getPromptInputKey(inputValues, this.inputKeys);
    const output = getOutputKey(outputValues, this.outputKeys);
    
    // 添加人类消息
    this.chatHistory.push(
      new HumanMessage({ content: input })
    );
    
    // 添加 AI 回复
    this.chatHistory.push(
      new AIMessage({ content: output })
    );
  }
  
  async clear(): Promise<void> {
    this.chatHistory = [];
  }
}
```

### 2. BufferWindowMemory

**源文件**: `libs/langchain/src/memory/buffer_window_memory.ts`

滑动窗口记忆，只保留最近 K 轮对话。

```typescript
interface BufferWindowMemoryInput {
  k?: number;            // 保留的对话轮数
}

class BufferWindowMemory extends BufferMemory {
  /**
   * 窗口大小 (对话轮数)
   */
  k = 5;
  
  async loadMemoryVariables(
    values: InputValues
  ): Promise<MemoryVariables> {
    if (this.returnMessages) {
      // 只返回最近 K 轮
      const start = Math.max(0, this.chatHistory.length - this.k * 2);
      return {
        [this.memoryKey]: this.chatHistory.slice(start)
      };
    }
    
    // 字符串格式
    const start = Math.max(0, this.chatHistory.length - this.k * 2);
    const buffer = getBufferString(
      this.chatHistory.slice(start),
      this.humanPrefix,
      this.aiPrefix
    );
    
    return { [this.memoryKey]: buffer };
  }
}
```

### 3. ConversationSummaryMemory

**源文件**: `libs/langchain/src/memory/summary.ts`

使用 LLM 对历史对话生成摘要，节省 Token。

```typescript
class ConversationSummaryMemory extends BaseChatMemory {
  /**
   * 用于生成摘要的 LLM
   */
  llm: BaseLanguageModel;
  
  /**
   * 当前摘要
   */
  buffer?: string = '';
  
  /**
   * 提示模板
   */
  prompt = SUMMARY_PROMPT;
  
  constructor(fields: { llm: BaseLanguageModel; prompt?: PromptTemplate }) {
    super(fields);
    this.llm = fields.llm;
    this.prompt = fields.prompt ?? SUMMARY_PROMPT;
  }
  
  async saveContext(
    inputValues: InputValues,
    outputValues: OutputValues
  ): Promise<void> {
    // 添加到历史
    await super.saveContext(inputValues, outputValues);
    
    // 更新摘要
    this.buffer = await this.predictNewSummary(
      this.chatHistory.slice(-2),  // 最新一轮
      this.buffer
    );
  }
  
  protected async predictNewSummary(
    messages: BaseMessage[],
    existingSummary: string
  ): Promise<string> {
    const newLines = getBufferString(messages);
    
    const chain = this.prompt | this.llm;
    const response = await chain.invoke({
      summary: existingSummary,
      new_lines: newLines
    });
    
    return response.content as string;
  }
  
  async loadMemoryVariables(): Promise<MemoryVariables> {
    return { [this.memoryKey]: this.buffer ?? '' };
  }
}
```

**摘要提示词**:
```typescript
const SUMMARY_PROMPT = PromptTemplate.fromTemplate(
  `Distill the above chat messages into a single summary message. 
Include as many specific details as you can.

Progressively summarize the lines of conversation provided, 
adding onto the previous summary returning a new summary.

EXAMPLE
Current summary:
{summary}

New lines of conversation:
{new_lines}

New summary:`
);
```

### 4. ConversationSummaryBufferMemory

结合摘要和窗口，保留最近对话的完整历史 + 早期对话的摘要。

```typescript
class ConversationSummaryBufferMemory extends BufferMemory {
  /**
   * 最大 Token 数限制
   */
  maxTokenLimit = 2000;
  
  /**
   * 当前摘要
   */
  movingSummaryBuffer = '';
  
  async loadMemoryVariables(): Promise<MemoryVariables> {
    // 获取所有消息
    let messages = this.chatHistory;
    
    // 如果超出 Token 限制
    const currBufferLength = await this.countTokens(messages);
    
    if (currBufferLength > this.maxTokenLimit && this.movingSummaryBuffer) {
      // 使用摘要替代早期历史
      const summaryIndex = this.findIndexWithinTokenLimit(
        messages,
        this.maxTokenLimit
      );
      
      if (summaryIndex > 0) {
        // 保留最近的历史 + 摘要
        messages = [
          new HumanMessage({ content: this.movingSummaryBuffer }),
          ...messages.slice(summaryIndex)
        ];
      }
    }
    
    return { [this.memoryKey]: getBufferString(messages) };
  }
  
  async saveContext(...): Promise<void> {
    await super.saveContext(inputValues, outputValues);
    
    // 检查是否需要更新摘要
    if (await this.countTokens(this.chatHistory) > this.maxTokenLimit) {
      this.movingSummaryBuffer = await this.predictNewSummary();
    }
  }
}
```

### 5. VectorStoreRetrieverMemory

**源文件**: `libs/langchain/src/memory/vector_store.ts`

使用向量检索从历史中查找相关记忆。

```typescript
class VectorStoreRetrieverMemory extends BaseMemory {
  /**
   * 向量检索器
   */
  retriever: BaseRetriever;
  
  /**
   * 返回文档数
   */
  k = 10;
  
  /**
   * 输入键 (用于检索的查询)
   */
  inputKey?: string;
  
  async loadMemoryVariables(
    values: InputValues
  ): Promise<MemoryVariables> {
    // 获取查询输入
    const key = this.inputKey ?? Object.keys(values)[0];
    const query = values[key];
    
    // 向量检索相关记忆
    const docs = await this.retriever.invoke(query);
    
    return {
      [this.memoryKey]: docs
        .map(d => d.pageContent)
        .join('\n')
    };
  }
  
  async saveContext(
    inputValues: InputValues,
    outputValues: OutputValues
  ): Promise<void> {
    // 将新对话添加到向量存储
    const text = this.formatMemory(inputValues, outputValues);
    await this.retriever.vectorStore.addDocuments([
      new Document({
        pageContent: text,
        metadata: { 
          timestamp: Date.now(),
          ...inputValues,
          ...outputValues
        }
      })
    ]);
  }
}
```

## 📝 使用示例

### 示例 1: 基础 BufferMemory

```typescript
import { BufferMemory } from 'langchain/memory';
import { ChatOpenAI } from '@langchain/openai';

const memory = new BufferMemory({
  memoryKey: 'history',
  humanPrefix: 'User',
  aiPrefix: 'Assistant'
});

// 添加对话
await memory.saveContext(
  { input: 'Hello, my name is John' },
  { output: 'Hi John! Nice to meet you.' }
);

await memory.saveContext(
  { input: 'What is my name?' },
  { output: 'Your name is John.' }
);

// 加载历史
const history = await memory.loadMemoryVariables({});
console.log(history.history);
// "User: Hello, my name is John\nAssistant: Hi John! Nice to meet you.\n..."
```

### 示例 2: 与 Chain 集成

```typescript
import { ConversationChain } from 'langchain/chains';
import { ChatOpenAI } from '@langchain/openai';
import { BufferMemory } from 'langchain/memory';

const model = new ChatOpenAI({ modelName: 'gpt-4' });

const memory = new BufferMemory({
  memoryKey: 'chat_history',
  returnMessages: true  // 返回消息对象而非字符串
});

const chain = new ConversationChain({
  llm: model,
  memory
});

// 多轮对话
let response = await chain.invoke({
  input: 'My name is Alice'
});
console.log(response.response);  // "Hi Alice!..."

response = await chain.invoke({
  input: 'What is my name?'
});
console.log(response.response);  // "Your name is Alice."
```

### 示例 3: 滑动窗口记忆

```typescript
import { BufferWindowMemory } from 'langchain/memory';

const memory = new BufferWindowMemory({
  k: 5,            // 保留最近 5 轮对话
  memoryKey: 'history'
});

// 超出 5 轮后，最早的对话会被丢弃
for (let i = 0; i < 10; i++) {
  await memory.saveContext(
    { input: `Question ${i}` },
    { output: `Answer ${i}` }
  );
}

const history = await memory.loadMemoryVariables({});
// 只包含最近 5 轮对话
```

### 示例 4: 对话摘要记忆

```typescript
import { ConversationSummaryMemory } from 'langchain/memory';
import { ChatOpenAI } from '@langchain/openai';

const memory = new ConversationSummaryMemory({
  llm: new ChatOpenAI({ modelName: 'gpt-3.5-turbo' }),
  memoryKey: 'summary'
});

// 长对话后生成摘要
await memory.saveContext(
  { input: '长对话内容...' },
  { output: 'AI 回复...' }
);

const result = await memory.loadMemoryVariables({});
console.log(result.summary);
// "用户询问了关于 X 的问题，AI 解释了 Y..."
```

### 示例 5: 向量检索记忆

```typescript
import { VectorStoreRetrieverMemory } from 'langchain/memory';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';

const embeddings = new OpenAIEmbeddings();
const vectorStore = new MemoryVectorStore(embeddings);
const retriever = vectorStore.asRetriever({ k: 3 });

const memory = new VectorStoreRetrieverMemory({
  retriever,
  memoryKey: 'relevant_memories'
});

// 保存对话
await memory.saveContext(
  { input: 'Paris is the capital of France' },
  { output: 'Correct!' }
);

// 检索相关记忆
const result = await memory.loadMemoryVariables({
  input: 'What is the capital of France?'
});
console.log(result.relevant_memories);
// 会检索到 "Paris is the capital of France"
```

### 示例 6: 自定义记忆

```typescript
import { BaseMemory, Document } from '@langchain/core';

class CustomMemory extends BaseMemory {
  private store: Map<string, any> = new Map();
  
  get inputKeys(): string[] {
    return ['input'];
  }
  
  get outputKeys(): string[] {
    return ['output'];
  }
  
  async loadMemoryVariables(): Promise<Record<string, any>> {
    // 从自定义存储加载
    return { history: Array.from(this.store.values()) };
  }
  
  async saveContext(inputValues, outputValues): Promise<void> {
    const key = `${Date.now()}`;
    this.store.set(key, {
      input: inputValues.input,
      output: outputValues.output,
      timestamp: Date.now()
    });
  }
  
  async clear(): Promise<void> {
    this.store.clear();
  }
}
```

## 🔍 记忆选择指南

| 记忆类型 | 适用场景 | Token 消耗 | 实现复杂度 |
|---------|---------|-----------|----------|
| **BufferMemory** | 短对话 (< 10 轮) | 高 | 简单 |
| **BufferWindowMemory** | 中等长度对话 | 中 | 简单 |
| **ConversationSummaryMemory** | 长对话历史 | 低 | 中等 |
| **ConversationSummaryBufferMemory** | 超长对话 | 低 | 中等 |
| **VectorStoreRetrieverMemory** | RAG 场景 | 中 | 中等 |

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 选择合适的记忆类型
const memory = new BufferWindowMemory({ k: 5 }); // ✅ 控制长度

// 2. 长对话使用摘要
const memory = new ConversationSummaryMemory({ llm }); // ✅

// 3. 添加清除机制
if (messages.length > 100) {
  await memory.clear();  // ✅
}

// 4. 使用有意义的键名
const memory = new BufferMemory({
  memoryKey: 'chat_history'  // ✅
});
```

### ❌ 不推荐

```typescript
// 1. 避免无限增长的历史
const memory = new BufferMemory();  // ❌ 长期运行会耗尽 Token

// 2. 避免不使用记忆
// 多轮对话应该使用记忆保持上下文

// 3. 避免重复保存
// 每次 saveContext 都会增加历史
```

---

**源码参考**: `libs/langchain/src/memory/` (15+ 个文件)