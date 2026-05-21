# 嵌入模型 (Embeddings)

> 文本向量化接口与实现详解

## 📋 概述

嵌入模型负责将文本转换为向量表示，是向量搜索、RAG 等应用的基础。

**源码位置**: `libs/langchain-core/src/embeddings.ts`

## 🔑 Embeddings 接口

**源文件**: `libs/langchain-core/src/embeddings.ts`

```typescript
interface Embeddings {
  /**
   * 嵌入单个查询/文档
   * @param document - 要嵌入的文本
   * @returns 向量数组 (浮点数)
   */
  embedQuery(document: string): Promise<number[]>;
  
  /**
   * 批量嵌入多个文档
   * @param documents - 要嵌入的文本数组
   * @returns 向量数组的数组
   */
  embedDocuments(documents: string[]): Promise<number[][]>;
}
```

## 🏗️ 实现架构

```
Embeddings (接口)
    │
    └── Embeddings (类实现)
            │
            ├── 提供商实现
            │   ├── OpenAIEmbeddings
            │   ├── CohereEmbeddings
            │   ├── HuggingFaceEmbeddings
            │   ├── GoogleGenerativeAIEmbeddings
            │   └── ...
            │
            └── 本地实现
                ├── TFHubEmbeddings
                └── OllamaEmbeddings
```

## 📊 核心实现详解

### 1. OpenAIEmbeddings

**源文件**: `libs/langchain/src/embeddings/openai.ts`

```typescript
import { Embeddings, type EmbeddingsParams } from '@langchain/core/embeddings';

class OpenAIEmbeddings extends Embeddings {
  /**
   * 模型名称
   */
  modelName = 'text-embedding-ada-002';
  
  /**
   * 模型名称 (兼容)
   */
  model = 'text-embedding-ada-002';
  
  /**
   * OpenAI API 基础 URL
   */
  azureOpenAIEndpoint?: string;
  
  /**
   * 批次大小
   */
  batchSize = 512;
  
  /**
   * 最大并发请求数
   */
  maxConcurrency = 16;
  
  /**
   * 最大重试次数
   */
  maxRetries = 3;
  
  // ========== 核心方法 ==========
  
  async embedDocuments(texts: string[]): Promise<number[][]> {
    // 1. 批次处理
    const batches = this._constructBatches(texts);
    
    // 2. 并发请求
    const batchResponses = await asyncPool(
      this.maxConcurrency,
      batches,
      batch => this._embedWithRetry(batch)
    );
    
    // 3. 合并结果
    return batchResponses.flat();
  }
  
  async embedQuery(text: string): Promise<number[]> {
    const result = await this.embedDocuments([text]);
    return result[0];
  }
  
  // ========== 内部方法 ==========
  
  protected async _embedWithRetry(
    texts: string[]
  ): Promise<number[][]> {
    const response = await this.caller.call(async () => {
      const res = await this.client.embeddings.create({
        model: this.modelName,
        input: texts,
        encoding_format: 'float'
      });
      return res.data;
    });
    
    return response.map(item => item.embedding);
  }
  
  private _constructBatches(texts: string[]): string[][] {
    // 按 batchSize 分组
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      batches.push(texts.slice(i, i + this.batchSize));
    }
    return batches;
  }
}
```

### 2. CohereEmbeddings

**源文件**: `libs/langchain-cohere/src/embeddings.ts`

```typescript
class CohereEmbeddings extends Embeddings {
  model = 'embed-english-v3.0';
  
  /**
   * 输入类型 (用于区分查询和文档)
   */
  inputType = 'search_document';
  
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const response = await this.client.embed({
      texts,
      model: this.model,
      input_type: this.inputType,
      embedding_types: ['float']
    });
    
    return response.embeddings.float;
  }
  
  async embedQuery(text: string): Promise<number[]> {
    const response = await this.client.embed({
      texts: [text],
      model: this.model,
      input_type: 'search_query',  // 查询类型
      embedding_types: ['float']
    });
    
    return response.embeddings.float[0];
  }
}
```

### 3. GoogleGenerativeAIEmbeddings

**源文件**: `libs/langchain-google-genai/src/embeddings.ts`

```typescript
class GoogleGenerativeAIEmbeddings extends Embeddings {
  model = 'text-embedding-004';
  
  /**
   * 任务类型
   */
  taskType: 'retrieval_document' | 'retrieval_query' | 
            'semantic_similarity' | 'classification' | 'clustering';
  
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const result = await this.client.embedContent({
        model: this.model,
        content: { parts: [{ text }] },
        taskType: this.taskType
      });
      
      embeddings.push(result.embedding.values);
    }
    
    return embeddings;
  }
  
  async embedQuery(text: string): Promise<number[]> {
    const result = await this.client.embedContent({
      model: this.model,
      content: { parts: [{ text }] },
      taskType: 'retrieval_query'
    });
    
    return result.embedding.values;
  }
}
```

## 🔧 配置选项

### EmbeddingsParams

```typescript
interface EmbeddingsParams {
  /**
   * 回调处理器
   */
  callbacks?: Callbacks;
  
  /**
   * 标签
   */
  tags?: string[];
  
  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}
```

### 提供商特定选项 (OpenAI 示例)

```typescript
interface OpenAIEmbeddingsInput extends EmbeddingsParams {
  /**
   * API Key
   */
  apiKey?: string;
  
  /**
   * 模型名称
   */
  modelName?: string;
  
  /**
   * 批次大小
   */
  batchSize?: number;
  
  /**
   * 超时 (毫秒)
   */
  timeout?: number;
  
  /**
   * 最大重试次数
   */
  maxRetries?: number;
  
  /**
   * 请求者配置
   */
  callerOptions?: AsyncCallerParams;
}
```

## 📝 使用示例

### 示例 1: 基础使用

```typescript
import { OpenAIEmbeddings } from '@langchain/openai';

const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-ada-002',
  batchSize: 512
});

// 嵌入单个查询
const queryVector = await embeddings.embedQuery(
  'What is LangChain?'
);
console.log(queryVector.length); // 1536 (Ada 模型)

// 嵌入多个文档
const docVectors = await embeddings.embedDocuments([
  'LangChain is a framework...',
  'It helps build LLM applications...',
  'Supports multiple providers...'
]);
console.log(docVectors.length); // 3
console.log(docVectors[0].length); // 1536
```

### 示例 2: 批量处理优化

```typescript
import { OpenAIEmbeddings } from '@langchain/openai';

const embeddings = new OpenAIEmbeddings({
  batchSize: 100,      // 每批 100 个文档
  maxConcurrency: 5,   // 最多 5 个并发请求
  maxRetries: 3        // 失败重试 3 次
});

// 批量处理大量文档
const documents = await loadDocuments(); // 1000+ 文档
const vectors = await embeddings.embedDocuments(documents);
```

### 示例 3: 自定义 Embeddings

```typescript
import { Embeddings } from '@langchain/core/embeddings';

class CustomEmbeddings extends Embeddings {
  async embedQuery(document: string): Promise<number[]> {
    // 使用自定义模型
    const response = await fetch('http://localhost:8000/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: document })
    });
    
    const data = await response.json();
    return data.embedding;
  }
  
  async embedDocuments(documents: string[]): Promise<number[][]> {
    // 批量处理
    return Promise.all(
      documents.map(doc => this.embedQuery(doc))
    );
  }
}
```

### 示例 4: 与 VectorStore 集成

```typescript
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from '@langchain/core/documents';

const embeddings = new OpenAIEmbeddings();

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

// 创建向量存储 (自动调用 embeddings.embedDocuments)
const vectorStore = await MemoryVectorStore.fromDocuments(
  documents,
  embeddings
);

// 相似度搜索 (自动调用 embeddings.embedQuery)
const results = await vectorStore.similaritySearch(
  '什么是 LangChain?',
  2
);
```

### 示例 5: 不同场景的 Embeddings

```typescript
import { CohereEmbeddings } from '@langchain/cohere';

// 文档嵌入 (用于存储)
const docEmbeddings = new CohereEmbeddings({
  model: 'embed-english-v3.0',
  inputType: 'search_document'
});

// 查询嵌入 (用于检索)
const queryEmbeddings = new CohereEmbeddings({
  model: 'embed-english-v3.0',
  inputType: 'search_query'
});

// 分别使用
const docVector = await docEmbeddings.embedQuery(document);
const queryVector = await queryEmbeddings.embedQuery(query);
```

## 📊 性能优化

### 1. 批次处理

```typescript
// ✅ 推荐：批量处理
const vectors = await embeddings.embedDocuments(largeTextArray);

// ❌ 不推荐：逐个处理
const vectors = await Promise.all(
  largeTextArray.map(text => embeddings.embedQuery(text))
);
```

### 2. 并发控制

```typescript
const embeddings = new OpenAIEmbeddings({
  batchSize: 100,      // 批次大小
  maxConcurrency: 5    // 最大并发数
});

// 内部会自动分批和并发处理
```

### 3. 缓存优化

```typescript
import { CacheBackedEmbeddings } from 'langchain/embeddings/cache_backed';
import { InMemoryStore } from '@langchain/core/stores';

const underlyingEmbeddings = new OpenAIEmbeddings();
const store = new InMemoryStore();

const cachedEmbeddings = CacheBackedEmbeddings.fromBytesStore(
  underlyingEmbeddings,
  store
);

// 初次调用会计算并缓存
const vector1 = await cachedEmbeddings.embedQuery('text');

// 重复调用会直接返回缓存结果
const vector2 = await cachedEmbeddings.embedQuery('text');
```

## 🔍 常见问题

### 1. Token 限制

```typescript
// OpenAI 嵌入模型有 Token 限制
// text-embedding-ada-002: 最大 8191 tokens

import { CharacterTextSplitter } from '@langchain/textsplitters';

const splitter = new CharacterTextSplitter({
  chunkSize: 8000,  // 预留余量
  chunkOverlap: 200
});

const chunks = await splitter.splitText(longDocument);

// 分批嵌入
const vectors = await embeddings.embedDocuments(chunks);
```

### 2. 错误处理

```typescript
try {
  const vectors = await embeddings.embedDocuments(documents);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // 处理速率限制
    await sleep(1000);
    // 重试
  } else if (error.message.includes('api_key')) {
    // 处理认证错误
    console.error('Invalid API key');
  } else {
    // 其他错误
    throw error;
  }
}
```

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 选择合适的模型
const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-large'  // 高质量
});

// 2. 使用批次处理
const vectors = await embeddings.embedDocuments(documents);

// 3. 添加缓存
const cached = CacheBackedEmbeddings.fromBytesStore(...);

// 4. 区分查询和文档类型 (Cohere)
const queryEmbeddings = new CohereEmbeddings({
  inputType: 'search_query'
});
```

### ❌ 不推荐

```typescript
// 1. 避免逐个嵌入大量文档
documents.map(doc => embeddings.embedQuery(doc));

// 2. 避免不处理错误
await embeddings.embedDocuments(docs);

// 3. 避免忽略 Token 限制
await embeddings.embedQuery(veryLongText);
```

---

**源码参考**: `libs/langchain-core/src/embeddings.ts`