# RunnableParallel - 并行执行

> 同时执行多个 Runnable 分支，合并结果

## 📋 概述

RunnableParallel 允许同时执行多个 Runnable，并将结果合并为一个对象。

**源文件**: `libs/langchain-core/src/runnables/base.ts`

```typescript
// 对象语法
const chain = {
  joke: jokeChain,
  explanation: explanationChain
};
// 等同于 new RunnableParallel({ joke: jokeChain, explanation: explanationChain })

// 执行时同时运行两个分支
const result = await chain.invoke({ topic: 'cats' });
// { joke: '...', explanation: '...' }
```

## 🎯 核心特性

### 1. 并行执行

```
Input ──┬─────────▶ [Branch A] ──▶ Result A ──┐
        │                                     │
        ├─────────▶ [Branch B] ──▶ Result B ──┼──▶ Merge
        │                                     │
        └─────────▶ [Branch C] ──▶ Result C ──┘
```

### 2. Promise.all 内部实现

```typescript
const results = await Promise.all([
  branchA.invoke(input),
  branchB.invoke(input),
  branchC.invoke(input)
]);
```

### 3. 结果合并

```typescript
// 输入: { input: 'cats' }
// 输出: { 
//   joke: 'Why did the cat...', 
//   explanation: 'This joke uses...' 
// }
```

## 🔧 实现详解

### 类定义

```typescript
export class RunnableParallel<
  RunInput = unknown,
  RunOutput extends Record<string, any> = Record<string, any>
> extends Runnable<RunInput, RunnableConfig, RunOutput> {
  
  protected steps: Record<string, Runnable<RunInput, any, any>>;
  
  constructor(fields: Record<string, RunnableLike<RunInput, any>>) {
    super(fields);
    
    // 将所有分支转换为 Runnable
    this.steps = Object.fromEntries(
      Object.entries(fields).map(([key, runnableLike]) => [
        key,
        coerceToRunnable(runnableLike)
      ])
    );
  }
}
```

### invoke() 实现

```typescript
async invoke(
  input: RunInput,
  options?: Partial<RunnableConfig>
): Promise<RunOutput> {
  // 1. 准备所有分支的调用
  const promises = Object.entries(this.steps).map(
    async ([key, runnable]) => {
      const result = await runnable.invoke(input, options);
      return [key, result];
    }
  );
  
  // 2. 并行执行所有分支
  const results = await Promise.all(promises);
  
  // 3. 合并结果为对象
  return Object.fromEntries(results) as RunOutput;
}
```

### stream() 实现

```typescript
async *stream(
  input: RunInput,
  options?: Partial<RunnableConfig>
): AsyncGenerator<Record<string, any>> {
  // 并行分支的流式处理更复杂
  // 需要等待所有分支产生下一个 chunk
  
  const streams = new Map<string, AsyncGenerator>();
  const running = new Set<string>();
  
  // 1. 启动所有分支的流
  for (const [key, runnable] of Object.entries(this.steps)) {
    const stream = await runnable.stream(input, options);
    streams.set(key, stream);
    running.add(key);
  }
  
  // 2. 轮流从每个分支获取 chunk
  while (running.size > 0) {
    const promises = Array.from(running).map(async (key) => {
      const stream = streams.get(key);
      const { value, done } = await stream.next();
      
      if (done) {
        running.delete(key);
        return null;
      }
      
      return { key, value };
    });
    
    const results = await Promise.all(promises);
    
    // 3. 合并当前批次的所有 chunk
    const batch: Record<string, any> = {};
    for (const result of results.filter(Boolean)) {
      batch[result.key] = result.value;
    }
    
    if (Object.keys(batch).length > 0) {
      yield batch;
    }
  }
}
```

## 📊 执行流程

### 并行执行示意图

```
Input: { topic: 'cats' }
    │
    │ invoke()
    ▼
┌─────────────────────────────────────────────┐
│  RunnableParallel                            │
│  {                                          │
│    joke: jokeChain,                         │
│    explanation: explanationChain            │
│  }                                          │
└───────────┬─────────────────────────────────┘
            │
    ┌───────┼───────┐
    │       │       │
    ▼       ▼       ▼
┌────────┐ │ ┌────────────┐
│jokeChain│ │ │explanation │
│         │ │ │Chain       │
│         │ │ │            │
│ invoke  │ │ │ invoke     │
│         │ │ │            │
└───┬─────┘ │ └─────┬──────┘
    │       │       │
    │       │       │
    ▼       │       ▼
  resultA   │     resultB
    │       │       │
    └───────┴───────┘
            │
            ▼
    merge({ joke: resultA, explanation: resultB })
            │
            ▼
Output: { joke: '...', explanation: '...' }
```

## 📝 使用示例

### 示例 1: 基础并行

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

const model = new ChatOpenAI({ modelName: 'gpt-4' });

// 创建两个并行的链
const jokeChain = ChatPromptTemplate.fromTemplate(
  'Tell me a joke about {topic}'
) | model | new StringOutputParser();

const explanationChain = ChatPromptTemplate.fromTemplate(
  'Explain the humor in: {joke}'
) | model | new StringOutputParser();

// 并行执行
const combined = {
  joke: jokeChain,
  explanation: explanationChain
};

// 注意：jokeChain 和 explanationChain 都接收相同的输入 { topic: 'cats' }
// 但 explanationChain 需要的是 joke，不是 topic
// 所以更好的方式是使用 RunnableSequence + RunnableParallel
```

### 示例 2: 正确的并行模式

```typescript
// 先获取 joke，然后用 joke 获取 explanation
const chain = RunnableSequence.from([
  // Step 1: 获取 joke
  {
    topic: (input: { topic: string }) => input.topic,
    joke: jokeChain
  },
  // Step 2: 用 joke 获取 explanation
  {
    joke: (input: { joke: string }) => input.joke,
    explanation: explanationChain
  }
]);

const result = await chain.invoke({ topic: 'cats' });
// { joke: '...', explanation: '...' }
```

### 示例 3: 多路并行

```typescript
// 同时从多个角度分析同一个主题
const analysis = {
  summary: summaryChain,
  keyPoints: keyPointsChain,
  sentiment: sentimentChain,
  entities: entityChain,
  categories: categoryChain
};

const result = await analysis.invoke({ text: longDocument });
// {
//   summary: '...',
//   keyPoints: ['...', '...'],
//   sentiment: 'positive',
//   entities: [...],
//   categories: [...]
// }
```

### 示例 4: 并行 + 序列组合

```typescript
// 复杂的工作流：并行获取多个视图，然后合并
const workflow = RunnableSequence.from([
  // Step 1: 并行获取多个维度
  RunnableParallel({
    overview: overviewChain,
    details: detailsChain,
    examples: examplesChain
  }),
  
  // Step 2: 合并并格式化
  RunnableLambda.from(
    (result: { overview: string; details: string; examples: string }) =>
      `## Overview\n${result.overview}\n\n## Details\n${result.details}\n\n## Examples\n${result.examples}`
  )
]);
```

### 示例 5: 字段选择

```typescript
// 从输入中选择特定字段传递给不同分支
const chain = {
  // 只传递 input.topic 给 jokeChain
  joke: (input: { topic: string; style?: string }) => input.topic | jokeChain,
  
  // 传递完整 input 给 metadataChain
  metadata: metadataChain
};
```

## ⚙️ 高级用法

### 1. 混合 RunnableLike

```typescript
// 可以混合使用 Runnable 和函数
const chain = {
  // Runnable
  result: someChain,
  
  // 函数
  inputCopy: (x: any) => x,
  
  // 常量
  timestamp: () => Date.now()
};
```

### 2. 嵌套 Parallel

```typescript
// 嵌套并行
const nestedParallel = {
  group1: {
    a: chainA,
    b: chainB
  },
  group2: {
    c: chainC,
    d: chainD
  }
};

// 内部会被展平为 RunnableParallel
```

### 3. 与 Sequence 组合

```typescript
// 序列中的并行
const chain = RunnableSequence.from([
  preprocessor,
  
  // 并行执行多个分析
  {
    summary: summaryChain,
    sentiment: sentimentChain,
    keywords: keywordChain
  },
  
  // 后处理
  formatter
]);
```

## 🔍 调试技巧

### 1. 添加日志

```typescript
import { RunnableLambda } from '@langchain/core/runnables';

const debugParallel = {
  branch1: RunnableSequence.from([
    RunnableLambda.from((input) => {
      console.log('Branch 1 input:', input);
      return input;
    }),
    branch1Chain
  ]),
  
  branch2: RunnableSequence.from([
    RunnableLambda.from((input) => {
      console.log('Branch 2 input:', input);
      return input;
    }),
    branch2Chain
  ])
};
```

### 2. 追踪执行时间

```typescript
const timedParallel = RunnableParallel({
  slow: slowChain,
  fast: fastChain
});

const start = Date.now();
const result = await timedParallel.invoke(input);
const end = Date.now();

console.log(`Parallel execution took: ${end - start}ms`);
// 总时间 ≈ max(slowChain 时间，fastChain 时间)
```

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 用于独立的、可并行化的任务
const independentTasks = {
  result1: task1,
  result2: task2,
  result3: task3
};

// 2. 配合 Sequence 使用
const workflow = preprocessor | independentTasks | postprocessor;

// 3. 使用有意义的键名
const analysis = {
  summary: summaryChain,
  keyPoints: keyPointsChain,
  sentiment: sentimentChain
};
```

### ❌ 不推荐

```typescript
// 1. 避免分支之间有依赖关系
// 如果 branch2 需要 branch1 的结果，应该用 Sequence 而不是 Parallel

// 2. 避免过多分支
// const tooMany = { a, b, c, d, e, f, g, h, i, j }; // 难以维护

// 3. 避免分支返回不相关的结果
// 所有分支应该返回相关的、可合并的结果
```

## 📊 性能对比

| 模式 | 执行时间 | 内存占用 | 适用场景 |
|------|---------|---------|---------|
| 顺序执行 | T1 + T2 + T3 | 低 | 有依赖关系 |
| 并行执行 | max(T1, T2, T3) | 中 | 独立任务 |
| 批量并行 | (T1+T2+T3)/batchSize | 高 | 大量相似任务 |

---

**源码参考**: `/Users/xilin/Documents/sources/langchainjs/libs/langchain-core/src/runnables/base.ts`