# Monorepo 结构

> 基于 LangChainJS 源码分析

## 概述

LangChainJS 采用 pnpm workspace 管理的 Monorepo 架构，包含 40+ 个包。

## 目录结构

```
langchainjs/
├── libs/
│   ├── langchain-core/        # 核心抽象层
│   ├── langchain/            # 主要实现
│   ├── langchain-classic/    # 经典 API
│   ├── langchain-textsplitters/
│   └── providers/            # 35+ 提供商
│       ├── openai/
│       ├── anthropic/
│       └── ...
├── internal/                 # 内部工具
└── examples/                 # 示例代码
```

(详细内容待补充...)

---

**源码**: `/Users/xilin/Documents/sources/langchainjs/`