# 绑定与配置

> 基于 LangChainJS 源码分析

## bind 机制

```typescript
const modelWithConfig = model.bind({
  temperature: 0.0,
  maxTokens: 100
});
```

## withConfig

```typescript
const runnableWithCallbacks = model.withCallbacks({
  onStart: () => console.log("开始"),
  onEnd: () => console.log("结束")
});
```

(详细内容待补充...)

---

**源码**: `/Users/xilin/Documents/sources/langchainjs/libs/langchain-core/src/runnables/`