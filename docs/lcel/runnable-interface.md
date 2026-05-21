# Runnable 接口深度解析

> LCEL 的核心抽象，所有组件的统一接口

## 📋 接口定义

**源文件**: `libs/langchain-core/src/runnables/types.ts`

```typescript
export interface Runnable<
  RunInput = unknown,
  CallOptions extends RunnableConfig = RunnableConfig,
  RunOutput = unknown
> extends RunnableInterface<RunInput, CallOptions, RunOutput> {
  
  //========== 核心执行方法 ==========
  
  /**
   * 单次调用 - 最基础的执行方式
   */
  invoke(
    input: RunInput,
    options?: Partial<CallOptions> | Partial<RunnableConfig>
  ): Promise<RunOutput>;
  
  /**
   * 流式响应 - 返回 AsyncGenerator
   */
  stream(
    input: RunInput,
    options?: Partial<CallOptions> | Partial<RunnableConfig>
  ): AsyncGenerator<RunOutput>;
  
  /**
   * 批量处理 - 并行执行多个输入
   */
  batch(
    inputs: RunInput[],
    options?: Partial<CallOptions> | Partial<RunnableConfig>
  ): Promise<RunOutput[]>;
  
  //========== 组合方法 ==========
  
  /**
   * 管道组合 - 与其他 Runnable 顺序组合
   */
  pipe<NewOutput>(
    other: Runnable<RunOutput, any, NewOutput>
  ): RunnableSequence<this, NewOutput>;
  
  /**
   * 参数绑定 - 预绑定 CallOptions
   */
  bind(
    kwargs: Partial<CallOptions>
  ): Runnable<RunInput, Partial<CallOptions>, RunOutput>;
  
  /**
   * 配置包装 - 添加运行时配置
   */
  withConfig(
    config: RunnableConfig
  ): Runnable<RunInput, CallOptions, RunOutput>;
  
  /**
   * 重试包装 - 添加重试逻辑
   */
  withRetry(
    config?: RunnableRetryConfig
  ): Runnable<RunInput, CallOptions, RunOutput>;
  
  /**
   * Fallback 包装 - 添加备用方案
   */
  withFallbacks(
    fallbacks: Runnable<RunInput, CallOptions, RunOutput>[]
  ): Runnable<RunInput, CallOptions, RunOutput>;
  
  //========== 辅助方法 ==========
  
  /**
   * 获取配置
   */
  getConfig(config?: Partial<RunnableConfig>): RunnableConfig;
  
  /**
   * 转换为可读名称
   */
  get Name(): string;
}
```

## 🎯 核心方法详解

### 1. invoke() - 单次调用

**源文件**: `libs/langchain-core/src/runnables/base.ts:800-900`

```typescript
async invoke(
  input: RunInput,
  options?: Partial<CallOptions>
): Promise<RunOutput> {
  // 1. 确保配置
  const config = ensureConfig(options);
  
  // 2. 获取回调管理器
  const callbackManager = await getCallbackManagerForConfig(config);
  
  // 3. 运行前回调
  const runManager = await callbackManager?.handleChainStart(
    this.toJSON(), // 序列化 Runnable
    this._serializeInput(input), // 序列化输入
    undefined, // 父 Run ID
    config.tags, // 标签
    config.metadata, // 元数据
    config.runName || this.getName() // 运行名称
  );
  
  // 4. 执行核心逻辑
  let output;
  try {
    output = await this._call(input, config, runManager);
  } catch (e) {
    // 5. 错误处理 - 发送错误回调
    await runManager?.handleChainError(e);
    throw e;
  }
  
  // 6. 运行后回调
  await runManager?.handleChainEnd(
    this._serializeOutput(output), // 序列化输出
    config.runName || this.getName()
  );
  
  return output;
}
```

**执行流程**:
```
Input
  │
  ▼
┌─────────────────────────────┐
│ 1. ensureConfig()           │
│    - 合并默认配置            │
│    - 添加 runId              │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 2. CallbackManager          │
│    - handleChainStart()     │
│    - 触发 onStart 事件       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 3. _call()                  │
│    - 子类实现核心逻辑         │
│    - 可以是 LLM 调用          │
│    - 可以是 Transform        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 4. CallbackManager          │
│    - handleChainEnd()       │
│    - 触发 onEnd 事件         │
└──────────────┬──────────────┘
               │
               ▼
             Output
```

### 2. stream() - 流式响应

**源文件**: `libs/langchain-core/src/runnables/base.ts:900-1000`

```typescript
async *stream(
  input: RunInput,
  options?: Partial<CallOptions>
): AsyncGenerator<RunOutput> {
  // 1. 配置和回调设置 (同 invoke)
  const config = ensureConfig(options);
  const callbackManager = await getCallbackManagerForConfig(config);
  
  // 2. 触发开始回调
  const runManager = await callbackManager?.handleChainStart(
    this.toJSON(),
    this._serializeInput(input),
    undefined,
    config.tags,
    config.metadata,
    config.runName || this.getName()
  );
  
  try {
    // 3. 执行流式生成
    const generator = this._streamIterator(input, config);
    
    // 4. 包装生成器，添加回调
    for await (const chunk of generator) {
      yield chunk; // 实时返回每个 chunk
    }
    
    // 5. 触发结束回调
    await runManager?.handleChainEnd({}, config.runName);
    
  } catch (e) {
    // 6. 错误处理
    await runManager?.handleChainError(e);
    throw e;
  }
}
```

**AsyncGenerator 特性**:
```typescript
// 使用示例
const stream = chain.stream({ topic: 'cats' });
for await (const chunk of stream) {
  process.stdout.write(chunk.content); // 实时输出
}

// 或者转换为 HTTP Server-Side Events
const stream = await chain.stream(input);
const httpStream = convertToHttpEventStream(stream);
return new Response(httpStream);
```

### 3. batch() - 批量处理

**源文件**: `libs/langchain-core/src/runnables/base.ts:1000-1100`

```typescript
async batch(
  inputs: RunInput[],
  options?: Partial<CallOptions> | Partial<RunnableConfig>
): Promise<RunOutput[]> {
  // 1. 批量配置
  const configs = this._getBatchOptions(options, inputs.length);
  
  // 2. 批量大小限制
  const batchSize = configs.batchSize ?? inputs.length;
  
  // 3. 并发限制
  const maxConcurrency = configs.maxConcurrency ?? Infinity;
  
  // 4. 分批处理
  const result = [];
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const batchConfigs = configs.configs.slice(i, i + batchSize);
    
    // 5. 并发执行 (使用信号量控制)
    const batchResults = await asyncPool(
      maxConcurrency,
      batch.map((input, idx) => 
        this.invoke(input, batchConfigs[idx])
      )
    );
    
    result.push(...batchResults);
  }
  
  return result;
}
```

**并发控制**:
```
┌─────────────────────────────────────────────────────┐
│ batch([A, B, C, D, E], { max: 2 })                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Batch 1: [A, B]  ──▶ Concurrent (max 2)           │
│    │                                                │
│    ├─▶ invoke(A) ──┐                               │
│    └─▶ invoke(B) ──┤──▶ wait                       │
│                                                     │
│  Batch 2: [C, D]  ──▶ Concurrent (max 2)           │
│    │                                                │
│    ├─▶ invoke(C) ──┐                               │
│    └─▶ invoke(D) ──┤──▶ wait                       │
│                                                     │
│  Batch 3: [E]     ──▶ Single                       │
│    └─▶ invoke(E)                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 🔧 组合方法详解

### 1. pipe() - 管道组合

**源文件**: `libs/langchain-core/src/runnables/base.ts`

```typescript
pipe<NewOutput>(
  other: Runnable<RunOutput, any, NewOutput>
): RunnableSequence<this, NewOutput> {
  return new RunnableSequence({
    first: this,
    last: other,
  });
}
```

**使用示例**:
```typescript
// 管道运算符 | 重载了 pipe()
const chain = A.pipe(B).pipe(C);

// 等同于
const chain = A | B | C;

// 执行时:
// 1. A.invoke(input) → output1
// 2. B.invoke(output1) → output2
// 3. C.invoke(output2) → finalOutput
```

### 2. bind() - 参数绑定

```typescript
bind(kwargs: Partial<CallOptions>): Runnable {
  const boundOptions = kwargs;
  
  return new RunnableBinding({
    bound: this,
    config: {},
    kwargs: boundOptions
  });
}
```

**使用场景**:
```typescript
// 绑定模型参数
const hotTempModel = model.bind({ temperature: 0.9 });
const coldTempModel = model.bind({ temperature: 0.1 });

// 之后调用自动使用绑定的参数
const creative = await hotTempModel.invoke(messages);
const precise = await coldTempModel.invoke(messages);
```

### 3. withConfig() - 运行配置

```typescript
withConfig(config: RunnableConfig): Runnable {
  return new RunnableBinding({
    bound: this,
    config: config
  });
}
```

**配置项**:
```typescript
interface RunnableConfig {
  tags?: string[];           // 标签，用于分类和过滤
  metadata?: Record<string, string>; // 元数据
  callbacks?: Callbacks;     // 回调处理器
  runName?: string;          // 运行名称
  maxConcurrency?: number;   // 最大并发数
  recursionLimit?: number;   // 递归深度限制
  configurable?: Record<string, any>; // 可配置参数
}
```

## 🔒 RunnableBinding

**源文件**: `libs/langchain-core/src/runnables/base.ts`

RunnableBinding 是所有包装器的基类：

```typescript
class RunnableBinding<
  RunInput,
  RunOutput,
  CallOptions extends RunnableConfig
> extends Runnable<RunInput, CallOptions, RunOutput> {
  
  protected bound: Runnable<RunInput, any, RunOutput>;
  protected config: RunnableConfig;
  protected kwargs: Partial<CallOptions>;
  
  async invoke(
    input: RunInput,
    options?: Partial<CallOptions>
  ): Promise<RunOutput> {
    // 合并绑定配置和调用时配置
    const mergedConfig = mergeConfigs(this.config, options);
    const mergedKwargs = { ...this.kwargs, ...options };
    
    // 调用被包装的 Runnable
    return this.bound.invoke(input, mergedKwargs);
  }
}
```

## 📊 类层次结构

```
Serializable
    │
    └── Runnable (接口)
            │
            ├── BaseRunnable (抽象基类)
            │       │
            │       ├── RunnableSequence (顺序组合)
            │       ├── RunnableParallel (并行组合)
            │       ├── RunnableBinding (绑定包装)
            │       │       │
            │       │       ├── RunnableWithFallbacks
            │       │       └── RunnableWithRetry
            │       │
            │       ├── RunnableLambda (函数包装)
            │       ├── RunnableMap (映射转换)
            │       ├── RunnableBranch (条件分支)
            │       ├── RunnablePassthrough (透传)
            │       └── RunnablePick (字段选择)
            │
            └── BaseLanguageModel (语言模型)
                    │
                    ├── BaseLLM
                    └── BaseChatModel
```

## ⚙️ 实现要点

### 1. 序列化支持

```typescript
toJSON(): SerializedRunnable {
  return {
    id: this.lc_id,
    name: this.getName(),
    graph: this.toGraph() // 转换为图结构
  };
}
```

### 2. 上下文传递

```typescript
// RunnableConfig 在整个调用链中传递
interface RunnableConfig {
  // 配置会传递给所有子 Runnable
  callbacks?: Callbacks;
  tags?: string[];
  metadata?: Record<string, any>;
  configurable?: Record<string, any>;
}
```

### 3. 错误处理

```typescript
try {
  const result = await runnable.invoke(input);
} catch (error) {
  if (error instanceof RunnableExecutionError) {
    // Runnable 执行错误
  } else if (error instanceof RunnableConfigError) {
    // 配置错误
  } else {
    // 其他错误
  }
}
```

---

**源码参考**: `/Users/xilin/Documents/sources/langchainjs/libs/langchain-core/src/runnables/base.ts`