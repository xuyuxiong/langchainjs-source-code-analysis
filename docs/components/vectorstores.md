# 向量存储 (VectorStore)

> 向量相似度搜索与 RAG 核心组件

## 📋 概述

向量存储负责存储和检索嵌入向量，是实现 RAG (检索增强生成) 的核心组件。

**源码位置**: `libs/langchain-core/src/vectorstores.ts`

## 🔑 VectorStore 接口

**源文件**: `libs/langchain-core/src/vectorstores.ts`

**代码规模**: ~3,500 行

```typescript
abstract class VectorStore extends Serializable {
  // ========== 抽象属性 ==========
  
  /**
   * Embeddings 实例
   */
  abstract embeddings: Embeddings;
  
  /**
   * 向量维度 (可选)
   */
  vectorDimension?: number;
  
  // ========== 抽象方法 ==========
  
  /**
   * 添加向量
   * @param vectors - 向量数组
   * @param documents - 对应文档
   * @param options - 可选配置
   * @returns 文档 ID 数组
   */
  abstract addVectors(
    vectors: number[][],
    documents: Document[],
    options?: AddVectorsOptions
  ): Promise<string[]>;
  
  /**
   * 添加文档 (自动嵌入)
   * @param documents - 文档数组
   * @param options - 可选配置
   * @returns 文档 ID 数组
   */
  abstract addDocuments(
    documents: Document[],
    options?: AddVectorsOptions
  ): Promise<string[]>;
  
  // ========== 搜索方法 ==========
  
  /**
   * 相似度搜索 (字符串查询)
   * @param query - 查询文本
   * @param k - 返回数量
   * @param filter - 过滤器
   * @returns 文档数组
   */
  async similaritySearch(
    query: string,
    k?: number,
    filter?: FilterType
  ): Promise<Document[]> {
    const results = await this.similaritySearchVectorWithScore(
      await this.embeddings.embedQuery(query),
      k,
      filter
    );
    return results.map(result => result[0]);
  }
  
  /**
   * 相似度搜索带分数
   * @param query - 查询文本
   * @param k - 返回数量
   * @param filter - 过滤器
   * @returns [文档，分数] 数组
   */
  async similaritySearchWithScore(
    query: string,
    k?: number,
    filter?: FilterType
  ): Promise<[Document, number][]> {
    return this.similaritySearchVectorWithScore(
      await this.embeddings.embedQuery(query),
      k,
      filter
    );
  }
  
  /**
   * 向量相似度搜索
   * @param query - 查询向量
   * @param k - 返回数量
   * @param filter - 过滤器
   * @returns [文档，分数] 数组
   */
  abstract similaritySearchVectorWithScore(
    query: number[],
    k?: number,
    filter?: FilterType
  ): Promise<[Document, number][]>;
  
  // ========== 删除方法 ==========
  
  /**
   * 删除文档
   */
  delete?(params: { ids?: string[]; filter?: FilterType }): Promise<void>;
  
  // ========== 检索器转换 ==========
  
  /**
   * 转换为检索器
   * @param options - 检索器配置
   */
  asRetriever(options?: VectorStoreRetrieverFields): VectorStoreRetriever<this>;
}
```

## 🏗️ 类层次结构

```
Serializable
    │
    └── VectorStore (抽象基类)
            │
            ├── 内存实现
            │   └── MemoryVectorStore
            │
            ├── 数据库实现
            │   ├── PineconeStore
            │   ├── Chroma
            │   ├── PGVectorStore
            │   ├── SupabaseVectorStore
            │   ├── RedisVectorStore
            │   ├── QdrantVectorStore
            │   └── ...
            │
            └── 云原生实现
                ├── AWSOpenSearchStore
                ├── AzureSearchVectorStore
                └── MongoDBAtlasVectorSearch
```

## 📊 核心实现详解

### 1. MemoryVectorStore

**源文件**: `libs/langchain/src/vectorstores/memory.ts`

最简单的内存实现，适合原型开发和测试。

```typescript
class MemoryVectorStore extends VectorStore {
  declare embeddings: Embeddings;
  
  /**
   * 内存存储
   */
  protected memoryVectors: MemoryVector[] = [];
  
  /**
   * 相似度计算方式
   */
  protected similarity: SimilarityFn;
  
  constructor(embeddings: Embeddings, dbConfig?: MemoryVectorStoreConfig) {
    super(embeddings, dbConfig);
    this.similarity = dbConfig?.similarity || cosineSimilarity;
  }
  
  // ========== 添加方法 ==========
  
  async addVectors(
    vectors: number[][],
    documents: Document[]
  ): Promise<string[]> {
    const ids: string[] = [];
    
    for (let i = 0; i < vectors.length; i++) {
      const id = uuidv4();
      ids.push(id);
      
      this.memoryVectors.push({
        id,
        vector: vectors[i],
        content: documents[i].pageContent,
        metadata: documents[i].metadata
      });
    }
    
    return ids;
  }
  
  async addDocuments(
    documents: Document[]
  ): Promise<string[]> {
    const texts = documents.map(({ pageContent }) => pageContent);
    return this.addVectors(
      await this.embeddings.embedDocuments(texts),
      documents
    );
  }
  
  // ========== 搜索方法 ==========
  
  async similaritySearchVectorWithScore(
    query: number[],
    k?: number,
    filter?: FilterType
  ): Promise<[Document, number][]> {
    // 1. 计算所有向量的相似度
    const filteredMemoryVectors = this._applyFilter(
      this.memoryVectors,
      filter
    );
    
    const searches: SimilaritySearch[] = filteredMemoryVectors
      .map(vector => ({
        vector,
        similarity: this.similarity(query, vector.vector)
      }));
    
    // 2. 排序取 Top K
    searches.sort((a, b) => b.similarity - a.similarity);
    const topK = searches.slice(0, k);
    
    // 3. 构建结果
    const results: [Document, number][] = topK.map(result => [
      new Document({
        pageContent: result.vector.content,
        metadata: result.vector.metadata
      }),
      result.similarity
    ]);
    
    return results;
  }
  
  // ========== 删除方法 ==========
  
  async delete(params: { ids?: string[] }): Promise<void> {
    if (params.ids) {
      this.memoryVectors = this.memoryVectors.filter(
        v => !params.ids?.includes(v.id)
      );
    }
  }
}
```

### 2. PinconeStore

**源文件**: `libs/langchain-pinecone/src/vectorstore.ts`

```typescript
class PineconeStore extends VectorStore {
  declare embeddings: OpenAIEmbeddings;
  
  private index: PineconeIndex;
  private namespace: string;
  
  constructor(embeddings: Embeddings, args: PineconeStoreArgs) {
    super(embeddings, args);
    this.index = args.pineconeIndex;
    this.namespace = args.namespace ?? '';
  }
  
  async addVectors(
    vectors: number[][],
    documents: Document[],
    options?: { ids?: string[] }
  ): Promise<string[]> {
    const ids = options?.ids?.length
      ? options.ids
      : vectors.map(() => uuidv4());
    
    // 构建 Pinecone 请求
    const records: Record<string, any>[] = vectors.map((vector, i) => ({
      id: ids[i],
      values: vector,
      metadata: {
        text: documents[i].pageContent,
        ...documents[i].metadata
      }
    }));
    
    // 批量上传
    await this.index.namespace(this.namespace).upsert(records);
    
    return ids;
  }
  
  async similaritySearchVectorWithScore(
    query: number[],
    k?: number,
    filter?: PineconeFilter
  ): Promise<[Document, number][]> {
    const index = this.index.namespace(this.namespace);
    
    const results = await index.query({
      vector: query,
      topK: k,
      filter,
      includeMetadata: true,
      includeValues: false
    });
    
    return results.matches.map(match => [
      new Document({
        pageContent: match.metadata?.text as string,
        metadata: this._extractMetadata(match.metadata)
      }),
      match.score ?? 0
    ]);
  }
}
```

### 3. Chroma

**源文件**: `libs/langchain-chroma/src/vectorstores.ts`

```typescript
class Chroma extends VectorStore {
  private collection: Collection;
  
  constructor(embeddings: Embeddings, args: ChromaLibArgs) {
    super(embeddings, args);
    this.collection = args.collection;
  }
  
  async addDocuments(
    documents: Document[],
    options?: { ids?: string[] }
  ): Promise<string[]> {
    const texts = documents.map(({ pageContent }) => pageContent);
    const embeddings = await this.embeddings.embedDocuments(texts);
    
    return this.addVectors(embeddings, documents, options);
  }
  
  async addVectors(
    vectors: number[][],
    documents: Document[],
    options?: { ids?: string[] }
  ): Promise<string[]> {
    const ids = options?.ids?.length
      ? options.ids
      : vectors.map(() => uuidv4());
    
    const metadatas = documents.map(d => d.metadata);
    const contents = documents.map(d => d.pageContent);
    
    await this.collection.add({
      ids,
      embeddings: vectors,
      metadatas,
      documents: contents
    });
    
    return ids;
  }
  
  async similaritySearchVectorWithScore(
    query: number[],
    k?: number,
    filter?: ChromaWhere
  ): Promise<[Document, number][]> {
    const results = await this.collection.query({
      queryEmbeddings: [query],
      nResults: k ?? 10,
      where: filter,
      include: ['metadatas', 'documents', 'distances']
    });
    
    return results.metadatas[0].map((metadata, i) => [
      new Document({
        pageContent: results.documents[0][i],
        metadata
      }),
      results.distances[0][i]
    ]);
  }
}
```

## 📝 使用示例

### 示例 1: 内存向量存储

```typescript
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';

const embeddings = new OpenAIEmbeddings();

// 创建存储
const vectorStore = new MemoryVectorStore(embeddings);

// 添加文档
const documents = [
  new Document({
    pageContent: 'LangChain 是 LLM 应用开发框架',
    metadata: { source: 'doc1' }
  }),
  new Document({
    pageContent: '支持多种向量数据库',
    metadata: { source: 'doc2' }
  })
];

await vectorStore.addDocuments(documents);

// 相似度搜索
const results = await vectorStore.similaritySearch(
  '什么是 LangChain?',
  2
);

console.log(results[0].pageContent);
```

### 示例 2: Pinecone 集成

```typescript
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';

const embeddings = new OpenAIEmbeddings();

// 初始化 Pinecone 客户端
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index('my-index');

// 创建存储
const vectorStore = await PineconeStore.fromExistingIndex(
  embeddings,
  {
    pineconeIndex: index,
    namespace: 'docs'
  }
);

// 搜索
const results = await vectorStore.similaritySearch(
  'LangChain 如何使用',
  5,
  { source: 'manual' }  // 过滤器
);
```

### 示例 3: Chroma 集成

```typescript
import { Chroma } from '@langchain/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';

const embeddings = new OpenAIEmbeddings();

// 连接到 Chroma (需要运行 Chroma 服务)
const vectorStore = await Chroma.fromExistingCollection(
  embeddings,
  {
    collectionName: 'my-documents',
    url: 'http://localhost:8000'
  }
);

// 搜索
const results = await vectorStore.similaritySearch(
  '查询内容',
  10,
  { source: { $eq: 'manual' } }
);
```

### 示例 4: 从文本创建

```typescript
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { CharacterTextSplitter } from '@langchain/textsplitters';

const embeddings = new OpenAIEmbeddings();
const splitter = new CharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200
});

const rawText = 'LangChain is a framework...';
const documents = await splitter.createDocuments([rawText]);

// 直接从文档创建向量存储
const vectorStore = await MemoryVectorStore.fromDocuments(
  documents,
  embeddings
);
```

### 示例 5: 作为检索器使用

```typescript
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';

const store = new MemoryVectorStore(new OpenAIEmbeddings());

// 转换为检索器
const retriever = store.asRetriever({
  k: 5,
  filter: async (doc) => doc.metadata.source === 'manual'
});

// 使用检索器
const docs = await retriever.invoke('LangChain 简介');
```

## 🔍 相似度计算

### 常见相似度算法

```typescript
// 余弦相似度
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] ** 2;
    magnitudeB += b[i] ** 2;
  }
  
  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

// 欧几里得距离
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

// 点积
function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}
```

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 选择合适的分块大小
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200
});

// 2. 添加元数据过滤
await store.similaritySearch(query, 5, { source: 'manual' });

// 3. 使用 asRetriever 简化代码
const retriever = store.asRetriever({ k: 5 });

// 4. 生产环境使用向量数据库
const store = await PineconeStore.fromExistingIndex(...);
```

### ❌ 不推荐

```typescript
// 1. 避免在内存中存储大量向量
const store = new MemoryVectorStore(); // 仅用于原型

// 2. 避免不添加元数据
await store.addDocuments([
  new Document({ pageContent: '...' })  // 没有 metadata
]);

// 3. 避免过大的 k 值
await store.similaritySearch(query, 1000); // 性能问题
```

---

**源码参考**: `libs/langchain-core/src/vectorstores.ts`