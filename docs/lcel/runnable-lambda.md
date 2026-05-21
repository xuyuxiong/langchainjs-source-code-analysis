# RunnableLambda

> 将自定义函数包装为 Runnable

## 📋 概述

RunnableLambda 允许将任意 JavaScript/TypeScript 函数包装成 Runnable，使其可以与其他 Runnable 组件组合使用。

**源码位置**: `libs/langchain-core/src/runnables/base.ts`

## 🎯 核心价值

```typescript
// 普通函数
function addNumbers(a: number, b: number): number {
  return a + b;
}

// 包装成 Runnable
const addRunnable = RunnableLambda.from(addNumbers);

// 现在可以参与 LCEL 管道
const chain = prompt | model | parser | addRunnable;
```

## 🔧 实现详解

### 类定义

```typescript
class RunnableLambda<
  RunInput,
  RunOutput
> extends Runnable<RunInput, RunnableConfig, RunOutput> {
  
  /**
   * 包装的函数
   */
  protected func: (
    input: RunInput,
    config: RunnableConfig
  ) => RunOutput | Promise<RunOutput>;
  
  constructor(fields: {
    func: (
      input: RunInput,
      config: RunnableConfig
    ) => RunOutput | Promise<RunOutput>;
    name?: string;
  }) {
    super(fields);
    this.func = fields.func;
    this.name = fields.name ?? this.getName();
  }
  
  // ========== 静态方法 ==========
  
  /**
   * 从函数创建 RunnableLambda
   */
  static from<RunInput, RunOutput>(
    func: (
      input: RunInput,
      config: RunnableConfig
    ) => RunOutput | Promise<RunOutput>,
    options?: { name?: string }
  ): RunnableLambda<RunInput, RunOutput> {
    return new RunnableLambda({ func, ...options });
  }
  
  /**
   * 从异步生成器创建
   */
  static fromAsyncGenerator<RunInput, RunOutput>(
    func: (
      input: RunInput,
      config: RunnableConfig
    ) => AsyncGenerator<RunOutput>
  ): Runnable<RunInput, RunnableConfig, RunOutput> {
    return new RunnableGenerator({ func });
  }
  
  // ========== 核心方法 ==========
  
  async invoke(
    input: RunInput,
    options?: Partial<RunnableConfig>
  ): Promise<RunOutput> {
    const config = ensureConfig(options);
    
    // 直接调用包装的函数
    return this.func(input, config);
  }
  
  async *stream(
    input: RunInput,
    options?: Partial<RunnableConfig>
  ): AsyncGenerator<RunOutput> {
    const result = await this.invoke(input, options);
    yield result;
  }
}
```

## 📝 使用示例

### 示例 1: 基础函数包装

```typescript
import { RunnableLambda } from '@langchain/core/runnables';

// 同步函数
const trim = RunnableLambda.from((text: string) => text.trim());

// 异步函数
const fetchUrl = RunnableLambda.from(
  async (url: string) => {
    const response = await fetch(url);
    return response.text();
  }
);

// 使用
const result = await fetchUrl.invoke('https://example.com');
```

### 示例 2: 数据转换

```typescript
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableLambda } from '@langchain/core/runnables';

// 添加自定义日志步骤
const logOutput = RunnableLambda.from(
  (text: string) => {
    console.log('LLM Output:', text);
    return text;
  },
  { name: 'LogOutput' }
);

const chain = 
  ChatPromptTemplate.fromTemplate('Tell me a joke about {topic}')
  | new ChatOpenAI()
  | new StringOutputParser()
  | logOutput;

const result = await chain.invoke({ topic: 'cats' });
```

### 示例 3: 复杂数据处理

```typescript
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables';

// 分割文本为 chunks
const splitIntoChunks = RunnableLambda.from(
  (text: string) => {
    const words = text.split(' ');
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += 100) {
      chunks.push(words.slice(i, i + 100).join(' '));
    }
    return chunks;
  }
);

// 合并 chunks
const mergeChunks = RunnableLambda.from(
  (chunks: string[]) => chunks.join('\n---\n')
);

const chain = RunnableSequence.from([
  someLLM,
  new StringOutputParser(),
  splitIntoChunks,
  // 可以并行处理每个 chunk
  RunnableLambda.from(async (chunks: string[]) => {
    const processed = await Promise.all(
      chunks.map(chunk => processChunk(chunk))
    );
    return processed;
  }),
  mergeChunks
]);
```

### 示例 4: 条件逻辑

```typescript
import { RunnableLambda, RunnableBranch } from '@langchain/core/runnables';

// 根据输入长度选择不同的处理
const selectProcessor = RunnableLambda.from(
  (text: string) => {
    if (text.length < 100) {
      return 'short';
    } else if (text.length < 1000) {
      return 'medium';
    } else {
      return 'long';
    }
  }
);

const branch = RunnableBranch(
  [
    (category: string) => category === 'short',
    shortProcessor
  ],
  [
    (category: string) => category === 'medium',
    mediumProcessor
  ],
  longProcessor
);

const chain = selectProcessor | branch;
```

### 示例 5: 错误处理

```typescript
import { RunnableLambda } from '@langchain/core/runnables';

// 带重试的 HTTP 请求
const fetchWithRetry = RunnableLambda.from(
  async (url: string) => {
    let lastError: Error;
    
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      } catch (e) {
        lastError = e as Error;
        await sleep(1000 * (i + 1)); // 指数退避
      }
    }
    
    throw lastError!;
  },
  { name: 'FetchWithRetry' }
);
```

### 示例 6: 状态管理

```typescript
import { RunnableLambda } from '@langchain/core/runnables';

// 创建带状态的处理器
function createCounter() {
  let count = 0;
  
  return RunnableLambda.from(
    (input: string) => {
      count += 1;
      return `[${count}] ${input}`;
    },
    { name: 'Counter' }
  );
}

const counter = createCounter();

await counter.invoke('First');  // "[1] First"
await counter.invoke('Second'); // "[2] Second"
```

### 示例 7: 与 Parallel 组合

```typescript
import { RunnableLambda, RunnableParallel } from '@langchain/core/runnables';

// 并行执行多个自定义操作
const processor = RunnableParallel({
  // 提取 metadata
  metadata: RunnableLambda.from(
    (doc: Document) => extractMetadata(doc)
  ),
  
  // 生成 summary
  summary: RunnableLambda.from(
    async (doc: Document) => {
      const summary = await generateSummary(doc.content);
      return summary;
    }
  ),
  
  // 提取关键词
  keywords: RunnableLambda.from(
    (doc: Document) => extractKeywords(doc.content)
  )
});

const result = await processor.invoke(document);
// { metadata: {...}, summary: '...', keywords: [...] }
```

## ⚙️ 高级用法

### 1. 生成器函数

```typescript
import { RunnableLambda } from '@langchain/core/runnables';

// 异步生成器
const streamProcessor = RunnableLambda.fromAsyncGenerator(
  async function* (input: string) {
    const chunks = input.split(' ');
    for (const chunk of chunks) {
      yield processChunk(chunk);
      await sleep(100); // 模拟流式
    }
  }
);

// 使用
for await (const chunk of streamProcessor.stream('hello world example')) {
  console.log(chunk);
}
```

### 2. 绑定配置

```typescript
import { RunnableLambda } from '@langchain/core/runnables';

// 访问配置中的回调
const loggingRunnable = RunnableLambda.from(
  async (input: string, config) => {
    const callbacks = config?.callbacks;
    await callbacks?.handleText?.(input);
    return input.toUpperCase();
  }
);
```

### 3. 类型安全

```typescript
import { RunnableLambda } from '@langchain/core/runnables';

interface Input {
  text: string;
  language: 'en' | 'zh' | 'ja';
}

interface Output {
  translated: string;
  confidence: number;
}

const translator = RunnableLambda.from<Input, Output>(
  async ({ text, language }) => {
    // 类型安全的输入
    const result = await translate(text, language);
    return {
      translated: result.text,
      confidence: result.confidence
    };
  }
);

// 类型推导确保正确
const result = await translator.invoke({
  text: 'Hello',
  language: 'zh'
});
// result: { translated: string; confidence: number; }
```

## 📊 与其他 Runnable 比较

| Runnable 类型 | 用途 | 灵活性 | 类型安全 |
|--------------|------|--------|---------|
| **RunnableLambda** | 自定义函数 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **RunnableSequence** | 顺序组合 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **RunnableParallel** | 并行执行 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **RunnableBranch** | 条件分支 | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **RunnableMap** | 字段映射 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 给 Lambda 添加有意义的名称
const cleanText = RunnableLambda.from(
  (text: string) => text.trim().toLowerCase(),
  { name: 'CleanText' }
);

// 2. 保持函数单一职责
const validate = RunnableLambda.from(validateInput);
const transform = RunnableLambda.from(transformData);
const chain = validate | transform;

// 3. 处理异步错误
const safeFetch = RunnableLambda.from(
  async (url: string) => {
    try {
      return await fetch(url).then(r => r.text());
    } catch (e) {
      return `Error: ${e.message}`;
    }
  }
);

// 4. 使用类型注解
const parser = RunnableLambda.from<InputType, OutputType>(
  (input) => { /* ... */ }
);
```

### ❌ 不推荐

```typescript
// 1. 避免过长的 Lambda 函数
const complex = RunnableLambda.from(
  async (input) => {
    // 100+ 行代码...  // ❌
    // 应该拆分成多个小函数
  }
);

// 2. 避免副作用
let globalState = 0;
const badRunnable = RunnableLambda.from(
  (input) => {
    globalState += 1;  // ❌ 副作用
    return input;
  }
);

// 3. 避免忽略配置
const noConfig = RunnableLambda.from(
  (input) => {
    // 没有使用 config 参数  // 可能错过回调等
    return input;
  }
);
```

## 🔍 常见 Use Cases

### 1. 后处理

```typescript
const chain = prompt | model | parser | RunnableLambda.from(
  (text: string) => text.replace(/\[.*?\]/g, '') // 移除引用标记
);
```

### 2. 数据格式化

```typescript
const formatOutput = RunnableLambda.from(
  (data: any) => ({
    ...data,
    timestamp: Date.now(),
    version: '1.0'
  })
);
```

### 3. 输入验证

```typescript
const validate = RunnableLambda.from(
  (input: { text: string }) => {
    if (!input.text || input.text.length === 0) {
      throw new Error('Text is required');
    }
    if (input.text.length > 10000) {
      throw new Error('Text too long');
    }
    return input;
  }
);
```

---

**源码参考**: `libs/langchain-core/src/runnables/base.ts`