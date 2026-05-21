# RunnableMap

> 输入/输出字段映射与转换

## 📋 概述

RunnableMap 用于对输入或输出的特定字段进行操作，支持字段选择、转换和重组。

**源码位置**: `libs/langchain-core/src/runnables/base.ts`

## 🎯 核心价值

```typescript
// 选择输入的特定字段
const selectFields = RunnableMap.from({
  topic: (input) => input.topic,
  style: (input) => input.style || 'default'
});

// 转换输出字段
const formatOutput = RunnableMap.from({
  text: (result) => result.content,
  metadata: (result) => ({
    timestamp: Date.now(),
    tokens: result.usage?.total_tokens
  })
});
```

## 🔧 实现详解

### 类定义

```typescript
class RunnableMap<
  RunInput,
  RunOutput extends Record<string, any>
> extends Runnable<RunInput, RunnableConfig, RunOutput> {
  
  /**
   * 字段映射定义
   */
  protected steps: Record<
    keyof RunOutput,
    Runnable<RunInput, any, any>
  >;
  
  constructor(fields: {
    steps: Record<
      string,
      RunnableLike<RunInput, any>
    >;
    name?: string;
  }) {
    super(fields);
    this.steps = Object.fromEntries(
      Object.entries(fields.steps).map(([key, runnableLike]) => [
        key,
        coerceToRunnable(runnableLike)
      ])
    );
  }
  
  // ========== 静态方法 ==========
  
  /**
   * 从对象创建 RunnableMap
   */
  static from<RunInput, RunOutput extends Record<string, any>>(
    steps: {
      [K in keyof RunOutput]: RunnableLike<RunInput, RunOutput[K]>;
    },
    options?: { name?: string }
  ): RunnableMap<RunInput, RunOutput> {
    return new RunnableMap({ steps, ...options });
  }
  
  // ========== 核心方法 ==========
  
  async invoke(
    input: RunInput,
    options?: Partial<RunnableConfig>
  ): Promise<RunOutput> {
    // 并行执行所有字段映射
    const entries = await Promise.all(
      Object.entries(this.steps).map(async ([key, runnable]) => {
        const value = await runnable.invoke(input, options);
        return [key, value];
      })
    );
    
    return Object.fromEntries(entries) as RunOutput;
  }
  
  async *stream(
    input: RunInput,
    options?: Partial<RunnableConfig>
  ): AsyncGenerator<RunOutput> {
    // 流式处理
    const generators = new Map<
      string,
      AsyncGenerator<any>
    >();
    
    // 启动所有字段的流
    for (const [key, runnable] of Object.entries(this.steps)) {
      const generator = await runnable.stream(input, options);
      generators.set(key, generator);
    }
    
    // 轮流获取每个字段的 chunk
    while (generators.size > 0) {
      const chunks = await Promise.all(
        Array.from(generators.entries()).map(
          async ([key, generator]) => {
            const { value, done } = await generator.next();
            if (done) {
              generators.delete(key);
            }
            return [key, value];
          }
        )
      );
      
      yield Object.fromEntries(chunks.filter(Boolean));
    }
  }
}
```

### RunnablePick 辅助类

```typescript
class RunnablePick<
  RunInput extends Record<string, any>,
  Key extends keyof RunInput
> extends Runnable<RunInput, any, RunInput[Key] | RunInput[Key][]> {
  
  /**
   * 要选择的键
   */
  protected keys: Key[];
  
  constructor(keys: Key[] | Key) {
    super({});
    this.keys = Array.isArray(keys) ? keys : [keys];
  }
  
  async invoke(input: RunInput): Promise<any> {
    if (this.keys.length === 1) {
      return input[this.keys[0]];
    }
    
    return this.keys.map(key => input[key]);
  }
}
```

## 📝 使用示例

### 示例 1: 字段选择

```typescript
import { RunnableMap, RunnablePassthrough } from '@langchain/core/runnables';

// 选择特定字段
const selectFields = RunnableMap.from({
  topic: (input: { topic: string; style?: string }) => input.topic,
  style: (input) => input.style || 'default'
});

const result = await selectFields.invoke({
  topic: 'cats',
  style: 'funny',
  extra: 'ignored'  // 被忽略
});

console.log(result);
// { topic: 'cats', style: 'funny' }
```

### 示例 2: 字段转换

```typescript
import { RunnableMap } from '@langchain/core/runnables';

// 转换字段值
const transformFields = RunnableMap.from({
  // 转大写
  title: (input: { title: string }) => input.title.toUpperCase(),
  
  // 计算长度
  length: (input) => input.title.length,
  
  // 拆分单词
  words: (input) => input.title.split(' ')
});

const result = await transformFields.invoke({
  title: 'Hello World'
});

console.log(result);
// { title: 'HELLO WORLD', length: 11, words: ['Hello', 'World'] }
```

### 示例 3: 与 Sequence 组合

```typescript
import { RunnableSequence, RunnableMap, RunnablePassthrough } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// 完整的数据处理管道
const chain = RunnableSequence.from([
  // Step 1: 提取和转换输入
  RunnableMap.from({
    topic: (input: { topic: string; language?: string }) => input.topic,
    language: (input) => input.language || 'en',
    systemMessage: () => 'You are a helpful assistant.'
  }),
  
  // Step 2: 格式化提示
  ChatPromptTemplate.fromMessages([
    ['system', '{systemMessage}'],
    ['human', 'Tell me about {topic} in {language}']
  ]),
  
  // Step 3: 调用模型
  new ChatOpenAI({ modelName: 'gpt-4' }),
  
  // Step 4: 格式化输出
  RunnableMap.from({
    content: (result) => result.content,
    tokens: (result) => result.usage_metadata?.total_tokens,
    finishReason: (result) => result.response_metadata?.finish_reason
  })
]);

const result = await chain.invoke({
  topic: 'quantum computing',
  language: 'Spanish'
});
```

### 示例 4: 并行字段处理

```typescript
import { RunnableMap, RunnableLambda } from '@langchain/core/runnables';

// 并行处理多个字段
const processor = RunnableMap.from({
  summary: RunnableLambda.from(
    async (doc: Document) => await generateSummary(doc.content)
  ),
  keywords: RunnableLambda.from(
    (doc: Document) => extractKeywords(doc.content)
  ),
  category: RunnableLambda.from(
    async (doc: Document) => await classifyDocument(doc)
  ),
  sentiment: RunnableLambda.from(
    (doc: Document) => analyzeSentiment(doc.content)
  )
});

const result = await processor.invoke(document);
// { summary: '...', keywords: [...], category: 'tech', sentiment: 'positive' }
```

### 示例 5: 嵌套 Map

```typescript
import { RunnableMap } from '@langchain/core/runnables';

// 嵌套字段映射
const nestedMap = RunnableMap.from({
  user: RunnableMap.from({
    name: (input: { userData: any }) => input.userData.name,
    email: (input) => input.userData.email
  }),
  metadata: RunnableMap.from({
    timestamp: () => Date.now(),
    version: () => '1.0'
  })
});

const result = await nestedMap.invoke({
  userData: { name: 'John', email: 'john@example.com' }
});

console.log(result);
// {
//   user: { name: 'John', email: 'john@example.com' },
//   metadata: { timestamp: 1234567890, version: '1.0' }
// }
```

### 示例 6: 透传 (Passthrough)

```typescript
import { RunnableMap, RunnablePassthrough } from '@langchain/core/runnables';

// 保留原始输入，添加新字段
const chain = RunnableMap.from({
  // 透传原始输入
  original: new RunnablePassthrough(),
  
  // 添加处理后的字段
  processed: RunnableLambda.from(
    (input: { text: string }) => input.text.toUpperCase()
  ),
  
  // 添加元数据
  metadata: RunnableMap.from({
    timestamp: () => Date.now(),
    inputLength: (input: { text: string }) => input.text.length
  })
});

const result = await chain.invoke({ text: 'hello' });
// {
//   original: { text: 'hello' },
//   processed: 'HELLO',
//   metadata: { timestamp: ..., inputLength: 5 }
// }
```

### 示例 7: 条件字段

```typescript
import { RunnableMap, RunnableBranch } from '@langchain/core/runnables';

// 条件字段映射
const conditionalMap = RunnableMap.from({
  data: (input) => input.data,
  
  // 根据条件添加不同的字段
  analysis: RunnableBranch(
    [
      (input) => input.type === 'text',
      RunnableLambda.from(async (input) => await analyzeText(input.data))
    ],
    [
      (input) => input.type === 'image',
      RunnableLambda.from(async (input) => await analyzeImage(input.data))
    ],
    // 默认
    RunnableLambda.from((input) => ({ error: 'Unknown type' }))
  )
});
```

## ⚙️ 高级用法

### 1. 动态字段

```typescript
import { RunnableMap, RunnableLambda } from '@langchain/core/runnables';

// 根据输入动态决定字段
const dynamicMap = RunnableMap.from({
  static: () => 'always included',
  
  dynamic: RunnableLambda.from(
    (input: { fields?: string[] }) => {
      const result: Record<string, any> = {};
      
      input.fields?.forEach(field => {
        result[field] = `value for ${field}`;
      });
      
      return result;
    }
  )
});
```

### 2. 错误处理

```typescript
import { RunnableMap, RunnableLambda } from '@langchain/core/runnables';

// 带错误处理的字段映射
const safeMap = RunnableMap.from({
  primary: RunnableLambda.from(
    async (input) => {
      try {
        return await primaryProcessor(input);
      } catch (e) {
        return { error: e.message };
      }
    }
  ),
  
  fallback: RunnableLambda.from(
    (input) => fallbackProcessor(input)
  )
});
```

### 3. 异步字段初始化

```typescript
import { RunnableMap, RunnableLambda } from '@langchain/core/runnables';

// 异步字段
const asyncMap = RunnableMap.from({
  config: RunnableLambda.from(
    async () => await loadConfig()
  ),
  
  cache: RunnableLambda.from(
    async () => await initializeCache()
  ),
  
  // 使用 config 和 cache
  processor: RunnableLambda.from(
    async (input, config) => {
      const cfg = await config.config;
      const cache = await config.cache;
      return processWithConfig(input, cfg, cache);
    }
  )
});
```

## 📊 与其他 Runnable 比较

| Runnable | 用途 | 执行方式 | 返回类型 |
|----------|------|---------|---------|
| **RunnableMap** | 字段映射/转换 | 并行 | `Record<string, any>` |
| **RunnableSequence** | 顺序组合 | 串行 | 任意类型 |
| **RunnableParallel** | 并行分支 | 并行 | `Record<string, any>` |
| **RunnableLambda** | 自定义函数 | 取决于函数 | 任意类型 |
| **RunnablePassthrough** | 透传 | 直接返回 | 输入类型 |

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 使用有意义的字段名
const map = RunnableMap.from({
  content: (result) => result.content,  // ✅ 清晰
  metadata: (result) => result.metadata
});

// 2. 利用并行处理
const processor = RunnableMap.from({
  summary: summarizer,  // 并行执行
  keywords: keywordExtractor,
  category: classifier
});

// 3. 组合使用 Passthrough
const chain = RunnableMap.from({
  original: new RunnablePassthrough(),
  processed: processor
});
```

### ❌ 不推荐

```typescript
// 1. 避免过于复杂的映射
const complexMap = RunnableMap.from({
  field1: RunnableSequence.from([/* 10 steps */]),  // ❌
  field2: RunnableSequence.from([/* 10 steps */])
});
// 应该拆分成多个 Runnable

// 2. 避免字段间的依赖
const badMap = RunnableMap.from({
  step1: processor1,
  step2: RunnableLambda.from((input, ctx) => {
    // 依赖 step1 的结果，但 step1 可能还没完成  // ❌
  })
});

// 3. 避免忽略错误
const map = RunnableMap.from({
  data: async (input) => {
    return riskyOperation(input);  // 没有 try-catch  // ❌
  }
});
```

---

**源码参考**: `libs/langchain-core/src/runnables/base.ts`