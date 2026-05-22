# 向量存储系统

> 相似度搜索与向量索引

## 📋 概述

向量存储负责存储嵌入向量并执行相似度搜索，是 RAG 应用的核心组件。

**源码位置**: `libs/langchain-core/src/vectorstores.ts`

**文件数**: 1 个核心文件 + 各提供商实现

## 🏗️ 类层次结构

```
Serializable
    │
    └── VectorStore
            │
            └── 提供商实现
                ├── MemoryVectorStore (内存)
                ├── Pinecone
                ├── Supabase
                ├── PGVector
                └── ...
```

## 🔑 VectorStore 核心接口

**源文件**: `libs/langchain-core/src/vectorstores.ts`

```typescript
abstract class VectorStore<
  VectorStoreIndexInterface extends IndexInterface = IndexInterface
> extends Serializable implements VectorStoreInterface {
  
  // ========== 类型定义 ==========
  
  /**
   * Filter 类型（由子类定义）
   */
  FilterType: unknown;
  
  // ========== 抽象方法 (子类必须实现) ==========
  
  /**
   * 添加向量
   * @param vectors 向量数组
   * @param documents 对应文档
   * @param options 选项
   * @returns 添加的 ID 列表或 void
   */
  abstract addVectors(\n    vectors: number[][],\n    documents: DocumentInterface[],\n    options?: AddDocumentOptions\n  ): Promise<string[] | void>;
  
  /**
   * 添加文档（自动计算嵌入）
   * @param documents 文档列表
   * @param options 选项
   * @returns 添加的 ID 列表或 void
   */
  abstract addDocuments(\n    documents: DocumentInterface[],\n    options?: AddDocumentOptions\n  ): Promise<string[] | void>;
  
  /**
   * 向量相似度搜索（带评分）
   * @param query 查询向量
   * @param k 返回数量（必填，无默认值）
   * @param filter 过滤器（类型为 this["FilterType"]）
   * @returns [文档，评分] 元组数组
   */
  abstract similaritySearchVectorWithScore(\n    query: number[],\n    k: number,\n    filter?: this['FilterType']\n  ): Promise<[DocumentInterface, number][]>;
  
  // ========== 便捷方法（默认实现）==========
  
  /**
   * 相似度搜索
   * @param query 查询文本
   * @param k 返回数量（默认值：4）
   * @param filter 过滤器\n   * @param _callbacks 回调（可选）\n   * @returns 文档列表\n   */\n  async similaritySearch(\n    query: string,\n    k = 4,\n    filter: this['FilterType'] | undefined = undefined,\n    _callbacks: Callbacks | undefined = undefined\n  ): Promise<DocumentInterface[]> {\n    const results = await this.similaritySearchVectorWithScore(\n      await this.embeddings.embedQuery(query),\n      k,\n      filter\n    );\n    return results.map(result => result[0]);\n  }
  
  /**
   * 相似度搜索（带评分）
   */\n  async similaritySearchWithScore(\n    query: string,\n    k = 4,\n    filter?: this['FilterType']\n  ): Promise<[DocumentInterface, number][]> {\n    const queryEmbedding = await this.embeddings.embedQuery(query);\n    return await this.similaritySearchVectorWithScore(\n      queryEmbedding,\n      k,\n      filter\n    );\n  }
  
  // ========== 索引管理 ==========\n  \n  /**
   * 删除文档
   */\n  async delete(\n    params?: {\n      ids?: string[];\n      filter?: this['FilterType'];\n    }\n  ): Promise<void> {\n    // 默认实现，部分提供商支持\n  }
  
  /**
   * 获取索引统计
   */\n  async indexExists(): Promise<boolean> {\n    return true;\n  }\n  
  /**\n   * 检查索引是否空\n   */\n  async isIndexEmpty(): Promise<boolean> {\n    return true;\n  }\n}\n
```

## 📊 关键类型定义

```typescript
/**
 * 文档接口
 */\ninterface DocumentInterface {\n  pageContent: string;\n  metadata: Record<string, any>;\n}\n\n/**\n * 添加文档选项\n */\ninterface AddDocumentOptions {\n  ids?: string[];\n  [key: string]: any;\n}\n\n/**\n * 索引接口（用于类型约束）\n */\ninterface IndexInterface {}\n```\n\n## 📝 使用示例\n\n### 示例 1: 添加向量\n\n```typescript\nimport { MemoryVectorStore } from 'langchain/vectorstores/memory';\nimport { OpenAIEmbeddings } from '@langchain/openai';\nimport { Document } from '@langchain/core/documents';\n\nconst embeddings = new OpenAIEmbeddings();\nconst store = new MemoryVectorStore(embeddings);\n\n// 添加向量\nconst vectors = [[0.1, 0.2, ...], [0.3, 0.4, ...]];\nconst documents = [\n  new Document({ pageContent: '文档 1', metadata: { source: 'a' } }),\n  new Document({ pageContent: '文档 2', metadata: { source: 'b' } })\n];\n\n// addVectors 返回 Promise<string[] | void>\nconst ids = await store.addVectors(vectors, documents);\n// ids: string[] | void\n```\n\n### 示例 2: 添加文档\n\n```typescript\n// addDocuments 自动计算嵌入\n// 返回 Promise<string[] | void>\nconst ids = await store.addDocuments([\n  new Document({ pageContent: '内容 A', metadata: {} }),\n  new Document({ pageContent: '内容 B', metadata: {} })\n]);\n```\n\n### 示例 3: 相似度搜索\n\n```typescript\n// similaritySearch 方法\n// k 参数默认值为 4，filter 类型为 this[\"FilterType\"]\nconst results = await store.similaritySearch(\n  '查询内容',\n  5,  // k=5\n  { source: 'a' }  // filter\n);\n\n// similaritySearchWithScore 返回 [Document, number][]\nconst resultsWithScore = await store.similaritySearchWithScore(\n  '查询内容',\n  5\n);\n// 每个结果：[Document, 相似度分数]\n```\n\n### 示例 4: MemoryVectorStore 完整示例\n\n```typescript\nimport { MemoryVectorStore } from 'langchain/vectorstores/memory';\nimport { OpenAIEmbeddings } from '@langchain/openai';\nimport { Document } from '@langchain/core/documents';\n\nconst embeddings = new OpenAIEmbeddings();\n\n// 从文档创建\nconst documents = [\n  new Document({ pageContent: '文档 1', metadata: {} }),\n  new Document({ pageContent: '文档 2', metadata: {} })\n];\n\nconst store = await MemoryVectorStore.fromDocuments(\n  documents,\n  embeddings\n);\n\n// 相似度搜索\nconst results = await store.similaritySearch('查询', 5);\n```\n\n### 示例 5: 删除文档\n\n```typescript\n// delete 方法（部分提供商支持）\nawait store.delete({\n  ids: ['id1', 'id2'],\n  filter: { source: 'a' }  // 类型为 this[\"FilterType\"]\n});\n```\n\n## ⚠️ 常见错误\n\n### 错误 1: 忽略返回类型\n\n```typescript\n// ❌ 错误假设一定返回 string[]\nconst ids = await store.addVectors(vectors, docs);\nconst newDocs = ids.map(id => ...);  // 可能报错！\n\n// ✅ 正确处理\nconst ids = await store.addVectors(vectors, docs);\nif (ids) {  // 检查是否为 void\n  const newDocs = ids.map(id => ...);\n}\n```\n\n### 错误 2: 错误使用 filter 类型\n\n```typescript\n// ❌ 错误：filter 类型是 this[\"FilterType\"]，不是统一的 FilterType\nawait store.similaritySearch(query, 5, { custom: 'filter' });\n\n// ✅ 正确：查看具体实现的 FilterType\nawait store.similaritySearch(query, 5, { source: 'a' });  // 根据具体提供商\n```\n\n### 错误 3: 忽略 k 参数必填\n\n```typescript\n// ❌ 错误：k 参数必填，无默认值（在 similaritySearchVectorWithScore 中）\nawait store.similaritySearchVectorWithScore(queryVector);\n\n// ✅ 正确：明确指定 k\nawait store.similaritySearchVectorWithScore(queryVector, 5);\n```\n\n## 💡 最佳实践\n\n### ✅ 推荐\n\n```typescript\n// 1. 检查返回值类型\nconst result = await store.addVectors(vectors, docs);\nif (result) { /* string[] */ } else { /* void */ }\n\n// 2. 使用正确的 FilterType\nconst store = new PineconeStore(embeddings, { index: 'my-index' });\nawait store.similaritySearch(query, 5, { namespace: 'ns1' });  // Pinecone 的 FilterType\n\n// 3. 利用默认值\nawait store.similaritySearch(query);  // k=4 默认值\n```\n\n---

**源码参考**: `libs/langchain-core/src/vectorstores.ts`