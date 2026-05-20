# Retriever 检索器

> 基于 LangChainJS 源码分析

## 文件位置

**源文件**: `libs/langchain-core/src/retrievers/index.ts`

## 概述

Retriever 是 LangChainJS 中用于文档检索的抽象接口，实现了文档集合的检索功能。

```
┌─────────────────────────────────────────────┐
│  BaseRetriever                               │
│  ├── BaseDocumentLoader                      │
│  ├── VectorStoreRetriever                    │
│  ├── WebRetriever                            │
│  └── ...                                     │
└─────────────────────────────────────────────┘
```

(文档待补充...)

---

**源码**: `/Users/xilin/Documents/sources/langchainjs/libs/langchain-core/src/retrievers/`