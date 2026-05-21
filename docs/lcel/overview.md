# LCEL (LangChain Expression Language) 总览

> 声明式组合 LLM 应用的表达式语言

## 📋 什么是 LCEL？

LCEL (LangChain Expression Language) 是 LangChainJS 的核心编程接口，提供了一种声明式的方式来组合 LLM 应用程序的组件。

### 对比：传统 Chain API vs LCEL

**传统 Chain API (LangChain Classic)**:
```typescript
import { ChainType } from 'langchain/chains';

const chain = new LLMChain({
  prompt: new PromptTemplate({...}),
  llm: new ChatOpenAI({modelName: 'gpt-4'}),
  outputParser: new StringOutputParser()
});

const result = await chain.call({ input: 'Hello' });
```

**LCEL (新方式)**:
```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

const chain = ChatPromptTemplate.fromTemplate('Say {input}')
  | new ChatOpenAI({ modelName: 'gpt-4' })
  | new StringOutputParser();

const result = await chain.invoke({ input: 'Hello' });
```

**LCEL 优势**：
- ✅ 语法简洁，像 Unix 管道一样直观
- ✅ 类型安全，完整 TypeScript 支持
- ✅ 流式响应原生支持
- ✅ 任意 Runnable 组件可组合
- ✅ 更好的错误处理和调试

## 🎯 核心设计理念

### 1. 一切皆 Runnable

```
┌─────────────────────────────────────────────────────────────┐
│                    Runnable 接口                             │
├─────────────────────────────────────────────────────────────┤
│  interface Runnable<RunInput, CallOptions, RunOutput> {    │
│    // 核心执行方法                                          │
│    invoke(input: RunInput, options?: CallOptions):         │
│      Promise<RunOutput>;                                   │
│                                                            │
│    stream(input: RunInput, options?: CallOptions):         │
│      AsyncGenerator<RunOutput>;                            │
│                                                            │
│    batch(inputs: RunInput[], options?: CallOptions):       │
│      Promise<RunOutput[]>;                                 │
│                                                            │
│    // 组合方法                                              │
│    pipe<T>(other: Runnable<RunOutput, any, T>):            │
│      RunnableSequence<this, T>;                            │
│                                                            │
│    bind(boundArgs: Partial<CallOptions>): Runnable;        │
│    withConfig(config: RunnableConfig): Runnable;           │
│  }                                                         │
└─────────────────────────────────────────────────────────────┘
```

**所有组件都实现此接口**：
- Prompt Templates
- Language Models
- Output Parsers
- Retrievers
- Chains
- Agents
- Tools (通过 RunnableLambda)

### 2. 管道组合

```typescript
// 管道运算符 | 组合多个 Runnable
const chain = A | B | C;

// 等同于
const chain = new RunnableSequence({
  first: A,
  middle: [B],
  last: C
});
```

### 3. 流式优先

```typescript
// 所有 Runnable 都支持流式响应
for await (const chunk of chain.stream({ input: 'Hello' })) {
  console.log(chunk); // 逐块输出
}

// 等同于 HTTP Server-Side Events
const stream = await chain.stream({ input: 'Hello' });
return new Response(convertToHttpEventStream(stream));
```

## 📦 Runnable 类型体系

### 核心类型

```
Runnable (接口)
    │
    ├── RunnableSequence    (顺序执行)
    │       A | B | C
    │
    ├── RunnableParallel    (并行执行)
    │       { a: A, b: B }
    │
    ├── RunnableMap         (输入映射)
    │       { x: (input) => input.x }
    │
    ├── RunnableLambda      (自定义函数)
    │       RunnableLambda.from((x) => x * 2)
    │
    ├── RunnableBranch      (条件分支)
    │       RunnableBranch([condition, runnable], default)
    │
    ├── RunnablePassthrough (透传)
    │       直接传递输入
    │
    ├── RunnablePick        (字段选择)
    │       选择输入/输出的特定字段
    │
    └── RunnableRetry       (重试包装)
            带重试逻辑的包装器
```

### 类型推导

```typescript
// TypeScript 自动推导类型
const prompt = ChatPromptTemplate.fromTemplate<{ topic: string }>(
  'Tell me a joke about {topic}'
);
// prompt: Runnable<{ topic: string }, BaseMessagePromptTemplateLike>

const model = new ChatOpenAI({ modelName: 'gpt-4' });
// model: Runnable<BaseMessage[], AIMessageChunk>

const parser = new StringOutputParser();
// parser: Runnable<BaseMessage, string>

const chain = prompt | model | parser;
// chain: Runnable<{ topic: string }, string>
// 类型自动推导！
```

## 🔄 执行流程

### 单次调用 (invoke)

```
Input: { topic: 'cats' }
    │
    ▼  invoke()
┌───────────────────┐
│ 1. ChatPrompt     │
│    Template       │
│    format()       │
└────────┬──────────┘
         │
         ▼
Messages: [HumanMessage('Tell me a joke about cats')]
    │
    ▼  invoke()
┌───────────────────┐
│ 2. ChatOpenAI     │
│    _generate()    │
│    + API Call     │
└────────┬──────────┘
         │
         ▼
AIMessageChunk { content: 'Why did the cat...'}
    │
    ▼  invoke()
┌───────────────────┐
│ 3. StringOutput   │
│    Parser         │
│    parse()        │
└────────┬──────────┘
         │
         ▼
Output: 'Why did the cat...?'
```

### 流式响应 (stream)

```
Input: { topic: 'dogs' }
    │
    ▼  stream()
┌─────────────────────────────────────────────┐
│ AsyncGenerator<Chunk>                       │
│                                             │
│  yield 'Why'                                │
│  yield ' did'                               │
│  yield ' the'                               │
│  yield ' dog'                               │
│  yield '...'                                │
│                                             │
│  每个 chunk 实时推送                        │
└─────────────────────────────────────────────┘
```

## 🔧 组合模式

### 1. 顺序组合 (RunnableSequence)

```typescript
const chain = prompt | model | outputParser;

// 内部实现:
// new RunnableSequence({
//   first: prompt,
//   middle: [model],
//   last: outputParser
// })
```

### 2. 并行组合 (RunnableParallel)

```typescript
// 同时执行多个分支，结果合并
const chain = {
  joke: jokeChain,
  explanation: explanationChain,
  metadata: metadataExtractor
};
// 等价于:
// new RunnableParallel({
//   joke: jokeChain,
//   explanation: explanationChain,
//   metadata: metadataExtractor
// })

// 输出示例:
// {
//   joke: 'Why did the dog...',
//   explanation: 'This joke uses...',
//   metadata: { tokens: 50 }
// }
```

### 3. 条件分支 (RunnableBranch)

```typescript
const chain = RunnableBranch(
  [
    // 条件 1: 数学问题 → 数学专用 Chain
    (input) => input.type === 'math',
    mathChain
  ],
  [
    // 条件 2: 代码问题 → 代码专用 Chain
    (input) => input.type === 'code',
    codeChain
  ],
  // 默认：通用 Chain
  defaultChain
);

// 执行逻辑:
// if (condition1(input)) return runnable1.invoke(input)
// else if (condition2(input)) return runnable2.invoke(input)
// else return default.invoke(input)
```

### 4. 自定义函数 (RunnableLambda)

```typescript
// 将普通函数包装成 Runnable
const trimChain = RunnableLambda.from(
  async (input: string) => input.trim()
);

// 支持异步函数
const asyncChain = RunnableLambda.from(
  async (docs: Document[]) => {
    await saveToDatabase(docs);
    return docs;
  }
);

// 组合使用
const chain = retriever | asyncChain | prompt | model;
```

## ⚙️ 配置与绑定

### bind() - 参数绑定

```typescript
// 绑定模型参数
const modelWithOptions = model.bind({
  temperature: 0.7,
  maxTokens: 1000,
  stop: ['\n']
});

// 之后调用无需每次传递
const result = await modelWithOptions.invoke(messages);
// 自动使用绑定的参数
```

### withConfig() - 运行配置

```typescript
// 添加回调处理器
const chainWithCallbacks = chain.withConfig({
  callbacks: [new ConsoleCallbackHandler()],
  tags: ['important-chain'],
  metadata: { author: 'user123' },
  runName: 'MyCustomChain'
});

// 配置会传递给整个执行链路
```

### withRetry() - 重试包装

```typescript
import { RunnableWithFallbacks } from '@langchain/core/runnables';

const chainWithRetry = chain.withRetry({
  stopAfterAttempt: 3,
  onFailedAttempt: (error) => console.log(`Retry: ${error.message}`)
});
```

## 📊 性能考量

### 批处理优化

```typescript
// 低效：顺序调用
const results = await Promise.all(
  inputs.map(input => chain.invoke(input))
);

// 高效：使用 batch()
const results = await chain.batch(inputs);
// 内部使用 Promise.all 优化
```

### 流式处理

```typescript
// 对于大响应，使用流式减少内存占用
const stream = await chain.stream(input);
for await (const chunk of stream) {
  processChunk(chunk); // 逐块处理，无需等待完整响应
}
```

## 💡 最佳实践

### 1. 使用管道语法

```typescript
// ✅ 推荐：管道语法简洁直观
const chain = prompt | model | parser;

// ❌ 不推荐：嵌套构造函数
const chain = new RunnableSequence({
  first: prompt,
  last: new RunnableSequence({
    first: model,
    last: parser
  })
});
```

### 2. 合理命名链

```typescript
// 使用 withConfig 命名，便于调试
const namedChain = chain.withConfig({
  runName: 'JokeGenerator'
});
```

### 3. 利用类型推导

```typescript
// TypeScript 会自动推导类型
const chain = prompt | model | parser;
// chain 类型自动推导为 Runnable<InputType, OutputType>
```

### 4. 错误处理

```typescript
try {
  const result = await chain.invoke(input);
} catch (error) {
  if (error instanceof OutputParserException) {
    // 处理解析错误
  } else if (error instanceof ToolInputParsingException) {
    // 处理工具调用错误
  } else {
    // 其他错误
  }
}
```

---

**源码参考**: `/Users/xilin/Documents/sources/langchainjs/libs/langchain-core/src/runnables/`