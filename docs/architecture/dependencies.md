# 包依赖关系

> 基于 LangChainJS 源码分析

## 依赖关系图

```
@langchain/core
    │
    ├──▶ @langchain/openai
    ├──▶ @langchain/anthropic
    └──▶ @langchain/* (35+ providers)

@langchain/core
    │
    ├──▶ @langchain/community
    └──▶ @langchain/langgraph
```

(详细分析待补充...)

---

**源码**: `/Users/xilin/Documents/sources/langchainjs/package.json`