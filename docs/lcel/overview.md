# LCEL 表达式语言

> LangChain 表达式语言 (LangChain Expression Language) 核心概念

## 📋 概述

LCEL 是一种声明式组合原语的方式，让你可以轻松构建复杂的 AI 应用。

**源码位置**: `libs/langchain-core/src/runnables/`

## 🏗️ Runnable 类型体系

```typescript
// 核心接口定义
interface RunnableInterface<RunInput, CallOptions, RunOutput> {
  // 执行方法
  invoke(input, options?): Promise<RunOutput>;
  batch(inputs, options?): Promise<RunOutput[]>;
  stream(input, options?): AsyncGenerator<RunOutput>;
  
  // 组合方法
  pipe<T>(other: RunnableLike<RunOutput, T>): 
    Runnable<RunInput, Exclude<T, Error>>;  // ⚠️ 注意返回类型
  bind(kwargs): Runnable<RunInput, CallOptions, RunOutput>;
  
  // 配置方法
  withConfig(config): Runnable<RunInput, CallOptions, RunOutput>;
  withRetry(fields?): RunnableRetry<RunInput, RunOutput, CallOptions>;  // ⚠️ 注意返回类型
  withFallbacks(fallbacks[]): RunnableWithFallbacks<RunInput, RunOutput>;
  
  // 流式转换
  transform(generator, options?): AsyncGenerator<RunOutput>;
}
```

## 📦 Runnable 类型体系

| 类型 | 用途 | 返回类型 |
|------|------|---------|
| **Runnable** | 基础接口 | - |
| **RunnableSequence** | 顺序组合 | `Runnable<RunInput, NewRunOutput>` |
| **RunnableParallel** | 并行执行 | `Runnable<RunInput, Record<string, any>>` |
| **RunnableMap** | 字段映射 | `RunnableMap<RunInput, RunOutput>` |
| **RunnableLambda** | 自定义函数 | `Runnable<RunInput, RunOutput>` |
| **RunnableBranch** | 条件分支 | `Runnable<RunInput, RunOutput>` |
| **RunnableRetry** | 重试包装 | `RunnableRetry<RunInput, RunOutput, CallOptions>` |
| **RunnableWithFallbacks** | Fallback | `RunnableWithFallbacks<RunInput, RunOutput>` |
| **RunnableBinding** | 参数绑定 | `RunnableBinding<...>` |

## 🔑 核心方法详解

### pipe 组合

**源文件**: `libs/langchain-core/src/runnables/base.ts` (第 615-623 行)

```typescript
pipe<NewRunOutput>(
  coerceable: RunnableLike<RunOutput, NewRunOutput>
): Runnable<RunInput, Exclude<NewRunOutput, Error>> {
  return new RunnableSequence({
    first: this,
    last: _coerceToRunnable(coerceable),
  });
}
```

> ⚠️ **注意**: `pipe()` 返回 `Runnable<RunInput, Exclude<NewRunOutput, Error>>`，而非 `RunnableSequence<this, T>`

### withRetry 重试

**源文件**: `libs/langchain-core/src/runnables/base.ts` (第 165-191 行)

```typescript
withRetry(fields?: {
  stopAfterAttempt?: number;
  onFailedAttempt?: RunnableRetryFailedAttemptHandler;
}): RunnableRetry<RunInput, RunOutput, CallOptions> {
  return new RunnableRetry({
    bound: this,
    kwargs: {},
    config: {},
    maxAttemptNumber: fields?.stopAfterAttempt,
    ...fields,
  });
}
```

> ⚠️ **注意**: 返回 `RunnableRetry<RunInput, RunOutput, CallOptions>`

### transform 流式转换

**源文件**: `libs/langchain-core/src/runnables/base.ts` (第 651-662 行)

```typescript
async *transform(\n  generator: AsyncGenerator<RunInput>,\n  options: Partial<CallOptions>  // ⚠️ 注意这里是 Partial\n): AsyncGenerator<RunOutput> {\n  let finalChunk;\n  for await (const chunk of generator) {\n    if (finalChunk === undefined) {\n      finalChunk = chunk;\n    } else {\n      finalChunk = this._concatOutputChunks(finalChunk, chunk as any);\n    }\n  }\n  yield* this._streamIterator(finalChunk, ensureConfig(options));\n}\n```\n\n## 📝 使用示例\n\n### 示例 1: 基础管道\n\n```typescript\nimport { RunnableSequence, RunnableMap } from '@langchain/core/runnables';\n\nconst chain = RunnableSequence.from([\n  promptTemplate,\n  model,\n  outputParser\n]);\n\n// pipe() 返回 Runnable<RunInput, Exclude<NewRunOutput, Error>>\nconst chain = promptTemplate.pipe(model).pipe(outputParser);\n```\n\n### 示例 2: 重试逻辑\n\n```typescript\n// withRetry 返回 RunnableRetry\nconst chainWithRetry = chain.withRetry({\n  stopAfterAttempt: 3,\n  onFailedAttempt: (error) => console.log(`重试：${error.message}`)\n});\n```\n\n### 示例 3: 流式转换\n\n```typescript\nimport { RunnableLambda } from '@langchain/core/runnables';\n\nconst transform = RunnableLambda.from(async function* (input) {\n  yield 'start';\n  yield 'middle';\n  yield 'end';\n});\n\n// transform 的 options 参数类型为 Partial<CallOptions>\nconst stream = await transform.stream('input');\nfor await (const chunk of stream) {\n  console.log(chunk);\n}\n```\n\n---\n\n**源码参考**: `libs/langchain-core/src/runnables/base.ts`