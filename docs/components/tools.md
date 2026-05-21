# 工具定义 (Tools)

> Tool 接口与 Tool Calling 机制详解

## 📋 概述

工具是让 LLM 能够执行具体操作的核心机制，如搜索、计算、API 调用等。

**源码位置**: `libs/langchain-core/src/tools/`

**文件数**: 6 个

## 🏗️ 类层次结构

```
Serializable
    │
    └── Runnable (接口)
            │
            └── BaseTool<Input, Output>
                    │
                    ├── Tool (传统工具)
                    │       │
                    │       └── DynamicTool (自定义函数)
                    │
                    └── StructuredTool (结构化参数)
                            │
                            ├── DynamicStructuredTool
                            └── Provider Tools (OpenAI, Anthropic...)
```

## 🔑 BaseTool 核心接口

**源文件**: `libs/langchain-core/src/tools/base.ts`

```typescript
abstract class BaseTool<
  T extends ToolParams = ToolParams,
  CallOptions extends ToolCallOptions = ToolCallOptions
> extends Runnable<string, unknown, CallOptions> {
  
  /**
   * 工具名称 (唯一标识)
   */
  abstract name: string;
  
  /**
   * 工具描述 (LLM 使用此描述决定是否调用工具)
   */
  abstract description: string;
  
  /**
   * Schema 定义 (StructuredTool)
   */
  schema?: z.ZodType<T['input']>;
  
  // ========== 抽象方法 ==========
  
  /**
   * 调用工具 (核心方法)
   * @param input - 输入参数 (字符串或对象)
   * @param config - 调用配置
   * @returns 工具执行结果
   */
  abstract _call(input: string, config: ToolConfig): Promise<string>;
  
  // ========== 公共方法 ==========
  
  /**
   * 调用入口 (Runnable 接口)
   */
  async invoke(
    input: string | Record<string, any>,
    config?: Partial<CallOptions>
  ): Promise<unknown> {
    const parsedInput = this._parseInput(input);
    const result = await this._call(parsedInput, config);
    return this._processResult(result);
  }
  
  /**
   * 获取工具定义 (用于 LLM)
   */
  getToolCallDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.schema ? zodToJsonSchema(this.schema) : undefined
    };
  }
  
  /**
   * 转换为 OpenAI 工具格式
   */
  toOpenAITool(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: this.schema ? zodToJsonSchema(this.schema) : undefined
      }
    };
  }
  
  // ========== 内部方法 ==========
  
  protected _parseInput(input: string | Record<string, any>): string {
    if (typeof input === 'string') {
      return input;
    }
    return JSON.stringify(input);
  }
  
  protected _processResult(result: any): string {
    if (typeof result === 'string') {
      return result;
    }
    return JSON.stringify(result);
  }
}
```

## 📊 工具类型详解

### 1. DynamicTool

**源文件**: `libs/langchain-core/src/tools/dynamic.ts`

最简单的自定义工具，接受字符串输入。

```typescript
class DynamicTool extends BaseTool {
  name: string;
  description: string;
  func: (input: string) => Promise<string>;
  
  constructor(fields: {
    name: string;
    description: string;
    func: (input: string) => Promise<string>;
  }) {
    super(fields);
    this.name = fields.name;
    this.description = fields.description;
    this.func = fields.func;
  }
  
  async _call(input: string): Promise<string> {
    return this.func(input);
  }
}
```

**使用示例**:
```typescript
import { DynamicTool } from '@langchain/core/tools';

const searchTool = new DynamicTool({
  name: 'web_search',
  description: 'Search the web for current information',
  func: async (query: string) => {
    const response = await fetch(`https://api.example.com/search?q=${query}`);
    const data = await response.json();
    return JSON.stringify(data);
  }
});

// 调用
const result = await searchTool.invoke('LangChain JS');
```

### 2. DynamicStructuredTool

**源文件**: `libs/langchain-core/src/tools/dynamic.ts`

支持结构化参数 (Zod Schema) 的工具。

```typescript
class DynamicStructuredTool<
  T extends z.ZodType<any> = z.ZodType<any>
> extends BaseTool {
  name: string;
  description: string;
  func: (input: any) => Promise<string>;
  schema: T;
  
  constructor(fields: {
    name: string;
    description: string;
    schema: T;
    func: (input: z.infer<T>) => Promise<string>;
  }) {
    super(fields);
    this.name = fields.name;
    this.description = fields.description;
    this.schema = fields.schema;
    this.func = fields.func;
  }
  
  async _call(input: string): Promise<string> {
    // 1. 解析输入
    const parsed = JSON.parse(input);
    
    // 2. Schema 验证
    const validated = await this.schema.parseAsync(parsed);
    
    // 3. 执行函数
    return this.func(validated);
  }
}
```

**使用示例**:
```typescript
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const searchTool = new DynamicStructuredTool({
  name: 'web_search',
  description: 'Search the web for current information',
  schema: z.object({
    query: z.string().describe('The search query'),
    numResults: z.number().optional().describe('Number of results (default: 10)'),
    region: z.string().optional().describe('Search region')
  }),
  func: async ({ query, numResults = 10, region }) => {
    const response = await fetch(
      `https://api.example.com/search?q=${query}&n=${numResults}&r=${region}`
    );
    const data = await response.json();
    return JSON.stringify(data);
  }
});

// 调用 (带结构化参数)
const result = await searchTool.invoke({
  query: 'LangChain JS',
  numResults: 5,
  region: 'en-US'
});
```

### 3. Tool 装饰器

**源文件**: `libs/langchain-core/src/tools/tool.ts`

使用装饰器语法快速定义工具。

```typescript
function tool<Input extends z.ZodType<any>>(
  func: (input: z.infer<Input>) => Promise<string>,
  config: {
    name: string;
    description: string;
    schema: Input;
  }
): DynamicStructuredTool<Input> {
  return new DynamicStructuredTool({
    name: config.name,
    description: config.description,
    schema: config.schema,
    func
  });
}
```

**使用示例**:
```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const calculatorTool = tool(
  async ({ operation, a, b }) => {
    switch (operation) {
      case 'add': return String(a + b);
      case 'subtract': return String(a - b);
      case 'multiply': return String(a * b);
      case 'divide': return String(a / b);
      default: throw new Error('Unknown operation');
    }
  },
  {
    name: 'calculator',
    description: 'Perform mathematical calculations',
    schema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number(),
      b: z.number()
    })
  }
);
```

## 🔧 Tool Calling 机制

### 1. 工具绑定到模型

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// 定义工具
const tools = [
  new DynamicStructuredTool({
    name: 'get_weather',
    description: 'Get current weather for a location',
    schema: z.object({
      location: z.string().describe('City name')
    }),
    func: async ({ location }) => {
      // 调用天气 API
      return JSON.stringify({ location, temp: 25, condition: 'sunny' });
    }
  }),
  new DynamicStructuredTool({
    name: 'get_time',
    description: 'Get current time for a timezone',
    schema: z.object({
      timezone: z.string().describe('Timezone')
    }),
    func: async ({ timezone }) => {
      return new Date().toLocaleString('en-US', { timeZone: timezone });
    }
  })
];

// 绑定到模型
const model = new ChatOpenAI({ modelName: 'gpt-4' });
const modelWithTools = model.bind({ tools });
```

### 2. 工具调用流程

```
用户输入
    │
    ▼
┌─────────────────────────────────────────┐
│ ChatModel                               │
│  - 分析输入                              │
│  - 决定是否调用工具                       │
│  - 返回 ToolCall                         │
└──────────────┬──────────────────────────┘
               │
               ▼
    AIMessage { tool_calls: [...] }
               │
               ▼
┌─────────────────────────────────────────┐
│ 执行工具调用                             │
│  - 解析 tool_call_id                     │
│  - 调用对应工具                          │
│  - 获取结果                              │
└──────────────┬──────────────────────────┘
               │
               ▼
    ToolMessage { 
      content: result,
      tool_call_id: '...'
    }
               │
               ▼
┌─────────────────────────────────────────┐
│ ChatModel                               │
│  - 基于工具结果生成最终回复               │
└──────────────┬──────────────────────────┘
               │
               ▼
         最终回复
```

### 3. 手动处理工具调用

```typescript
import { AIMessage, ToolMessage } from '@langchain/core/messages';

const modelWithTools = model.bind({ tools });

// 第一轮：模型决定调用工具
const response1 = await modelWithTools.invoke([
  new HumanMessage('What is the weather in Tokyo?')
]);

// 检查是否有工具调用
if (response1.tool_calls?.length > 0) {
  const toolCall = response1.tool_calls[0];
  
  // 找到对应的工具并执行
  const tool = tools.find(t => t.name === toolCall.name);
  const result = await tool?.invoke(toolCall.args);
  
  // 创建 ToolMessage
  const toolMessage = new ToolMessage({
    content: result,
    tool_call_id: toolCall.id
  });
  
  // 第二轮：将工具结果发送给模型
  const response2 = await modelWithTools.invoke([
    new HumanMessage('What is the weather in Tokyo?'),
    response1,  // AIMessage with tool_calls
    toolMessage // ToolMessage with result
  ]);
  
  console.log(response2.content);
}
```

## 📝 完整使用示例

### 示例 1: Agent 工具调用

```typescript
import { createReactAgent } from 'langchain/agents';
import { tool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

// 定义工具
const searchTool = tool(
  async ({ query }) => {
    // 搜索实现
    return searchResult;
  },
  {
    name: 'search',
    description: 'Search for information',
    schema: z.object({
      query: z.string().describe('Search query')
    })
  }
);

const calculatorTool = tool(
  async ({ operation, a, b }) => {
    // 计算实现
    return String(result);
  },
  {
    name: 'calculator',
    description: 'Do math calculations',
    schema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number(),
      b: z.number()
    })
  }
);

// 创建 Agent
const model = new ChatOpenAI({ modelName: 'gpt-4' });
const agent = createReactAgent({
  llm: model,
  tools: [searchTool, calculatorTool]
});

// 使用 Agent
const result = await agent.invoke({
  messages: [
    new HumanMessage('What is 123 * 456?')
  ]
});
```

### 示例 2: 结构化输出工具

```typescript
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const databaseQueryTool = new DynamicStructuredTool({
  name: 'query_database',
  description: 'Query the database for information',
  schema: z.object({
    table: z.string().describe('Table name'),
    columns: z.array(z.string()).describe('Columns to select'),
    where: z.object({
      column: z.string(),
      operator: z.enum(['=', '!=', '>', '<', '>=', '<=']),
      value: z.string()
    }).optional().describe('WHERE clause')
  }),
  func: async ({ table, columns, where }) => {
    // 构建 SQL 查询
    let sql = `SELECT ${columns.join(', ')} FROM ${table}`;
    if (where) {
      sql += ` WHERE ${where.column} ${where.operator} '${where.value}'`;
    }
    
    // 执行查询
    const results = await executeQuery(sql);
    return JSON.stringify(results);
  }
});
```

### 示例 3: 自定义工具验证

```typescript
class ValidatedTool extends DynamicStructuredTool {
  async invoke(input: any, config?: any): Promise<any> {
    // 1. 前置验证
    await this._validateInput();
    
    // 2. 参数验证
    const validated = await this.schema.parseAsync(input);
    
    try {
      // 3. 执行
      const result = await this.func(validated);
      
      // 4. 后置处理
      return this._processResult(result);
    } catch (e) {
      // 5. 错误处理
      return `Error: ${e.message}`;
    }
  }
}
```

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 使用描述性的工具名称和描述
const tool = new DynamicStructuredTool({
  name: 'get_weather',  // ✅ 清晰
  description: 'Get current weather for a specific location', // ✅ 详细
  // ...
});

// 2. 为参数添加详细的 Schema 描述
schema: z.object({
  location: z.string().describe('City name, e.g., "Tokyo"'),
  unit: z.enum(['celsius', 'fahrenheit']).describe('Temperature unit')
})

// 3. 处理错误情况
func: async (input) => {
  try {
    return await doSomething(input);
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

// 4. 限制工具数量 (5-10 个最佳)
const tools = [tool1, tool2, tool3, tool4, tool5]; // ✅
```

### ❌ 不推荐

```typescript
// 1. 避免模糊的描述
name: 'tool1',  // ❌
description: 'Does something'  // ❌

// 2. 避免过大的 Schema
schema: z.object({ /* 100+ 字段 */ })  // ❌

// 3. 避免工具间的依赖
const tool1 = ...;  // 依赖 tool2 的结果
const tool2 = ...;  // ❌ 复杂调试

// 4. 避免无限循环
// Agent 可能在工具之间循环调用
```

## 🔍 常见问题

### 1. 工具调用失败

```typescript
// 确保工具定义正确
const tool = new DynamicStructuredTool({
  name: 'my_tool',
  description: 'Clear description',  // ✅ 必需
  schema: z.object({ /* ... */ }),   // ✅ 必需
  func: async (input) => { /* ... */ }
});
```

### 2. 参数验证错误

```typescript
// 使用 Zod 的 optional 和 default
schema: z.object({
  required: z.string(),
  optional: z.string().optional(),
  withDefault: z.number().default(10)
});
```

---

**源码参考**: `libs/langchain-core/src/tools/` (6 个文件)