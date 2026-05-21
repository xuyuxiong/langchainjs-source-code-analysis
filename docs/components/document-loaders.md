# 文档加载器 (Document Loaders)

> 从各种数据源加载和解析文档

## 📋 概述

文档加载器负责从不同数据源 (文件、URL、数据库等) 加载数据，并将其转换为 Document 对象供后续处理。

**源码位置**: `libs/langchain-core/src/document_loaders/`

**文件数**: 10+ 个 (core) + 50+ 个 (langchain 和 providers)

## 🏗️ 类层次结构

```
Serializable
    │
    └── BaseDocumentLoader
            │
            ├── 文件类加载器
            │   ├── TextLoader (纯文本)
            │   ├── CSVLoader (CSV 文件)
            │   ├── JSONLoader (JSON 数据)
            │   ├── PDFLoader (PDF 文档)
            │   └── DocxLoader (Word 文档)
            │
            ├── Web 类加载器
            │   ├── WebBaseLoader (网页爬取)
            │   └── CheerioWebBaseLoader (HTML 解析)
            │
            ├── 数据库类加载器
            │   ├── NotionDBLoader (Notion 数据库)
            │   ├── AirbyteLoader (Airbyte)
            │   └── ...
            │
            └── 云存储类加载器
                ├── S3Loader (AWS S3)
                ├── GitHubLoader (GitHub 仓库)
                └── ...
```

## 🔑 BaseDocumentLoader 核心接口

**源文件**: `libs/langchain-core/src/document_loaders/base.ts`

```typescript
abstract class BaseDocumentLoader extends Serializable {
  
  /**
   * 加载并返回文档列表
   */
  abstract load(): Promise<Document[]>;
  
  /**
   * 加载并流式返回文档
   */
  async *loadAsStreamAndDocuments(): AsyncGenerator<Document> {
    const documents = await this.load();
    for (const doc of documents) {
      yield doc;
    }
  }
}
```

## 📊 常用加载器详解

### 1. TextLoader

**源文件**: `libs/langchain/src/document_loaders/fs/text.ts`

加载纯文本文件。

```typescript
import { Document } from '@langchain/core/documents';
import { BaseDocumentLoader } from '@langchain/core/document_loaders/base';

class TextLoader extends BaseDocumentLoader {
  constructor(public filePathOrBlob: string | Blob) {
    super();
  }
  
  protected async parse(raw: string): Promise<string> {
    return raw;
  }
  
  async load(): Promise<Document[]> {
    let text: string;
    let metadata: Record<string, string>;
    
    if (typeof this.filePathOrBlob === 'string') {
      // 从文件读取
      text = await fs.readFile(this.filePathOrBlob, 'utf-8');
      metadata = { source: this.filePathOrBlob };
    } else {
      // 从 Blob 读取
      text = await this.filePathOrBlob.text();
      metadata = { source: 'blob' };
    }
    
    const parsed = await this.parse(text);
    
    return [
      new Document({
        pageContent: parsed,
        metadata
      })
    ];
  }
}
```

### 2. CSVLoader

**源文件**: `libs/langchain/src/document_loaders/fs/csv.ts`

加载 CSV 文件，每行转换为一个 Document。

```typescript
class CSVLoader extends BaseDocumentLoader {
  constructor(
    public filePathOrBlob: string | Blob,
    public options?: {
      column?: string;        // 指定列作为内容
      separator?: string;     // 分隔符 (默认 ,)
    }
  ) {
    super();
  }
  
  async load(): Promise<Document[]> {
    const text = await this.getText();
    const records = await this.parseCSV(text);
    
    return records.map(record => {
      let pageContent: string;
      
      if (this.options?.column) {
        // 使用指定列
        pageContent = record[this.options.column];
      } else {
        // 合并所有列
        pageContent = Object.entries(record)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
      }
      
      return new Document({
        pageContent,
        metadata: { ...record, source: this.source }
      });
    });
  }
  
  private async parseCSV(text: string): Promise<Record<string, string>[]> {
    // CSV 解析逻辑
    // 支持引号、转义等
  }
}
```

### 3. PDFLoader

**源文件**: `libs/langchain/src/document_loaders/fs/pdf.ts`

加载 PDF 文件，支持多种解析器。

```typescript
class PDFLoader extends BaseDocumentLoader {
  constructor(
    public filePathOrBlob: string | Blob,
    public options?: {
      splitPages?: boolean;    // 每页分割为独立文档
      pdfjs?: () => Promise<typeof pdfjsLib>; // PDF.js
    }
  ) {
    super();
  }
  
  async load(): Promise<Document[]> {
    const pdfjs = await this.getPDFJS();
    const pdf = await pdfjs.getDocument(this.arrayBuffer).promise;
    
    const documents: Document[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join('');
      
      documents.push(
        new Document({
          pageContent: text,
          metadata: {
            source: this.source,
            pdf: {
              version: pdf.pdfInfo.version,
              info: pdf.pdfInfo.info,
              metadata: pdf.metadata,
              totalPages: pdf.numPages
            },
            loc: {
              pageNumber: i
            }
          }
        })
      );
    }
    
    return documents;
  }
}
```

### 4. WebBaseLoader

**源文件**: `libs/langchain/src/document_loaders/web/base.ts`

加载网页内容。

```typescript
class WebBaseLoader extends BaseDocumentLoader {
  protected webPaths: string[];
  protected timeouts?: number | [number, number];
  protected continueOnFailure?: boolean;
  protected headerOptions?: Record<string, string>;
  
  constructor(webPath: string | string[]) {
    super();
    this.webPaths = Array.isArray(webPath) ? webPath : [webPath];
  }
  
  async load(): Promise<Document[]> {
    const documents: Document[] = [];
    
    for (const path of this.webPaths) {
      try {
        const response = await fetch(path, {
          headers: this.headerOptions
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${path}: ${response.status}`);
        }
        
        const text = await response.text();
        
        documents.push(
          new Document({
            pageContent: this.extractText(text),
            metadata: { source: path }
          })
        );
      } catch (e) {
        if (this.continueOnFailure) {
          continue;
        } else {
          throw e;
        }
      }
    }
    
    return documents;
  }
  
  protected extractText(html: string): string {
    // 使用 cheerio 等解析 HTML
    const $ = cheerio.load(html);
    return $('body').text();
  }
}
```

### 5. NotionDBLoader

**源文件**: `libs/langchain/src/document_loaders/web/notiondb.ts`

从 Notion 数据库加载数据。

```typescript
class NotionDBLoader extends BaseDocumentLoader {
  constructor(
    protected notionIntegrationToken: string,
    protected notionDbId: string,
    protected client?: Client
  ) {
    super();
  }
  
  async load(): Promise<Document[]> {
    const pages = await this.fetchAllPages();
    
    return pages.map(page => {
      const properties = page.properties;
      let pageContent = '';
      
      // 构建页面内容
      for (const [key, value] of Object.entries(properties)) {
        pageContent += `${key}: ${this.formatProperty(value)}\n`;
      }
      
      return new Document({
        pageContent,
        metadata: {
          id: page.id,
          url: page.url,
          created_time: page.created_time,
          last_edited_time: page.last_edited_time
        }
      });
    });
  }
  
  private async fetchAllPages(): Promise<PageObjectResponse[]> {
    const pages: PageObjectResponse[] = [];
    let cursor: string | undefined = undefined;
    
    do {
      const response = await this.client.databases.query({
        database_id: this.notionDbId,
        start_cursor: cursor
      });
      
      pages.push(...response.results as PageObjectResponse[]);
      cursor = response.next_cursor ?? undefined;
    } while (cursor);
    
    return pages;
  }
}
```

## 📝 使用示例

### 示例 1: 加载文本文件

```typescript
import { TextLoader } from '@langchain/core/document_loaders/fs/text';

// 从文件路径
const loader = new TextLoader('./data/sample.txt');
const docs = await loader.load();

console.log(docs[0].pageContent);
console.log(docs[0].metadata); // { source: './data/sample.txt' }

// 从 Blob (浏览器环境)
const blob = new Blob(['Hello, World!']);
const loader = new TextLoader(blob);
const docs = await loader.load();
```

### 示例 2: 加载 CSV 文件

```typescript
import { CSVLoader } from '@langchain/core/document_loaders/fs/csv';

// 加载所有列
const loader = new CSVLoader('./data/users.csv');
const docs = await loader.load();
// 每个 doc 的 content: "name: John\nage: 25\ncity: New York"

// 指定单列
const loader = new CSVLoader('./data/users.csv', {
  column: 'name'
});
const docs = await loader.load();
// 每个 doc 的 content: "John"

// 自定义分隔符
const loader = new CSVLoader('./data/users.tsv', {
  separator: '\t'
});
```

### 示例 3: 加载 PDF 文件

```typescript
import { PDFLoader } from '@langchain/core/document_loaders/fs/pdf';

// 默认：每页分割
const loader = new PDFLoader('./data/document.pdf');
const docs = await loader.load();
// docs.length = PDF 页数

// 合并所有页
const loader = new PDFLoader('./data/document.pdf', {
  splitPages: false
});
const docs = await loader.load();
// docs.length = 1
```

### 示例 4: 加载网页

```typescript
import { WebBaseLoader } from '@langchain/core/document_loaders/web/base';

// 单页面
const loader = new WebBaseLoader('https://example.com');
const docs = await loader.load();

// 多页面
const loader = new WebBaseLoader([
  'https://example.com/page1',
  'https://example.com/page2',
  'https://example.com/page3'
]);
const docs = await loader.load();

// 带超时和重试
const loader = new WebBaseLoader('https://example.com', {
  timeouts: [5000, 10000],  // [初始超时，最大超时]
  continueOnFailure: false
});
```

### 示例 5: 批量加载

```typescript
import { CSVLoader } from '@langchain/core/document_loaders/fs/csv';
import { PDFLoader } from '@langchain/core/document_loaders/fs/pdf';
import { TextLoader } from '@langchain/core/document_loaders/fs/text';

const loaders = [
  new CSVLoader('./data/users.csv'),
  new PDFLoader('./data/report.pdf'),
  new TextLoader('./data/notes.txt')
];

// 并行加载
const allDocs = await Promise.all(
  loaders.map(loader => loader.load())
);

// 扁平化合并
const docs = allDocs.flat();
```

### 示例 6: 与文本分割器配合

```typescript
import { PDFLoader } from '@langchain/core/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// 加载 PDF
const loader = new PDFLoader('./data/long_report.pdf');
const docs = await loader.load();

// 分割文本
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200
});

const splitDocs = await splitter.splitDocuments(docs);

console.log(`Loaded ${splitDocs.length} chunks`);
```

### 示例 7: 流式加载

```typescript
import { WebBaseLoader } from '@langchain/core/document_loaders/web/base';

const loader = new WebBaseLoader('https://example.com/large-document');

// 流式处理大文档
for await (const doc of loader.loadAsStreamAndDocuments()) {
  // 逐文档处理，无需等待所有加载完成
  await processDocument(doc);
}
```

## 🔧 高级用法

### 1. 自定义加载器

```typescript
import { BaseDocumentLoader, Document } from '@langchain/core';

class CustomAPILoader extends BaseDocumentLoader {
  constructor(
    private apiUrl: string,
    private apiKey: string
  ) {
    super();
  }
  
  async load(): Promise<Document[]> {
    const response = await fetch(this.apiUrl, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    
    const data = await response.json();
    
    return data.items.map((item: any) => new Document({
      pageContent: item.content,
      metadata: {
        id: item.id,
        url: item.url,
        publishedAt: item.published_at
      }
    }));
  }
}

// 使用
const loader = new CustomAPILoader(
  'https://api.example.com/articles',
  process.env.API_KEY
);
```

### 2. 带元数据过滤

```typescript
import { PDFLoader } from '@langchain/core/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const loader = new PDFLoader('./data/report.pdf');
const docs = await loader.load();

// 过滤元数据
const filtered = docs.filter(doc => 
  doc.metadata.pageNumber > 10
);

// 分割
const splitter = new RecursiveCharacterTextSplitter();
const chunks = await splitter.splitDocuments(filtered);
```

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 使用适当的加载器类型
const loader = new PDFLoader('./data.pdf'); // ✅
// 而不是手动读文件再解析

// 2. 处理大文件时流式加载
for await (const doc of loader.loadAsStreamAndDocuments()) {
  process(doc);
}

// 3. 添加错误处理
try {
  const docs = await loader.load();
} catch (e) {
  console.error('Failed to load:', e);
}

// 4. 使用 Document 的 metadata 存储元数据
new Document({
  pageContent: '...',
  metadata: { source: '...', page: 1 }
});
```

### ❌ 不推荐

```typescript
// 1. 避免加载过大的文件不分块
const loader = new PDFLoader('./huge.pdf');
const docs = await loader.load(); // 可能内存溢出

// 应该分割
const splitter = new RecursiveCharacterTextSplitter();

// 2. 避免忽略元数据
new Document({ pageContent: '...' }); // 没有 metadata

// 3. 避免硬编码路径
const loader = new TextLoader('./data.txt'); // 硬编码
const loader = new TextLoader(process.env.DATA_PATH); // ✅
```

---

**源码参考**: `libs/langchain-core/src/document_loaders/` + `libs/langchain/src/document_loaders/`