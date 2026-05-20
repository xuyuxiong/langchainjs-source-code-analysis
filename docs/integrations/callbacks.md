# 回调系统

> 基于 LangChainJS 源码分析

**源文件**: `libs/langchain-core/src/callbacks/manager.ts`

回调系统负责在 LCEL 执行过程中触发各种事件。

```
CallbackManager
    ├── handleLLMStart/onLLMStart
    ├── handleLLMEnd/onLLMEnd
    ├── handleChainStart/onChainStart
    ├── handleChainEnd/onChainEnd
    └── ...
```

(详细内容待补充...)

---

**源码**: `/Users/xilin/Documents/sources/langchainjs/libs/langchain-core/src/callbacks/`