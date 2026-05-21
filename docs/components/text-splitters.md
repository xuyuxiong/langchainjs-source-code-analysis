# 文本分割器 (Text Splitters)

> 文档分块策略与实现详解

## 📋 概述

文本分割器将长文档分割成适合 LLM 处理的较小块 (chunks)，是 RAG 应用的关键组件。

**源码位置**: `libs/langchain-textsplitters/src/`

**文件数**: 15+ 个

## 🏗️ 类层次结构

```
Serializable
    │
    └── TextSplitter (抽象基类)
            │
            ├── 字符分割
            │   ├── CharacterTextSplitter
            │   └── RecursiveCharacterTextSplitter (推荐)
            │
            ├── Token 分割
            │   ├── TokenTextSplitter
            │   └── TokenizerTextSplitter
            │
            ├── 格式感知分割
            │   ├── MarkdownTextSplitter
            │   ├── MarkdownHeaderTextSplitter
            │   ├── PythonCodeTextSplitter
            │   └── LanguageTextSplitter (多语言代码)
            │
            └── 特殊分割
                ├── HTMLHeaderTextSplitter
                ├── LaTeXTextSplitter
                └── ...
```

## 🔑 TextSplitter 核心接口

**源文件**: `libs/langchain-textsplitters/src/base.ts`

```typescript
abstract class TextSplitter extends Serializable {
  /**
   * 分块大小
   */
  protected chunkSize = 1000;
  
  /**
   * 重叠大小
   */
  protected chunkOverlap = 200;
  
  /**
   * 是否保持分隔符
   */
  protected keepSeparator = false;
  
  /**
   * 自定义分隔函数
   */
  protected lengthFunction?: (text: string) => number;
  
  // ========== 抽象方法 ==========
  
  /**
   * 分割文本为块
   */
  abstract splitText(text: string): Promise<string[]>;
  
  // ========== 公共方法 ==========
  
  /**
   * 分割文档
   */
  async splitDocuments(
    documents: Document[]
  ): Promise<Document[]> {
    const texts: string[] = [];
    const metadatas: Record<string, any>[] = [];
    
    for (const doc of documents) {
      texts.push(doc.pageContent);
      metadatas.push(doc.metadata);
    }
    
    return this.createDocuments(texts, metadatas);
  }
  
  /**
   * 创建文档 (带元数据)
   */
  createDocuments(
    texts: string[],
    metadatas?: Record<string, any>[]
  ): Document[] {
    const docs: Document[] = [];
    
    texts.forEach((text, i) => {
      const metadata = metadatas?.[i] ?? {};
      
      this.splitText(text).forEach((chunk, j) => {
        const metadataCopy = { ...metadata };
        metadataCopy.loc = { 
          from: j,
          from_total: texts.length 
        };
        
        docs.push(
          new Document({
            pageContent: chunk,
            metadata: metadataCopy
          })
        );
      });
    });
    
    return docs;
  }
  
  // ========== 内部方法 ==========
  
  /**
   * 合并短块
   */
  protected mergeSplits(splits: string[], separator: string): string[] {
    const docs: string[] = [];
    const currentDoc: string[] = [];
    let total = 0;
    
    for (const d of splits) {
      const _len = this._lengthFunction(d);
      
      if (total + _len >= this.chunkSize) {
        if (total > this.chunkSize) {
          // 警告：单个块超出大小
          console.warn(
            `Created a chunk of size ${total}, which is longer than the specified ${this.chunkSize}`
          );
        }
        
        if (currentDoc.length > 0) {
          const doc = this.joinDocs(currentDoc, separator);
          if (doc !== null) {
            docs.push(doc);
          }
          currentDoc.length = 0;
          total = 0;
        }
      }
      
      currentDoc.push(d);
      total += _len;
    }
    
    const doc = this.joinDocs(currentDoc, separator);
    if (doc !== null) {
      docs.push(doc);
    }
    
    return docs;
  }
  
  /**
   * 连接文档 (处理重叠)
   */
  protected joinDocs(docs: string[], separator: string): string | null {
    let text = docs.join(separator);
    text = text.trim();
    return text === '' ? null : text;
  }
}
```

## 📊 分割器类型详解

### 1. CharacterTextSplitter

**源文件**: `libs/langchain-textsplitters/src/character.ts`

按字符分割，最简单的方式。

```typescript
class CharacterTextSplitter extends TextSplitter {
  /**
   * 分隔符
   */
  separator = '\n\n';
  
  /**
   * 是否保持分隔符
   */
  keepSeparator = false;
  
  async splitText(text: string): Promise<string[]> {
    // 1. 如果文本小于块大小，直接返回
    if (this._lengthFunction(text) < this.chunkSize) {
      return [text];
    }
    
    // 2. 使用分隔符分割
    const splits = text.split(this.separator);
    
    // 3. 合并短块
    return this.mergeSplits(splits, this.separator);
  }
}
```

### 2. RecursiveCharacterTextSplitter (推荐)

**源文件**: `libs/langchain-textsplitters/src/recursive_character.ts`

**最常用**的分割器，使用多级分隔符递归分割。

```typescript
class RecursiveCharacterTextSplitter extends TextSplitter {
  /**
   * 分隔符列表 (按优先级)
   */
  separators: string[] = ['\n\n', '\n', ' ', ''];
  
  /**
   * 是否保持分隔符
   */
  keepSeparator = false;
  
  async splitText(text: string): Promise<string[]> {
    const finalChunks: string[] = [];
    
    // 获取合适的分隔符
    let separator = this.separators[this.separators.length - 1];
    
    for (const s of this.separators) {
      if (s === '') {
        separator = s;
        break;
      }
      
      if (text.includes(s)) {
        separator = s;
        break;
      }
    }
    
    // 分割文本
    let splits = text.split(separator);
    
    // 如果分隔符在保持列表中，重新添加
    if (this.keepSeparator) {
      splits = splits.map((s, i) => {
        if (i === splits.length - 1) return s;
        return s + separator;
      });
    }
    
    // 递归处理每个分割
    for (const split of splits) {
      if (split.length === 0) continue;
      
      if (this._lengthFunction(split) <= this.chunkSize) {
        finalChunks.push(split);
      } else {
        // 递归分割
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: this.chunkSize,
          chunkOverlap: this.chunkOverlap,
          separators: this.separators.filter(s => s !== separator),
          keepSeparator: this.keepSeparator
        });
        
        const subSplits = await splitter.splitText(split);
        finalChunks.push(...subSplits);
      }
    }
    
    // 合并短块
    return this.mergeSplits(finalChunks, separator);
  }
}
```

### 3. TokenTextSplitter

**源文件**: `libs/langchain-textsplitters/src/tiktoken.ts`

基于 Token 计数分割，更精确控制输出大小。

```typescript
class TokenTextSplitter extends TextSplitter {
  /**
   * Encoder 类型
   */
  encodingName = 'gpt2';
  
  /**
   * 每块的 Token 数
   */
  chunkSize = 1000;
  
  /**
   * Token 重叠
   */
  chunkOverlap = 0;
  
  protected encoder?: Tiktoken;
  
  async splitText(text: string): Promise<string[]> {
    const encoder = await this.ensureEncoder();
    
    // 编码文本
    const tokens = encoder.encode(text);
    
    const splits: number[][] = [];
    let currentTokens: number[] = [];
    let currentLength = 0;
    
    for (const token of tokens) {
      const tokenLength = 1; // 每个 token 算 1
      
      if (currentLength + tokenLength > this.chunkSize && currentTokens.length > 0) {
        splits.push(currentTokens);
        currentTokens = [];
        currentLength = 0;
      }
      
      currentTokens.push(token);
      currentLength += tokenLength;
    }
    
    if (currentTokens.length > 0) {
      splits.push(currentTokens);
    }
    
    // 解码回文本
    return splits.map(tokens => encoder.decode(tokens));
  }
}
```

### 4. MarkdownTextSplitter

**源文件**: `libs/langchain-textsplitters/src/markdown.ts`

感知 Markdown 结构的分割器。

```typescript
class MarkdownTextSplitter extends RecursiveCharacterTextSplitter {
  constructor(fields?: Partial<MarkdownTextSplitterParams>) {
    super({
      ...fields,
      separators: this.getSeparatorsForMarkdown()
    });
  }
  
  private getSeparatorsForMarkdown(): string[] {
    return [
      // 标题
      '## ',
      '### ',
      '#### ',
      '##### ',
      '###### ',
      // 列表
      '- ',
      '* ',
      '+ ',
      '1. ',
      // 代码块
      '```',
      // 段落
      '\n\n',
      '\n',
      ' ',
      ''
    ];
  }
}
```

### 5. MarkdownHeaderTextSplitter

**源文件**: `libs/langchain-textsplitters/src/markdown_header.ts`

按 Markdown 标题分割，保留标题层级。

```typescript
class MarkdownHeaderTextSplitter {
  /**
   * 要分割的标题级别
   */
  headersToSplitOn: Array<{
    level: number;
    name: string;
  }>;
  
  /**
   * 是否返回每个块的元数据
   */
  returnEachLine = false;
  
  splitText(text: string): Document[] {
    const lines = text.split('\n');
    const docs: Document[] = [];
    
    const headerStack: { level: number; name: string; content: string }[] = [];
    let currentContent: string[] = [];
    
    for (const line of lines) {
      const headerMatch = this.getHeaderMatch(line);
      
      if (headerMatch) {
        // 保存之前的块
        if (currentContent.length > 0) {
          docs.push(this.createDoc(currentContent, headerStack));
          currentContent = [];
        }
        
        // 更新标题栈
        this.updateHeaderStack(headerStack, headerMatch);
      } else {
        currentContent.push(line);
      }
    }
    
    // 保存最后一个块
    if (currentContent.length > 0) {
      docs.push(this.createDoc(currentContent, headerStack));
    }
    
    return docs;
  }
  
  private createDoc(
    content: string[],
    headerStack: any[]
  ): Document {
    const metadata: Record<string, string> = {};
    
    headerStack.forEach(h => {
      metadata[h.name] = h.content;
    });
    
    return new Document({
      pageContent: content.join('\n'),
      metadata
    });
  }
}
```

## 📝 使用示例

### 示例 1: 基础分割

```typescript
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,      // 每块 1000 字符
  chunkOverlap: 200     // 重叠 200 字符
});

const text = 'Long document content...';
const chunks = await splitter.splitText(text);

console.log(`Split into ${chunks.length} chunks`);
```

### 示例 2: 分割文档

```typescript
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/core/document_loaders/fs/pdf';

// 加载文档
const loader = new PDFLoader('./data/report.pdf');
const docs = await loader.load();

// 分割
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200
});

const splitDocs = await splitter.splitDocuments(docs);

console.log(`Created ${splitDocs.length} chunks`);
```

### 示例 3: Markdown 分割

```typescript
import { MarkdownTextSplitter } from '@langchain/textsplitters';

const splitter = new MarkdownTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50
});

const markdown = `
# Chapter 1

## Section 1.1

Content for section 1.1...

## Section 1.2

Content for section 1.2...
`;

const chunks = await splitter.splitText(markdown);
```

### 示例 4: 按标题分割

```typescript
import { MarkdownHeaderTextSplitter } from '@langchain/textsplitters';

const splitter = new MarkdownHeaderTextSplitter({
  headersToSplitOn: [
    { level: 1, name: 'Header 1' },
    { level: 2, name: 'Header 2' },
    { level: 3, name: 'Header 3' }
  ]
});

const markdown = `
# Main Title

Some content here.

## Subsection

More content.

### Sub-subsection

Detailed content.
`;

const docs = await splitter.splitText(markdown);

// 每个文档都有标题元数据
docs.forEach(doc => {
  console.log(doc.metadata);
  // { 'Header 1': 'Main Title', 'Header 2': 'Subsection', ... }
});
```

### 示例 5: Token 计数分割

```typescript
import { TokenTextSplitter } from '@langchain/textsplitters';

const splitter = new TokenTextSplitter({
  encodingName: 'cl100k_base',  // GPT-4 tokenizer
  chunkSize: 512,
  chunkOverlap: 0
});

const text = 'Long text content...';
const chunks = await splitter.splitText(text);

console.log(`Split into ${chunks.length} token-based chunks`);
```

### 示例 6: 代码分割

```typescript
import { Language } from '@langchain/textsplitters';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// Python 代码分割
const pythonSplitter = RecursiveCharacterTextSplitter.fromLanguage(
  Language.Python,
  { chunkSize: 1000, chunkOverlap: 200 }
);

// JavaScript 代码分割
const jsSplitter = RecursiveCharacterTextSplitter.fromLanguage(
  Language.JavaScript,
  { chunkSize: 1000, chunkOverlap: 200 }
);

const code = `
def hello():
    print("Hello, World!")

class MyClass:
    pass
`;

const chunks = await pythonSplitter.splitText(code);
```

### 示例 7: RAG 管道

```typescript
import { PDFLoader } from '@langchain/core/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';

// 1. 加载 PDF
const loader = new PDFLoader('./data/report.pdf');
const docs = await loader.load();

// 2. 分割文档
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200
});

const splitDocs = await splitter.splitDocuments(docs);

// 3. 创建向量存储
const vectorStore = await MemoryVectorStore.fromDocuments(
  splitDocs,
  new OpenAIEmbeddings()
);

// 4. 检索
const results = await vectorStore.similaritySearch(
  '查询内容',
  5
);
```

## 🔍 分割策略选择

| 分割器类型 | 适用场景 | 精度 | 速度 |
|-----------|---------|------|------|
| **RecursiveCharacter** | 通用文本 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Character** | 简单文本 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **TokenText** | Token 敏感场景 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **MarkdownText** | Markdown 文档 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **MarkdownHeader** | 结构化 Markdown | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Language** | 代码文件 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 使用 RecursiveCharacterTextSplitter 作为默认选择
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200
});

// 2. 对于 Markdown 使用 MarkdownHeaderTextSplitter
const splitter = new MarkdownHeaderTextSplitter({
  headersToSplitOn: [
    { level: 1, name: 'Title' },
    { level: 2, name: 'Section' }
  ]
});

// 3. 添加重叠以保持上下文连续性
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200  // ✅ 20% 重叠
});

// 4. 保留元数据
splitDocs.forEach((doc, i) => {
  doc.metadata.chunkIndex = i;
});
```

### ❌ 不推荐

```typescript
// 1. 避免 chunkOverlap = 0
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 0  // ❌ 可能丢失上下文
});

// 2. 避免过大的 chunkSize
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 10000  // ❌ 可能超出 LLM 上下文
});

// 3. 避免忽略文档类型
// Markdown 文档应该使用 MarkdownTextSplitter 而不是通用的
```

---

**源码参考**: `libs/langchain-textsplitters/src/`