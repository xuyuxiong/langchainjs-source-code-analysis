# 消息系统深度解析

> 19 种消息类型与多模态内容支持

## 📋 概述

LangChainJS 的消息系统提供了统一的对话消息抽象，支持文本、图像、音频等多种内容格式。

**源码位置**: `libs/langchain-core/src/messages/`

## 🏗️ 类层次结构

**文件数**: 19 个

```
Serializable
    │
    └── parseBaseMessageFields()
            │
            └── BaseMessage
                    │
                    ├── BaseMessageChunk (可流式分块)
                    │       │
                    │       ├── HumanMessageChunk
                    │       ├── AIMessageChunk
                    │       ├── SystemMessageChunk
                    │       └── ...
                    │
                    ├── HumanMessage (用户消息)
                    ├── AIMessage (AI 回复)
                    ├── SystemMessage (系统提示)
                    ├── ToolMessage (工具结果)
                    ├── FunctionMessage (函数调用 - 已废弃)
                    ├── ChatMessage (通用角色)
                    └── RemoveMessage (删除消息)
```

## 🔑 BaseMessage 核心接口

**源文件**: `libs/langchain-core/src/messages/base.ts`

```typescript
abstract class BaseMessage extends Serializable {
  // ========== 核心属性 ==========
  
  /**
   * 消息内容
   * 支持单一文本或复杂内容数组
   */
  content: string | ArrayContent;
  
  /**
   * 消息角色
   * 'user' | 'assistant' | 'system' | 'generic'
   */
  abstract _getType(): MessageType;
  
  /**
   * 消息名称 (可选)
   */
  name?: string;
  
  /**
   * 额外元数据
   */
  additional_kwargs: Record<string, any>;
  
  /**
   * 响应元数据 (AI 消息)
   */
  response_metadata?: Record<string, any>;
  
  /**
   * 唯一 ID
   */
  id?: string;
  
  // ========== 工具方法 ==========
  
  /**
   * 内容是否为字符串
   */
  isTextContent(): boolean {
    return typeof this.content === 'string';
  }
  
  /**
   * 转换为 OpenAI 格式
   */
  toOpenAIToolCall?(): OpenAIToolCall;
  
  /**
   * 添加内容块
   */
  concat(chunk: BaseMessageChunk): this;
}
```

## 📊 消息类型详解

### 1. HumanMessage (用户消息)

**源文件**: `libs/langchain-core/src/messages/human.ts`

```typescript
class HumanMessage extends BaseMessage {
  static lc_name() {
    return 'HumanMessage';
  }
  
  _getType(): MessageType {
    return 'human';
  }
}

// 使用示例
(new HumanMessage({
  content: 'Hello!',
  name?: 'John',
  additional_kwargs: { ... }
}));
```

### 2. AIMessage (AI 回复)

**源文件**: `libs/langchain-core/src/messages/ai.ts`

```typescript
class AIMessage extends BaseMessage {
  static lc_name() {
    return 'AIMessage';
  }
  
  _getType(): MessageType {
    return 'ai';
  }
  
  // ========== 特有属性 ==========
  
  /**
   * 工具调用列表
   */
  tool_calls?: ToolCall[];
  
  /**
   * 无效的工具调用
   */
  invalid_tool_calls?: InvalidToolCall[];
  
  /**
   * 使用统计
   */
  usage_metadata?: UsageMetadata;
  
  /**
   * 被拒绝的原因 (内容过滤)
   */
  refusal?: string;
}

// 使用示例
new AIMessage({
  content: 'Hello! I am...'
});
```

**ToolCall 结构**:
```typescript
interface ToolCall {
  name: string;
  args: Record<string, any>;
  id?: string;
  type: 'tool_call';
}
```

**InvalidToolCall 结构**:
```typescript
interface InvalidToolCall {
  name?: string;
  args?: string;
  error?: string;
  type: 'invalid_tool_call';
}
```

### 3. SystemMessage (系统提示)

**源文件**: `libs/langchain-core/src/messages/system.ts`

```typescript
class SystemMessage extends BaseMessage {
  static lc_name() {
    return 'SystemMessage';
  }
  
  _getType(): MessageType {
    return 'system';
  }
}

// 使用示例
new SystemMessage({
  content: 'You are a helpful assistant.'
});
```

### 4. ToolMessage (工具结果)

**源文件**: `libs/langchain-core/src/messages/tool.ts`

```typescript
class ToolMessage extends BaseMessage {
  static lc_name() {
    return 'ToolMessage';
  }
  
  _getType(): MessageType {
    return 'tool';
  }
  
  // ========== 特有属性 ==========
  
  /**
   * 关联的工具调用 ID
   */
  tool_call_id: string;
  
  /**
   * 执行状态
   */
  status?: 'success' | 'error';
}

// 使用示例
new ToolMessage({
  content: JSON.stringify({ result: '...' }),
  tool_call_id: 'call_abc123',
  status: 'success'
});
```

### 5. ChatMessage (通用角色)

**源文件**: `libs/langchain-core/src/messages/chat.ts`

```typescript
class ChatMessage extends BaseMessage {
  static lc_name() {
    return 'ChatMessage';
  }
  
  _getType(): MessageType {
    return 'generic';
  }
  
  // ========== 特有属性 ==========
  
  /**
   * 自定义角色
   */
  role: string;
}

// 使用示例
new ChatMessage({
  content: '...',
  role: 'developer'  // 自定义角色
});
```

### 6. FunctionMessage (已废弃)

**源文件**: `libs/langchain-core/src/messages/function.ts`

⚠️ **已废弃**: 使用 ToolMessage 替代

```typescript
class FunctionMessage extends BaseMessage {
  static lc_name() {
    return 'FunctionMessage';
  }
  
  _getType(): MessageType {
    return 'function';
  }
  
  /**
   * 函数名称
   */
  name: string;
}
```

### 7. RemoveMessage (删除消息)

**源文件**: `libs/langchain-core/src/messages/remove.ts`

```typescript
class RemoveMessage extends BaseMessage {
  static lc_name() {
    return 'RemoveMessage';
  }
  
  _getType(): MessageType {
    return 'remove';
  }
  
  /**
   * 要删除的消息 ID
   */
  id: string;
}

// 从 2.0 版本开始支持
```

## 🖼️ 多模态内容支持

### ArrayContent 结构

```typescript
type ArrayContent = (
  | TextContentPart
  | ImageContentPart
  | AudioContentPart
  | VideoContentPart
  | ToolUseContentPart
  | ToolResultContentPart
  | ReasoningContentPart
)[];
```

### 内容块类型

#### TextContentPart

```typescript
interface TextContentPart {
  type: 'text';
  text: string;
  source_type?: 'text';
}

// 使用示例
const message = new HumanMessage({
  content: [
    { type: 'text', text: 'Describe this image:' }
  ]
});
```

#### ImageContentPart

```typescript
interface ImageContentPart {
  type: 'image_url';
  
  image_url: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
  
  source_type?: 'image';
}

// 使用示例
const message = new HumanMessage({
  content: [
    { type: 'text', text: 'What is in this image?' },
    {
      type: 'image_url',
      image_url: {
        url: 'https://example.com/image.jpg',
        detail: 'high'
      }
    }
  ]
});
```

#### AudioContentPart

```typescript
interface AudioContentPart {
  type: 'input_audio';
  
  input_audio: {
    data: string;        // Base64 编码
    format: 'wav' | 'mp3';
  };
  
  source_type?: 'audio';
}
```

#### VideoContentPart

```typescript
interface VideoContentPart {
  type: 'input_video';
  
  input_video: {
    url?: string;
    base64?: string;
    format?: string;
  };
  
  source_type?: 'video';
}
```

#### ToolUseContentPart

```typescript
interface ToolUseContentPart {
  type: 'tool_use';
  
  id: string;
  name: string;
  input: Record<string, any>;
}
```

#### ToolResultContentPart

```typescript
interface ToolResultContentPart {
  type: 'tool_result';
  
  tool_use_id: string;
  content: string | ArrayContent;
  is_error?: boolean;
}
```

#### ReasoningContentPart

```typescript
interface ReasoningContentPart {
  type: 'reasoning';
  
  reasoning: string;
  data?: string;
}
```

## 🔄 消息转换

### 转换为 OpenAI 格式

**源文件**: `libs/langchain-core/src/messages/transformers.ts`

```typescript
import { getBufferString, convertToOpenAITool } from '@langchain/core/messages';

// 获取消息字符串表示
const string = getBufferString(messages);

// 转换为 OpenAI 格式
const openaiMessages: OpenAILikeMessage[] = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Hello' },
      { type: 'image_url', image_url: { url: '...' } }
    ]
  }
];

// 转换为 Anthropic 格式
const anthropicMessages: AnthropicMessage[] = [
  {
    role: 'user',
    content: [
      { type: 'text', text: '...' },
      { type: 'image', source: { ... } }
    ]
  }
];
```

### toOpenAIToolCall

```typescript
const message = new AIMessage({
  content: '',
  tool_calls: [
    {
      name: 'search',
      args: { query: 'weather' },
      id: 'call_abc123',
      type: 'tool_call'
    }
  ]
});

const toolCall = message.toOpenAIToolCall();
```

## 📝 使用示例

### 示例 1: 基础对话

```typescript
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

const messages = [
  new SystemMessage('You are a helpful assistant.'),
  new HumanMessage('What is LangChain?'),
  new AIMessage('LangChain is a framework...'),
  new HumanMessage('Can you explain more?')
];
```

### 示例 2: 多模态输入

```typescript
import { HumanMessage } from '@langchain/core/messages';

const message = new HumanMessage({
  content: [
    { type: 'text', text: 'Describe this image' },
    {
      type: 'image_url',
      image_url: {
        url: 'https://example.com/image.jpg',
        detail: 'high'
      }
    }
  ]
});
```

### 示例 3: 工具调用处理

```typescript
const model = new ChatOpenAI({ modelName: 'gpt-4-turbo' });

const response = await model.invoke([
  new HumanMessage('What is the weather in Tokyo?')
]);

// 检查工具调用
if (response.tool_calls?.length ) {
  const toolCall = response.tool_calls[0];
  
  // 创建 ToolMessage
  const toolMessage = new ToolMessage({
    content: JSON.stringify({ temperature: 25 }),
    tool_call_id: toolCall.id,
    status: 'success'
  });
  
  // 继续对话
  const finalResponse = await model.invoke([
    new HumanMessage('What is the weather in Tokyo?'),
    response,  // AIMessage with tool_calls
    toolMessage
  ]);
}
```

### 示例 4: 流式分块处理

```typescript
import *));

const stream = await model.stream(messages);
const chunks: BaseMessageChunk[] = [];

for await (const chunk of stream) {
  chunks.push(chunk);
  process.stdout.write(chunk.content);
}

// 合并所有分块
const fullChunks.push(chunk);
const fullChunks = stream);

const fullChunk = chunks.reduce строить от                         0_chunks = chunks.chunks.push(chunk);
const fullMessage = chunks[0].concat(...chunks.slice.build1));
```

### 示例 5: 消息序列化

```typescript
// 序列化
const json = message.toJSON();

// 反序列化
const restored = BaseMessage.fromJSON(json);

// 消息字典表示
const dict = message.toDict();
```

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 使用专门的 Message 类型
new HumanMessage({ content: '...' }); // ✅

// 2. 使用 content 数组支持多模态
new HumanMessage({
  content: [
    { type: 'text', text: '...' },
    { type: 'image_url', image_url: { ... } }
  ]
}); // ✅

// 3. 保持合理的对话历史长度
const messages = conversation.slice(-10); // 最近 10 条 // ✅
```

### ❌ 不推荐

```typescript
// 1. 避免手动构造复杂结构
const  messagesmanual = [
  {
    static {
    role: 'user',
    content: '...'
  }
]; // ❌ 容易出错

// 应使用消息类
new HumanMessage({ content: '...' }); // ✅

// 2. 避免忽略 tool_message_id
new Too  (
```

---

**源码参考**: `libs/langchain-core/src/messages/` (19 个文件)