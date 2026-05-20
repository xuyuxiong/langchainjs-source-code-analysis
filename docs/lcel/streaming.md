# 流式处理

> 基于 LangChainJS 源码分析

## 流式响应

```
Input
  │
  ▼ stream()
AsyncGenerator<Chunk>
  │
  ├──▶ chunk1
  ├──▶ chunk2
  └──▶ chunk3
```

## 实现机制

```typescript
async function* stream(input) {
  const stream = await this.invoke(input, { stream: true });
  for await (const chunk of stream) {
    yield chunk;
  }
}
```

(详细内容待补充...)

---

**源码**: `/Users/xilin/Documents/sources/langchainjs/libs/langchain-core/src/runnables/`