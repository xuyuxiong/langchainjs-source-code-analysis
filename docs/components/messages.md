# 消息系统

> 对话消息的完整类型体系

## 📋 概述

消息系统定义了 LangChainJS 中所有消息类型的统一接口和实现，是与 LLM 交互的基础数据结构。

**源码位置**: `libs/langchain-core/src/messages/`

**文件数**: 约 14 个主要文件

## 🏗️ 类层次结构

```
Serializable
    │
    └── BaseMessage<TStructure, TRole>
            │
            ├── BaseMessageChunk (支持流式合并)
            │       │
            │       ├── HumanMessageChunk
            │       ├── AIMessageChunk
            │       ├── SystemMessageChunk
            │       ├── FunctionMessageChunk
            │       └── ToolMessageChunk
            │
            ├── HumanMessage
            ├── AIMessage (包含 tool_calls 支持)
            ├── SystemMessage
            ├── FunctionMessage
            └── ToolMessage
```

## 📁 源码文件结构

```
libs/langchain-core/src/messages/
├── base.ts              # BaseMessage 抽象基类
├── message.ts           # Message 接口和类型定义
├── human.ts             # HumanMessage
├── ai.ts                # AIMessage (含 Tool Calls 支持)
├── system.ts            # SystemMessage
├── function.ts          # FunctionMessage
├── tool.ts              # ToolMessage 和 ToolCall 类型
├── chat.ts              # Chat 相关辅助函数
├── format.ts            # 消息格式化
├── content/             # 内容块类型
│   ├── base.ts
│   ├── data.ts
│   └── index.ts
├── block_translators/   # 不同格式的块转换
│   ├── anthropic.ts
│   ├── openai.ts
│   └── data.ts
├── transformers.ts      # 消息转换器
├── utils.ts             # 工具函数
└── index.ts             # 导出入口
```

## 🔑 BaseMessage 核心接口

**源文件**: `libs/langchain-core/src/messages/base.ts`

```typescript
// 消息内容类型
type MessageContent = string | Array<ContentBlock>;

abstract class BaseMessage<
  TStructure extends MessageStructure = MessageStructure,
  TRole extends MessageType = MessageType
> extends Serializable {\n  \n  // ========== 核心属性 ==========\n  \n  /**\n   * 消息内容（字符串或内容块数组）\n   */\n  content: $InferMessageContent<TStructure, TRole>;\n  \n  /**\n   * 附加名称（可选）\n   */\n  name?: string;\n  \n  /**\n   * 响应元数据（headers、logprobs、token counts 等）\n   */\n  response_metadata?: $InferResponseMetadata<TStructure, TRole>;\n  \n  /**\n   * 消息 ID\n   */\n  id?: string;\n  \n  /**\n   * @deprecated 遗留字段，使用 tool_calls\n   */\n  additional_kwargs?: {\n    function_call?: FunctionCall;\n    tool_calls?: OpenAIToolCall[];\n    [key: string]: unknown;\n  };\n  \n  // ========== 抽象方法 ==========\n  \n  /**\n   * 获取消息类型\n   */\n  abstract _getType(): MessageType;\n  \n  // ========== 工具方法 ==========\n  \n  /**\n   * 检查是否为文本内容\n   */\n  isTextContent(): boolean;\n  \n  /**\n   * 转换为 OpenAI ToolCall\n   */\n  toOpenAIToolCall?(): OpenAIToolCall | undefined;\n  \n  /**\n   * 合并消息块\n   */\n  concat(chunk: BaseMessageChunk): this;\n  \n  /**\n   * 序列化为 JSON\n   */\n  toJSON(): any;\n  \n  /**\n   * 转换为字典\n   */\n  toDict(): StoredMessage;\n}\n```\n\n## 🔑 AIMessage 详解\n\n**源文件**: `libs/langchain-core/src/messages/ai.ts`\n\n```typescript\ninterface AIMessageFields<TStructure extends MessageStructure> {\n  content?: $InferMessageContent<TStructure, 'ai'>;\n  name?: string;\n  id?: string;\n  tool_calls?: ToolCall[];\n  invalid_tool_calls?: InvalidToolCall[];\n  additional_kwargs?: { function_call?: FunctionCall };\n  response_metadata?: Record<string, any>;\n}\n\nclass AIMessage<TStructure extends MessageStructure = MessageStructure>\n  extends BaseMessage<TStructure, 'ai'>\n{\n  static lc_name() {\n    return 'AIMessage';\n  }\n  \n  _getType(): MessageType {\n    return 'ai';\n  }\n  \n  /**\n   * 工具调用列表\n   */\n  tool_calls?: ToolCall[];\n  \n  /**\n   * 无效的调用列表\n   */\n  invalid_tool_calls?: InvalidToolCall[];\n  \n  /**\n   * 构造函数支持多种参数形式\n   */\n  constructor(\n    fields: $InferMessageContent<TStructure, 'ai'> | AIMessageFields<TStructure>\n  ) {\n    if (typeof fields === 'string' || Array.isArray(fields)) {\n      // 支持直接传入内容\n      super({ content: fields });\n      this.tool_calls = [];\n      this.invalid_tool_calls = [];\n      this.additional_kwargs = {};\n    } else {\n      // 传入字段对象\n      super(fields);\n      // 处理 tool_calls 转换逻辑...\n    }\n  }\n  \n  /**\n   * 检查是否包含工具调用\n   */\n  get tool_calls(): ToolCall[] {\n    return this.tool_calls ?? [];\n  }\n}\n```\n\n## 📝 使用示例\n\n### 示例 1: 创建消息\n\n```typescript\nimport { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';\n\n// HumanMessage\nconst humanMsg = new HumanMessage('你好！');\nconst humanMsg2 = new HumanMessage({\n  content: '你好！',\n  name: 'user123'\n});\n\n// AIMessage（支持 string 或对象）\nconst aiMsg = new AIMessage('你好，有什么可以帮助你的？');\nconst aiMsg2 = new AIMessage({\n  content: '你好！',\n  tool_calls: []  // 支持 tool_calls\n});\n\n// SystemMessage\nconst sysMsg = new SystemMessage('你是一个有帮助的助手');\n```\n\n### 示例 2: 带 Tool Calls 的 AIMessage\n\n```typescript\nimport { AIMessage } from '@langchain/core/messages';\n\nconst aiMsg = new AIMessage({\n  content: '我来帮你查询天气',\n  tool_calls: [{\n    id: 'call_123',\n    name: 'get_weather',\n    args: { city: '北京' }\n  }]\n});\n\nconsole.log(aiMsg.tool_calls);  // [{ id: 'call_123', ... }]\n```\n\n### 示例 3: 消息合并\n\n```typescript\nimport { AIMessageChunk } from '@langchain/core/messages';\n\n// 流式响应时合并 chunk\nconst chunk1 = new AIMessageChunk({ content: '你好' });\nconst chunk2 = new AIMessageChunk({ content: '，' });\nconst chunk3 = new AIMessageChunk({ content: '世界' });\n\nconst merged = chunk1.concat(chunk2).concat(chunk3);\nconsole.log(merged.content);  // '你好，世界'\n```\n\n### 示例 4: 多模态内容\n\n```typescript\nimport { HumanMessage } from '@langchain/core/messages';\n\n// 文本 + 图片\nconst msg = new HumanMessage({\n  content: [\n    { type: 'text', text: '这张图片是什么？' },\n    {\n      type: 'image',\n      source: {\n        type: 'base64',\n        media_type: 'image/jpeg',\n        data: 'base64_encoded_data'\n      }\n    }\n  ]\n});\n```\n\n### 示例 5: 消息类型检查\n\n```typescript\nimport { HumanMessage, AIMessage } from '@langchain/core/messages';\nimport { isBaseMessage, isMessageType } from '@langchain/core/messages/utils';\n\nconst msg = new HumanMessage('hello');\n\nconsole.log(isBaseMessage(msg));           // true\nconsole.log(isMessageType(msg, 'human'));  // true\nconsole.log(msg._getType());               // 'human'\nconsole.log(msg.isTextContent());          // true/false\n```\n\n## 💡 最佳实践\n\n### ✅ 推荐\n\n```typescript\n// 1. 使用类型安全的构造函数\nconst msg = new HumanMessage({\n  content: 'message',\n  name: 'user'  // ✅ 添加名称\n});\n\n// 2. 正确传递消息数组\nconst messages = [\n  new SystemMessage('You are helpful'),\n  new HumanMessage('Hello'),\n  new AIMessage('Hi there!')\n];\n\n// 3. 使用 AIMessageChunk 处理流式响应\nlet fullMessage = '';\nfor await (const chunk of stream) {\n  fullMessage += chunk.content;\n}\n```\n\n### ❌ 不推荐\n\n```typescript\n// 1. 避免使用 additional_kwargs 传递 tool_calls\nconst msg = new AIMessage({\n  additional_kwargs: {\n    tool_calls: [...]  // ❌ 已废弃\n  }\n});\n// 应该使用:\nconst msg = new AIMessage({\n  tool_calls: [...]  // ✅ 正确\n});\n\n// 2. 避免混合使用 string 和对象\nconst msg = new HumanMessage('content');  // ✅ 或\nconst msg = new HumanMessage({ content: 'content' });  // ✅\n// 不要混用\n```\n\n---\n\n**源码参考**: `libs/langchain-core/src/messages/`（14 个主要文件）