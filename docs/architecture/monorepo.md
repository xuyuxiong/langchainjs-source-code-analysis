# Monorepo 结构

> 基于 LangChainJS 源码分析

## 概述

LangChainJS 采用 **pnpm workspace** 管理的 Monorepo 架构，包含 **40+ 个独立包**，每个包都有独立的版本管理和发布周期。

## 目录结构

```
langchainjs/
├── libs/
│   ├── langchain-core/           # 核心抽象层 (核心依赖)
│   ├── langchain/               # 主要实现 (高级API)
│   ├── langchain-classic/       # 经典/旧版API兼容
│   ├── langchain-textsplitters/ # 文本分割器
│   ├── langchain-mcp-adapters/  # MCP适配器 (新增)
│   └── providers/               # 35+ 提供商集成
│       ├── langchain-openai/        # OpenAI集成
│       ├── langchain-anthropic/     # Anthropic集成
│       ├── langchain-google/        # Google集成
│       ├── langchain-cohere/        # Cohere集成
│       ├── langchain-mistralai/     # MistralAI集成
│       ├── langchain-aws/           # AWS集成
│       ├── langchain-pinecone/      # Pinecone向量存储
│       ├── langchain-chroma/        # Chroma向量存储
│       ├── langchain-redis/         # Redis缓存
│       ├── langchain-pgvector/      # PostgreSQL向量存储
│       └── ... (25+ 其他提供商)
├── create-langchain-integration/ # 集成创建工具
├── internal/                   # 内部工具包
├── examples/                   # 示例代码
├── environment_tests/          # 环境测试
└── dependency_range_tests/     # 依赖范围测试
```

## 包分类统计

| 类别 | 数量 | 示例包 |
|------|------|--------|
| **核心包** | 5 | langchain-core, langchain, langchain-classic, langchain-textsplitters, langchain-mcp-adapters |
| **提供商集成** | 35+ | langchain-openai, langchain-anthropic, langchain-google, langchain-cohere... |
| **工具包** | 1 | create-langchain-integration |
| **总计** | **40+** | 所有独立npm包 |

## 核心包依赖关系

```
应用代码
    │
    ▼
┌─────────────────────────────────────────────┐
│  @langchain/core                            │
│  (所有包的基础依赖)                            │
└────────────┬────────────────────────────────┘
             │
      ┌──────┼──────┐
      ▼      ▼      ▼
┌──────────┐ ┌──────────┐ ┌──────────────────┐
│langchain │ │@langchain│ │  Providers       │
│          │ │/openai   │ │  - pinecone      │
│          │ ├──────────┤ │  - chroma        │
│          │ │@langchain│ │  - pgvector      │
│          │ │/anthropic│ │  - redis         │
│          │ └──────────┘ │  - qdrant        │
│          │              │  - ...           │
└──────────┘              └──────────────────┘
```

## 构建工具

- **包管理**: pnpm@10.14.0
- **构建**: turbo@2.9.3
- **格式化**: oxfmt@0.43.0
- **代码检查**: oxlint@1.58.0
- **版本管理**: changesets@2.30.0

## 工作空间配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'libs/*'
  - 'libs/providers/*'
  - 'internal/*'
  - 'examples/*'
  - 'create-langchain-integration'
```

---
