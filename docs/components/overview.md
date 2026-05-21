# LangChainJS 核心组件总览

> 60+ 核心抽象，构建 LLM 应用的基石

## 📋 组件分类

LangChainJS 的组件按功能分为以下几大类：

```
┌─────────────────────────────────────────────────────────────┐
│                    LangChainJS 核心组件                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  语言模型        │  │  提示工程        │                │
│  │  ────────────    │  │  ──────────────  │                │
│  │  • BaseLLM       │  │  • PromptTemplate │               │
│  │  • BaseChatModel │  │  • ChatPrompt     │               │
│  │  • LLM (传统)     │  │  • FewShotPrompt  │               │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  消息系统        │  │  输出解析        │                │
│  │  ────────────    │  │  ──────────────  │                │
│  │  • HumanMessage  │  │  • BaseParser    │                │
│  │  • AIMessage     │  │  • JsonParser    │                │
│  │  • SystemMessage │  │  • XmlParser     │                │
│  │  • ToolMessage   │  │  • Structured    │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  嵌入与向量      │  │  检索系统        │                │
│  │  ────────────    │  │  ──────────────  │                │
│  │  • Embeddings    │  │  • Retriever     │                │
│  │  • VectorStore   │  │  • BM25Retriever │                │
│  │  • Document      │  │  • ParentDoc     │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Agent 系统       │  │  工具与记忆      │                │
│  │  ────────────    │  │  ──────────────  │                │
│  │  • Agent         │  │  • Tool          │                │
│  │  • AgentExecutor │  │  • BaseMemory    │                │
│  │  • ReAct Agent   │  │  • BufferMemory  │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  文档处理        │  │  回调与追踪      │                │
│  │  ────────────    │  │  ──────────────  │                │
│  │  • DocLoader     │  │  • CallbackMgr   │                │
│  │  • TextSplitter  │  │  • Tracer        │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📊 组件统计

| 分类 | 核心抽象数 | 源文件数 | 代码行数 |
|------|-----------|---------|---------|
| **语言模型** | 4 | 8 | ~3,000 |
| **消息系统** | 8 | 19 | ~4,000 |
| **提示模板** | 6 | 15 | ~3,500 |
| **输出解析** | 8 | 12 | ~2,000 |
| **嵌入与向量** | 3 | 20 | ~4,000 |
| **Agent 系统** | 5 | 15 | ~3,500 |
| **工具与记忆** | 6 | 12 | ~2,500 |
| **文档处理** | 6 | 16 | ~3,500 |
| **回调追踪** | 10 | 18 | ~4,500 |
| **总计** | **56+** | **~135** | **~30,500** |

## 🏗️ 核心抽象层次

```
┌─────────────────────────────────────────────────────────────┐
│                    Serializable (基类)                       │
│  • lc_id, lc_namespace, lc_name                            │
│  • toDict(), fromDict()                                    │
│  • toJSON(), fromJSON()                                    │
└────────────┬────────────────────────────────────────────────┘
             │ 继承
             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Runnable (接口)                          │
│  • invoke(), stream(), batch()                             │
│  • pipe(), bind(), withConfig()                            │
└────┬────────────────────────────────────────────────────────┘
     │ 实现
     ├─────────────────┬─────────────────┬─────────────────┐
     ▼                 ▼                 ▼                 ▼
┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐
│Prompts   │  │Language      │  │Output        │  │Retrievers  │
│          │  │Models        │  │Parsers       │  │            │
│• Prompt  │  │• BaseLLM     │  │• BaseParser  │  │• Retriever │
│Template  │  │• BaseChat    │  │• String      │  │• Vector -  │
│• Chat-   │  │  Model       │  │  Parser      │  │  Store     │
│  Prompt  │  │              │  │• JsonParser  │  │            │
└──────────┘  └──────────────┘  └──────────────┘  └────────────┘
```

## 🔑 组件详解

### 1. 语言模型 (Language Models)

**源码**: `libs/langchain-core/src/language_models/`

```
BaseLanguageModel<MessageLike, MessageChunkLike, ModelCallOptions>
    │
    ├── BaseLLM (传统 LLM - 完成 API)
    │       │
    │       └── 提供商实现：OpenAI, Cohere, AI21...
    │
    └── BaseChatModel (聊天模型 - 对话 API)
            │
            └── 提供商实现:ChatOpenAI, ChatAnthropic, ChatGoogle...
```

**核心方法**:
```typescript
interface BaseLanguageModel<Input, Output, CallOptions> {
  // 生成响应
  generate(prompts: string[], options?: CallOptions): Promise<LLMResult>;
  
  // 带上下文的生成
  predict(text: string, options?: CallOptions): Promise<string>;
  predictMessages(messages: BaseMessage[], options?: CallOptions): Promise<BaseMessage>;
  
  // 工具调用
  withStructuredOutput<Output>(schema: ZodSchema): Output;
  
  // 流式
  stream(messages: BaseMessage[]): AsyncIterable<AIMessageChunk>;
}
```

### 2. 消息系统 (Messages)

**源码**: `libs/langchain-core/src/messages/`

```
BaseMessage
    │
    ├── BaseMessageChunk (可流式分块)
    │
    ├── HumanMessage (用户消息)
    │       └─ role: "user"
    │
    ├── AIMessage (AI 回复)
    │       ├─ tool_calls?: ToolCall[]
    │       ├─ usage_metadata?: UsageMetadata
    │       └─ role: "assistant"
    │
    ├── SystemMessage (系统提示)
    │       └─ role: "system"
    │
    ├── ToolMessage (工具调用结果)
    │       ├─ tool_call_id: string
    │       └─ status: "success" | "error"
    │
    ├── FunctionMessage (函数调用 - 已废弃)
    │
    ├── ChatMessage (通用角色)
    │       └─ role: string
    │
    └── RemoveMessage (删除消息 - 用于状态管理)
```

**消息内容类型**:
```typescript
type Content = string | (TextContent | ImageContent | VideoContent | AudioContent | ToolUseContent)[];

// 多模态内容
interface ImageContent {
  type: 'image_url';
  image_url: { url: string; detail?: 'auto' | 'low' | 'high' };
}

interface TextContent {
  type: 'text';
  text: string;
}
```

### 3. 提示模板 (Prompts)

**源码**: `libs/langchain-core/src/prompts/`

```
BasePromptTemplate<Variables, PromptValue>
    │
    ├── StringPromptTemplate (字符串模板)
    │       │
    │       └── PromptTemplate (f-string 风格)
    │
    └── BaseChatPromptTemplate (聊天模板)
            │
            ├── ChatPromptTemplate (消息模板列表)
            │
            ├── FewShotPromptTemplate (少样本学习)
            │
            └── FewShotChatMessagePromptTemplate
```

**ChatPromptTemplate 示例**:
```typescript
const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful assistant'],
  ['human', 'Tell me about {topic}'],
  ['ai', 'Sure!'],
  ['human', '{followup}']
]);

const formatted = await prompt.format({ 
  topic: 'cats', 
  followup: 'What about dogs?' 
});
```

### 4. 输出解析器 (Output Parsers)

**源码**: `libs/langchain-core/src/output_parsers/`

```
BaseOutputParser<T>
    │
    ├── StringOutputParser (最简单，提取文本)
    │
    ├── JsonOutputParser (结构化 JSON)
    │
    ├── XMLParser (XML 解析)
    │
    ├── StructuredOutputParser (基于 Schema)
    │
    ├── ListOutputParser (列表解析)
    │
    ├── CommaSeparatedListOutputParser
    │
    └── RegexParser (正则匹配)
```

**JsonOutputParser 示例**:
```typescript
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';

const parser = new JsonOutputParser<z.infer<typeof schema>>();

const schema = z.object({
  name: z.string(),
  age: z.number(),
  hobbies: z.array(z.string())
});

const chain = model.bind({ response_format: { type: 'json_object' } }) | parser;
```

### 5. 嵌入与向量存储 (Embeddings & VectorStores)

**源码**: `libs/langchain-core/src/embeddings.ts` / `vectorstores.ts`

#### Embeddings 接口
```typescript
interface Embeddings {
  // 嵌入单个文档
  embedQuery(document: string): Promise<number[]>;
  
  // 批量嵌入多个文档
  embedDocuments(documents: string[]): Promise<number[][]>;
}
```

#### VectorStore 接口
```typescript
abstract class VectorStore extends Serializable {
  // 添加向量
  addVectors(vectors: number[][], documents: Document[]): Promise<string[]>;
  
  // 添加文档 (自动嵌入)
  addDocuments(documents: Document[]): Promise<string[]>;
  
  // 相似度搜索
  similaritySearch(query: string, k?: number): Promise<Document[]>;
  similaritySearchVector(vector: number[], k?: number): Promise<Document[]>;
  
  // 相似度搜索带分数
  similaritySearchWithScore(query: string, k?: number): Promise<[Document, number][]>;
  
  // 转换为检索器
  asRetriever(): VectorStoreRetriever<this>;
}
```

### 6. Agent 系统 (Agents)

**源码**: `libs/langchain/src/agents/` (高级实现)

```
AgentAction
    ├── tool: string (使用的工具)
    └── toolInput: string (工具输入)

AgentFinish
    ├── returnValues: Record<string, any>
    └── log: string

Agent
    ├── BaseSingleActionAgent
    │       ├── ZeroShotAgent (ReAct)
    │       └── StructuredChatAgent
    │
    └── BaseMultiActionAgent

AgentExecutor
    └── 执行 Agent 循环直到完成
```

### 7. 工具 (Tools)

**源码**: `libs/langchain-core/src/tools/`

```
Tool
    ├── name: string
    ├── description: string
    └── _call(): Promise<string>

DynamicTool (自定义函数)
    ├── func: (input: string) => Promise<string>
    └── schema?: ZodSchema

StructuredTool (带 Schema)
    └── args: ZodSchema
```

**工具定义示例**:
```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const searchTool = tool(
  async (query: string) => {
    // 执行搜索
    return searchResult;
  },
  {
    name: 'web_search',
    description: 'Search the web for current information',
    schema: z.string().describe('Search query')
  }
);
```

### 8. 记忆系统 (Memory)

**源码**: `libs/langchain/src/memory/`

```
BaseMemory
    │
    ├── BaseChatMemory
    │       │
    │       ├── BufferMemory (完整历史)
    │       ├── BufferWindowMemory (滑动窗口)
    │       ├── ConversationSummaryMemory (摘要)
    │       └── VectorStoreRetrieverMemory (向量检索)
    │
    └── ReadOnlySharedMemory
```

### 9. 文档处理 (Documents)

**源码**: `libs/langchain-core/src/document_loaders/` & `langchain-textsplitters/`

#### Document Loaders
```
BaseDocumentLoader
    ├── TextLoader (纯文本)
    ├── CSVLoader (CSV 文件)
    ├── PDFLoader (PDF 文档)
    ├── JSONLoader (JSON 数据)
    ├── WebBaseLoader (网页爬取)
    ├── CheerioWebBaseLoader (HTML 解析)
    └── NotionDBLoader (Notion 数据库)
```

#### Text Splitters
```
TextSplitter
    ├── CharacterTextSplitter (字符分割)
    ├── RecursiveCharacterTextSplitter (递归字符)
    ├── TokenTextSplitter (Token 计数)
    ├── MarkdownTextSplitter (Markdown 感知)
    ├── PythonCodeTextSplitter (Python 代码)
    └── MarkdownHeaderTextSplitter (Markdown 标题)
```

### 10. 回调与追踪 (Callbacks & Tracers)

**源码**: `libs/langchain-core/src/callbacks/` & `tracers/`

#### CallbackManager
```typescript
class CallbackManager {
  handleLLMStart(): Promise<void>;
  handleLLMEnd(): Promise<void>;
  handleLLMError(): Promise<void>;
  
  handleChainStart(): Promise<void>;
  handleChainEnd(): Promise<void>;
  handleChainError(): Promise<void>;
  
  handleToolStart(): Promise<void>;
  handleToolEnd(): Promise<void>;
  
  handleRetrieverStart(): Promise<void>;
  handleRetrieverEnd(): Promise<void>;
  
  handleText(): Promise<void>;
  handleAgentAction(): Promise<void>;
  handleAgentEnd(): Promise<void>;
}
```

#### Tracers
```
BaseTracer
    ├── LangChainTracer (LangSmith 集成)
    ├── ConsoleCallbackHandler (控制台输出)
    ├── LogStreamCallbackHandler (流式日志)
    └── EventStreamCallbackHandler (事件流)
```

## 🔗 组件关系图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         完整 LLM 应用流程                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Input                                                              │
│    │                                                                │
│    ▼                                                                │
│  ┌─────────────────┐                                                │
│  │  Prompt         │ ←─── 变量填充                                   │
│  │  Template       │                                                │
│  └────────┬────────┘                                                │
│           │                                                         │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │  Messages       │ ←─── Human/AI/System                          │
│  └────────┬────────┘                                                │
│           │                                                         │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │  BaseChatModel  │ ←─── ChatOpenAI/Anthropic/...                │
│  │  (+ Tool Calls) │                                                │
│  └────────┬────────┘                                                │
│           │                                                         │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │  Output Parser  │ ←─── JSON/XML/Structured                     │
│  └────────┬────────┘                                                │
│           │                                                         │
│           ▼                                                         │
│  ┌─────────────────┐    ┌─────────────────┐                        │
│  │  Agent/Executor │◄───│  Tools          │                        │
│  │  (可选循环)      │    │  + Memory       │                        │
│  └────────┬────────┘    └─────────────────┘                        │
│           │                                                         │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │  VectorStore    │ ←─── Retrieval (RAG)                         │
│  │  + Embeddings   │                                                │
│  └────────┬────────┘                                                │
│           │                                                         │
│           ▼                                                         │
│  Output                                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

在整个流程中：
- Callbacks 追踪所有事件
- Tracers 记录详细日志
- Memory 管理对话历史
```

## 📁 模块依赖

```typescript
// 核心导入
import { Runnable, RunnableConfig } from '@langchain/core/runnables';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { BasePromptTemplate } from '@langchain/core/prompts';
import { BaseOutputParser } from '@langchain/core/output_parsers';
import { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';
import { Tool } from '@langchain/core/tools';
import { BaseMemory } from 'langchain/memory';
import { CallbackManager } from '@langchain/core/callbacks/manager';
```

---

**源码参考**: `/Users/xilin/Documents/sources/langchainjs/libs/langchain-core/src/`