# 输出解析器 (Output Parsers)

> 将 LLM 输出转换为结构化数据

## 📋 概述

输出解析器负责将 LLM 的原始输出转换为结构化格式，如 JSON、列表、或自定义类型。

**源码位置**: `libs/langchain-core/src/output_parsers/`

**文件数**: 12 个

## 🏗️ 类层次结构

```
Serializable
    │
    └── BaseOutputParser<T>
            │
            ├── StringOutputParser (最简单，提取文本)
            │
            ├── ListOutputParser (列表解析)
            │       │
            │       └── CommaSeparatedListOutputParser
            │
            ├── JsonOutputParser (JSON 解析)
            │
            ├── XMLParser (XML 解析)
            │
            ├── StructuredOutputParser (基于 Schema)
            │
            ├── RegexParser (正则匹配)
            │
            ├── PydanticOutputParser (Pydantic Schema)
            │
            ├── CSVParser (CSV 解析)
            │
            └── RouterOutputParser (路由选择)
```

## 🔑 BaseOutputParser 核心接口

**源文件**: `libs/langchain-core/src/output_parsers/base.ts`

```typescript
abstract class BaseOutputParser<
  T = any,
  CallOptions extends OutputParserCallOptions = OutputParserCallOptions
> extends Serializable {
  
  /**
   * 解析 LLM 输出
   * @param text - LLM 的原始输出文本
   * @returns 解析后的结构化数据
   */
  abstract parse(text: string): Promise<T>;
  
  /**
   * 解析带格式说明
   */
  async parseWithPrompt(
    text: string,
    promptValue?: PromptValue
  ): Promise<T> {
    try {
      return await this.parse(text);
    } catch (e) {
      throw new OutputParserException(
        `Failed to parse. Text: "${text}"`,
        text,
        promptValue?.toString()
      );
    }
  }
  
  /**
   * 获取格式说明
   */
  getFormatInstructions(): string {
    return '';
  }
  
  /**
   * 调用解析 (Runnable 接口)
   */
  async invoke(input: string, options?: Partial<CallOptions>): Promise<T> {
    return this.parse(input);
  }
}
```

## 📊 解析器类型详解

### 1. StringOutputParser

**源文件**: `libs/langchain-core/src/output_parsers/string.ts`

最简单的解析器，直接返回原始文本。

```typescript
class StringOutputParser extends BaseOutputParser<string> {
  static lc_name() {
    return 'StringOutputParser';
  }
  
  _type() {
    return 'string';
  }
  
  async parse(text: string): Promise<string> {
    // 直接返回，不做任何处理
    return text;
  }
  
  getFormatInstructions(): string {
    return ''; // 不需要格式说明
  }
}
```

**使用示例**:
```typescript
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';

const model = new ChatOpenAI({ modelName: 'gpt-4' });
const parser = new StringOutputParser();

const chain = model | parser;

const result = await chain.invoke([
  new HumanMessage('Tell me a joke')
]);

console.log(typeof result); // "string"
console.log(result); // "Why did the cat..."
```

### 2. JsonOutputParser

**源文件**: `libs/langchain-core/src/output_parsers/json.ts`

解析 JSON 输出，支持 Zod Schema 验证。

```typescript
class JsonOutputParser<
  T extends Record<string, any> = Record<string, any>
> extends BaseOutputParser<T> {
  
  /**
   * 输出 Schema
   */
  schema?: z.ZodType<T>;
  
  static lc_name() {
    return 'JsonOutputParser';
  }
  
  _type() {
    return 'json';
  }
  
  async parse(text: string): Promise<T> {
    // 1. 提取 JSON
    const json = this._extractJSON(text);
    
    // 2. 解析 JSON
    const parsed = JSON.parse(json);
    
    // 3. Schema 验证 (如果有)
    if (this.schema) {
      return await this.schema.parseAsync(parsed);
    }
    
    return parsed as T;
  }
  
  _extractJSON(text: string): string {
    // 处理 ```json ... ``` 包裹
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1];
    }
    return text;
  }
  
  getFormatInstructions(): string {
    if (!this.schema) {
      return 'You must format your output as a JSON value that adheres to standard JSON syntax.';
    }
    
    return `You must format your output as a JSON value that adheres to the following schema:\n\n${JSON.stringify(
      this.schema,
      null,
      2
    )}`;
  }
}
```

**使用示例**:
```typescript
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// 定义输出 Schema
const JokeSchema = z.object({
  setup: z.string().describe('The setup of the joke'),
  punchline: z.string().describe('The punchline'),
  rating: z.number().optional().describe('Rating 1-10')
});

const parser = new JsonOutputParser({ schema: JokeSchema });

const prompt = ChatPromptTemplate.fromTemplate(
  'Tell a joke about {topic}. {format_instructions}'
);

const model = new ChatOpenAI({ modelName: 'gpt-4' });

const chain = prompt | model | parser;

const result = await chain.invoke({
  topic: 'cats',
  format_instructions: parser.getFormatInstructions()
});

console.log(result);
// { setup: '...', punchline: '...', rating: 8 }
```

### 3. CSVOutputParser

**源文件**: `libs/langchain-core/src/output_parsers/csv.ts`

解析 CSV 格式输出。

```typescript
class CSVOutputParser<
  T extends Record<string, any> = Record<string, any>
> extends BaseOutputParser<T[]> {
  
  /**
   * 字段名称
   */
  fields: string[];
  
  async parse(text: string): Promise<T[]> {
    const lines = text.trim().split('\n');
    
    // 跳过标题行 (如果有)
    const dataLines = lines.filter(line => {
      const values = line.split(',');
      return !this.fields.every((field, i) => values[i]?.trim() === field);
    });
    
    return dataLines.map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: Record<string, any> = {};
      
      this.fields.forEach((field, i) => {
        row[field] = values[i];
      });
      
      return row as T;
    });
  }
}
```

**使用示例**:
```typescript
import { CSVOutputParser } from '@langchain/core/output_parsers';

const parser = new CSVOutputParser({
  fields: ['name', 'age', 'city']
});

const csv = `name, age, city
John, 25, New York
Jane, 30, Los Angeles
Bob, 35, Chicago`;

const result = await parser.parse(csv);
// [{ name: 'John', age: '25', city: 'New York' }, ...]
```

### 4. ListOutputParser

**源文件**: `libs/langchain-core/src/output_parsers/list.ts`

解析列表格式输出。

```typescript
class ListOutputParser<
  T extends string | number = string
> extends BaseOutputParser<T[]> {
  
  /**
   * 分隔符
   */
  separator: string = '\n';
  
  async parse(text: string): Promise<T[]> {
    return text
      .split(this.separator)
      .map(item => item.trim())
      .filter(item => item.length > 0) as T[];
  }
}
```

**CommaSeparatedListOutputParser**:
```typescript
class CommaSeparatedListOutputParser extends ListOutputParser {
  separator = ',';
}
```

**使用示例**:
```typescript
import { ListOutputParser, CommaSeparatedListOutputParser } from '@langchain/core/output_parsers';

// 换行分隔
const newlineParser = new ListOutputParser({ separator: '\n' });
const result1 = await newlineParser.parse('Item 1\nItem 2\nItem 3');
// ['Item 1', 'Item 2', 'Item 3']

// 逗号分隔
const csvParser = new CommaSeparatedListOutputParser();
const result2 = await csvParser.parse('apple, banana, cherry');
// ['apple', 'banana', 'cherry']
```

### 5. StructuredOutputParser

**源文件**: `libs/langchain-core/src/output_parsers/structured.ts`

基于 ResponseFormat 的结构化输出。

```typescript
class StructuredOutputParser<
  T extends ResponseFormat
> extends BaseOutputParser<T['output']> {
  
  /**
   * 响应格式定义
   */
  responseFormat: T;
  
  async parse(text: string): Promise<T['output']> {
    // 根据 responseFormat 解析
    return this._parseStructured(text, this.responseFormat);
  }
  
  getFormatInstructions(): string {
    return `Format your response according to this schema:\n${JSON.stringify(
      this.responseFormat,
      null,
      2
    )}`;
  }
}
```

### 6. RegexParser

**源文件**: `libs/langchain-core/src/output_parsers/regex.ts`

使用正则表达式解析输出。

```typescript
class RegexParser<
  T extends Record<string, any> = Record<string, string>
> extends BaseOutputParser<T> {
  
  /**
   * 正则表达式
   */
  regex: RegExp;
  
  /**
   * 输出键名
   */
  outputKeys: string[];
  
  async parse(text: string): Promise<T> {
    const match = this.regex.exec(text);
    
    if (!match) {
      throw new OutputParserException(
        `Text "${text}" does not match the regex "${this.regex}"`
      );
    }
    
    const result: Record<string, any> = {};
    this.outputKeys.forEach((key, index) => {
      result[key] = match[index + 1];
    });
    
    return result as T;
  }
}
```

**使用示例**:
```typescript
import { RegexParser } from '@langchain/core/output_parsers';

const parser = new RegexParser({
  regex: /Answer: (.+), Confidence: (\d+)/,
  outputKeys: ['answer', 'confidence']
});

const text = 'Answer: Paris, Confidence: 95';
const result = await parser.parse(text);
// { answer: 'Paris', confidence: '95' }
```

## 🔧 高级功能

### 1. 带错误处理的解析

```typescript
import { OutputParserException } from '@langchain/core/output_parsers';

class RobustJsonParser extends JsonOutputParser {
  async parse(text: string): Promise<any> {
    try {
      return await super.parse(text);
    } catch (e) {
      if (e instanceof OutputParserException) {
        // 输出解析错误
        console.error('Parse failed:', e.message);
        // 可以尝试修复或返回默认值
        return { error: 'Failed to parse' };
      }
      throw e;
    }
  }
}
```

### 2. 组合解析器

```typescript
import { RunnableSequence } from '@langchain/core/runnables';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { StringOutputParser } from '@langchain/core/output_parsers';

// JSON 解析失败时使用字符串解析器作为 fallback
const parser = RunnableSequence.from([
  new JsonOutputParser(),
  new StringOutputParser() // 如果 JSON 解析失败
]);
```

### 3. 自定义解析器

```typescript
import { BaseOutputParser } from '@langchain/core/output_parsers';

class CustomOutputParser extends BaseOutputParser<{
  summary: string;
  keyPoints: string[];
}> {
  _type() {
    return 'custom';
  }
  
  async parse(text: string): Promise<{ summary: string; keyPoints: string[] }> {
    // 自定义解析逻辑
    const lines = text.split('\n');
    const summary = lines[0];
    const keyPoints = lines.slice(1).filter(l => l.startsWith('-'));
    
    return {
      summary,
      keyPoints: keyPoints.map(k => k.slice(2).trim())
    };
  }
  
  getFormatInstructions(): string {
    return `Format your response as:
Summary: <one line summary>
- <key point 1>
- <key point 2>
...`;
  }
}
```

## 📝 完整使用示例

### 示例 1: 结构化数据提取

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';

// 定义 Schema
const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
  occupation: z.string(),
  hobbies: z.array(z.string())
});

const parser = new JsonOutputParser({ schema: PersonSchema });

const prompt = ChatPromptTemplate.fromTemplate(
  `Extract person information from the following text:
{text}

{format_instructions}`
);

const model = new ChatOpenAI({ modelName: 'gpt-4' });

const chain = prompt | model | parser;

const result = await chain.invoke({
  text: 'John Doe is a 30-year-old software engineer who enjoys hiking and photography.',
  format_instructions: parser.getFormatInstructions()
});

console.log(result);
// { name: 'John Doe', age: 30, occupation: 'software engineer', hobbies: ['hiking', 'photography'] }
```

### 示例 2: 多步骤解析

```typescript
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser, JsonOutputParser } from '@langchain/core/output_parsers';

// 第一步: 提取文本
const firstParser = new StringOutputParser();

// 第二步: 解析 JSON
const secondParser = new JsonOutputParser();

const chain = model | firstParser | secondParser;
```

### 示例 3: 带格式说明的提示

```typescript
const parser = new JsonOutputParser();

const prompt = ChatPromptTemplate.fromTemplate(
  `Answer the user's question as best you can.

{format_instructions}

Question: {question}`
);

const chain = prompt | model | parser;
```

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 使用 Schema 验证
const parser = new JsonOutputParser({ schema: MySchema });

// 2. 将格式说明添加到提示
prompt.format({ format_instructions: parser.getFormatInstructions() });

// 3. 处理解析错误
try {
  const result = await parser.parse(text);
} catch (e) {
  // 处理错误
}

// 4. 选择适合场景的解析器
const parser = new CommaSeparatedListOutputParser(); // 简单列表
```

### ❌ 不推荐

```typescript
// 1. 避免不使用格式说明
// 总是调用 parser.getFormatInstructions() 并添加到提示

// 2. 避免忽略错误
await parser.parse(text); // 没有 try-catch

// 3. 避免复杂 Schema
// 保持 Schema 简单明了
const ComplexSchema = z.object({ /* 100+ 字段 */ }); // ❌
```

---

**源码参考**: `libs/langchain-core/src/output_parsers/` (12 个文件)