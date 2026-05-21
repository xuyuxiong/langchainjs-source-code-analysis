# RunnableSequence - 顺序链执行

> LCEL 最核心的组合方式，像 Unix 管道一样串联多个 Runnable

## 📋 概述

RunnableSequence 是 LCEL 中最常用的组合方式，它将多个 Runnable 按顺序连接，前一个的输出作为后一个的输入。

**源文件**: `libs/langchain-core/src/runnables/base.ts`

```typescript
const chain = prompt | model | outputParser;

// 等同于
const chain = new RunnableSequence({
  first: prompt,
  middle: [model],
  last: outputParser
});
```

## 🎯 核心特性

### 1. 流式数据传递

```
Input ──▶ [Runnable A] ──▶ [Runnable B] ──▶ [Runnable C] ──▶ Output
           │                  │                  │
           │ outputA          │ outputB          │
           ▼                  ▼                  ▼
```

### 2. 自动错误处理

如果链中任何步骤抛出错误，整个链会立即停止并抛出异常。

```typescript
try {
  const result = await chain.invoke(input);
} catch (error) {
  // 链中任何错误都会被捕获
  console.error(error.message);
}
```

### 3. 回调传递

所有子 Runnable 共享同一个 CallbackManager。

```typescript
const chain = A | B | C;

// A、B、C 的回调都会使用相同的 runManager
await chain.invoke(input, { callbacks: [myHandler] });
```

## 🔧 实现详解

### 类定义

```typescript
export class RunnableSequence<
  RunInput = unknown,
  RunOutput = unknown
> extends Runnable<RunInput, RunnableConfig, RunOutput> {
  
  lc_namespace = ['langchain', 'schema', 'runnable'];
  
  first: Runnable<RunInput>;
  middle: Runnable[];
  last: Runnable<RunOutput>;
  
  constructor(fields: {
    first: Runnable<RunInput>;
    middle?: Runnable[];
    last: Runnable<RunOutput>;
    steps?: Runnable[];  // 等同于 [first, ...middle, last]
  }) {
    super(fields);
    
    // 从步骤数组构建
    if (fields.steps) {
      const steps = fields.steps;
      this.first = steps[0];
      this.middle = steps.slice(1, -1);
      this.last = steps[steps.length - 1];
    } else {
      this.first = fields.first;
      this.middle = fields.middle ?? [];
      this.last = fields.last;
    }
  }
}
```

### invoke() 实现

```typescript
async invoke(
  input: RunInput,
  options?: Partial<RunnableConfig>
): Promise<RunOutput> {
  // 1. 执行第一个 Runnable
  let runningOutput: unknown = await this.first.invoke(
    input,
    options
  );
  
  // 2. 依次执行中间的 Runnable
  for (const runnable of this.middle) {
    runningOutput = await runnable.invoke(
      runningOutput,
      options
    );
  }
  
  // 3. 执行最后一个 Runnable
  const finalOutput = await this.last.invoke(
    runningOutput,
    options
  );
  
  return finalOutput;
}
```

### stream() 实现

```typescript
async *stream(
  input: RunInput,
  options?: Partial<RunnableConfig>
): AsyncGenerator<RunOutput> {
  // 1. 流式执行第一个 Runnable
  let stream: AsyncGenerator<unknown> | undefined;
  
  try {
    stream = await this.first.stream(input, options);
  } catch (e) {
    throw e;
  }
  
  // 2. 依次流式执行中间的 Runnable
  for (const runnable of this.middle) {
    const nextStream = runnable.stream(stream as AsyncGenerator<unknown>, options);
    stream = nextStream;
  }
  
  // 3. 流式执行最后一个 Runnable，并返回结果
  const lastStream = this.last.stream(stream as AsyncGenerator<unknown>, options);
  
  for await (const chunk of lastStream) {
    yield chunk;
  }
}
```

## 📊 执行流程

### 单次调用 (invoke)

```
Input: { topic: 'cats' }
    │
    ▼ invoke()
┌─────────────────────────────────────────┐
│ RunnableSequence                        │
│                                         │
│  ┌─────────────────────┐               │
│  │ 1. first.invoke()   │               │
│  │    input → A.invoke  │               │
│  │    → outputA        │               │
│  └─────────┬───────────┘               │
│            │                            │
│  ┌─────────▼───────────┐               │
│  │ 2. middle[0].invoke()│              │
│  │    outputA → B.invoke│              │
│  │    → outputB        │               │
│  └─────────┬───────────┘               │
│            │                            │
│  ┌─────────▼───────────┐               │
│  │ 3. last.invoke()    │               │
│  │    outputB → C.invoke│              │
│  │    → finalOutput    │               │
│  └─────────────────────┘               │
└─────────────────────────────────────────┘
    │
    ▼
Output: finalOutput
```

### 流式执行 (stream)

```
Input: { topic: 'cats' }
    │
    ▼ stream()
┌─────────────────────────────────────────┐
│ RunnableSequence                        │
│                                         │
│  ┌─────────────────────┐               │
│  │ 1. first.stream()  │               │
│  │    yield chunkA1    │               │
│  │    yield chunkA2    │               │
│  │    ...              │               │
│  └─────────┬───────────┘               │
│            │                            │
│  ┌─────────▼───────────┐               │
│  │ 2. middle streams  │               │
│  │    (pass through)   │               │
│  │    chunkA1→chunkB1  │               │
│  │    chunkA2→chunkB2  │               │
│  └─────────┬───────────┘               │
│            │                            │
│  ┌─────────▼───────────┐               │
│  │ 3. last.stream()   │               │
│  │    yield final1     │               │
│  │    yield final2     │               │
│  │    ...              │               │
│  └─────────────────────┘               │
└─────────────────────────────────────────┘
    │
    ├─▶ yield final1
    ├─▶ yield final2
    └─▶ ...
```

## 🔗 组合方式

### 1. 管道运算符

```typescript
// 使用 | 管道运算符
const chain = A | B | C | D;

// 编译器转换为:
// new RunnableSequence({
//   first: A,
//   middle: [B, C],
//   last: D
// })
```

### 2. step() 方法

```typescript
// 链式调用
const chain = A
  .pipe(B)
  .pipe(C)
  .pipe(D);
```

### 3. 数组语法糖

```typescript
// 数组也会被自动转换为 RunnableSequence
const chain = new RunnableSequence([A, B, C, D]);
```

## 📝 使用示例

### 示例 1: 基础 LLM 链

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

const prompt = ChatPromptTemplate.fromTemplate(
  'Tell me a joke about {topic}'
);

const model = new ChatOpenAI({ modelName: 'gpt-4' });

const parser = new StringOutputParser();

// 创建链
const chain = prompt | model | parser;

// 调用
const result = await chain.invoke({ topic: 'cats' });
console.log(result); // "Why did the cat...?"
```

### 示例 2: 多步处理

```typescript
import { RunnableLambda } from '@langchain/core/runnables';

// 添加自定义处理步骤
const trim = RunnableLambda.from((text: string) => text.trim());
const uppercase = RunnableLambda.from((text: string) => text.toUpperCase());

const chain = 
  prompt |     // 格式化提示
  model |      // 调用 LLM
  parser |     // 提取文本
  trim |       // 去除空白
  uppercase;   // 转大写

const result = await chain.invoke({ topic: 'dogs' });
```

### 示例 3: 并行 + 序列组合

```typescript
import { RunnableParallel } from '@langchain/core/runnables';

// 先并行获取两个结果，然后合并
const chain = RunnableParallel({
  joke: prompt | model | parser,
  explanation: explanationPrompt | model | parser
})
| RunnableLambda.from(
    (result: { joke: string; explanation: string }) => 
      `Joke: ${result.joke}\n\nExplanation: ${result.explanation}`
  );

const result = await chain.invoke({ topic: 'cats' });
```

### 示例 4: 带状态的处理

```typescript
const chain = RunnableSequence.from([
  // Step 1: 获取原始内容
  RunnableLambda.from(async (input) => {
    const content = await getContent(input.url);
    return { ...input, content };
  }),
  
  // Step 2: 分块
  RunnableLambda.from((input) => {
    const chunks = splitIntoChunks(input.content);
    return { ...input, chunks };
  }),
  
  // Step 3: 对每个 chunk 调用 LLM
  RunnableLambda.from(async (input) => {
    const summaries = await Promise.all(
      input.chunks.map(chunk => model.invoke(chunk))
    );
    return { ...input, summaries };
  }),
  
  // Step 4: 合并摘要
  RunnableLambda.from((input) => {
    const final = input.summaries.join('\n');
    return { ...input, summary: final };
  })
]);
```

## ⚙️ 配置与选项

### 序列化

```typescript
toJSON(): SerializedRunnableSequence {
  return {
    id: ['langchain', 'schema', 'runnable', 'RunnableSequence'],
    name: this.getName(),
    graph: this.toGraph() // 转换为图结构用于可视化
  };
}
```

### 图转换

```typescript
toGraph(): MermaidGraph {
  // 生成 Mermaid 图语法
  const nodes = [
    this.first,
    ...this.middle,
    this.last
  ].map(r => ({ id: r.getName(), type: 'runnable' }));
  
  // 生成边
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ from: nodes[i].id, to: nodes[i + 1].id });
  }
  
  return { nodes, edges };
}
```

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 使用管道语法
const chain = A | B | C;

// 2. 给链添加有意义的名称
const namedChain = chain.withConfig({
  runName: 'JokeGenerator'
});

// 3. 使用类型提示
const typedChain: Runnable<{ topic: string }, string> = 
  prompt | model | parser;
```

### ❌ 不推荐

```typescript
// 1. 避免过长的链 (难以调试)
// const chain = A | B | C | D | E | F | G | H; // ❌

// 2. 拆分成小链组合
const firstPart = A | B | C;
const secondPart = D | E;
const chain = firstPart | secondPart; // ✅
```

---

**源码参考**: `/Users/xilin/Documents/sources/langchainjs/libs/langchain-core/src/runnables/base.ts`