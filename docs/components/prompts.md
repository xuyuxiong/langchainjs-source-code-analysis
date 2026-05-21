# 提示模板系统

> PromptTemplate 与 ChatPromptTemplate 深度解析

## 📋 概述

提示模板是 LangChainJS 中用于格式化和组合提示词的核心组件。

**源码位置**: `libs/langchain-core/src/prompts/`

## 🏗️ 类层次结构

**文件数**: 15 个

```
Serializable
    │
    └── BasePromptTemplate<Variables, PromptValue>
            │
            ├── StringPromptTemplate (字符串模板)
            │       │
            │       └── PromptTemplate (f-string 风格)
            │
            ├── BaseChatPromptTemplate (聊天模板)
            │       │
            │       ├── ChatPromptTemplate (消息模板列表)
            │       │       │
            │       │       ├── MessagesPlaceholder
            │       │       └── HumanMessagePromptTemplate
            │       │
            │       ├── FewShotPromptTemplate (少样本学习)
            │       │
            │       └── FewShotChatMessagePromptTemplate
            │
            └── PipelinePromptTemplate (管道组合)
```

## 🔑 BasePromptTemplate 核心接口

**源文件**: `libs/langchain-core/src/prompts/base.ts`

```typescript
abstract class BasePromptTemplate<
  RunInput extends InputValues,
  RunOutput extends PromptValue
> extends Serializable {
  
  // ========== 核心属性 ==========
  
  /**
   * 输入变量名称
   */
  inputVariables: (keyof RunInput)[];
  
  /**
   * 变量验证函数
   */
  validate?: (variables: Record<string, any>) => void;
  
  // ========== 抽象方法 ==========
  
  /**
   * 格式化提示词为 PromptValue
   */
  abstract format(values: RunInput): Promise<RunOutput>;
  
  /**
   * 格式化为字符串 (基础类型)
   */
  abstract formatValues(values: RunInput): Promise<Record<string, any>>;
  
  // ========== 工具方法 ==========
  
  /**
   * 验证输入变量
   */
  protected validateInputVariables(values: Record<string, any>): void {
    const missingVars = this.inputVariables.filter(
      varName => !(varName in values)
    );
    
    if (missingVars.length > 0) {
      throw new Error(
        `Missing required variables: ${missingVars.join(', ')}`
      );
    }
  }
  
  /**
   * 部分格式化 (Partial)
   */
  partial<PartialVariableName extends keyof RunInput>(
    values: Partial<Record<PartialVariableName, string>>
  ): BasePromptTemplate<
    Omit<RunInput, PartialVariableName>,
    RunOutput
  > {
    // 返回新的 PromptTemplate，预填充部分变量
    return new PartialPromptTemplate(this, values);
  }
}
```

## 📊 提示模板类型详解

### 1. PromptTemplate

**源文件**: `libs/langchain-core/src/prompts/prompt.ts`

最基础的字符串模板，支持 f-string 风格占位符。

```typescript
class PromptTemplate<
  T extends InputValues = InputValues
> extends BaseStringPromptTemplate<T> {
  
  /**
   * 模板字符串
   */
  template: string;
  
  /**
   * 模板格式: 'f-string' | 'jinja2'
   */
  templateFormat: 'f-string' | 'jinja2' = 'f-string';
  
  // ========== 静态方法 ==========
  
  /**
   * 从模板字符串创建
   */
  static fromTemplate<
    T extends InputValues = InputValues
  >(
    template: string,
    options?: { inputVariables?: (keyof T)[] }
  ): PromptTemplate<T> {
    // 自动提取占位符 {variable}
    const inputVariables = extractVariables(template);
    return new PromptTemplate({ template, inputVariables, ...options });
  }
  
  // ========== 实例方法 ==========
  
  async format(values: T): Promise<string> {
    if (this.templateFormat === 'f-string') {
      return interpolateFString(this.template, values);
    } else {
      return interpolateJinja2(this.template, values);
    }
  }
}
```

**使用示例**:

```typescript
import { PromptTemplate } from '@langchain/core/prompts';

// 方法 1: 构造函数
const prompt = new PromptTemplate({
  template: 'Tell me a joke about {topic}',
  inputVariables: ['topic']
});

const formatted = await prompt.format({ topic: 'cats' });
// "Tell me a joke about cats"

// 方法 2: 静态方法 (推荐)
const prompt2 = PromptTemplate.fromTemplate(
  'Tell me a joke about {topic}'
);

// 方法 3: 多变量
const multiVarPrompt = PromptTemplate.fromTemplate(
  'Tell a {adjective} joke about {topic} in {language}'
);

const result = await multiVarPrompt.format({
  adjective: 'funny',
  topic: 'dogs',
  language: 'Spanish'
});
```

### 2. ChatPromptTemplate

**源文件**: `libs/langchain-core/src/prompts/chat.ts`

用于聊天模型的消息模板列表。

```typescript
class ChatPromptTemplate<
  T extends InputValues = InputValues
> extends BaseChatPromptTemplate<T> {
  
  /**
   * 消息提示模板列表
   */
  promptMessages: Array<BaseMessagePromptTemplate | BaseMessage>;
  
  // ========== 静态方法 ==========
  
  /**
   * 从消息数组创建
   */
  static fromMessages<
    T extends InputValues = InputValues
  >(
    messages: Array<MessageParam | BaseMessagePromptTemplate>
  ): ChatPromptTemplate<T> {
    const promptMessages: Array<BaseMessagePromptTemplate | BaseMessage> = [];
    
    for (const message of messages) {
      if (isBaseMessage(message)) {
        promptMessages.push(message);
      } else if (typeof message === 'string') {
        promptMessages.push(HumanMessagePromptTemplate.fromTemplate(message));
      } else {
        promptMessages.push(message);
      }
    }
    
    return new ChatPromptTemplate({ promptMessages, inputVariables: [] });
  }
  
  /**
   * 简写语法
   */
  static fromMessages<T extends InputValues = InputValues>(
    messages: Array<[MessageType, string]>
  ): ChatPromptTemplate<T> {
    return ChatPromptTemplate.fromMessages(
      messages.map(([role, content]) => [role, content])
    );
  }
  
  // ========== 实例方法 ==========
  
  async format(values: T): Promise<BaseMessage[]> {
    const messages: BaseMessage[] = [];
    
    for (const promptMessage of this.promptMessages) {
      if (isBaseMessage(promptMessage)) {
        messages.push(promptMessage);
      } else {
        const formatted = await promptMessage.format(values);
        messages.push(...formatted);
      }
    }
    
    return messages;
  }
}
```

**使用示例**:

```typescript
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// 方法 1: 从消息数组创建
const chatPrompt = ChatPromptTemplate.fromMessages([
  new SystemMessage('You are a helpful assistant'),
  ['human', 'Tell me a joke about {topic}'],
  ['ai', 'Sure!'],
  ['human', '{followup}']
]);

const result = await chatPrompt.format({
  topic: 'cats',
  followup: 'Now tell me about dogs'
});

// 方法 2: 使用 MessagesPlaceholder
const chatPromptWithHistory = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful assistant'],
  new MessagesPlaceholder('history'),
  ['human', '{input}']
]);

const formatted = await chatPromptWithHistory.format({
  history: [
    new HumanMessage('Hello'),
    new AIMessage('Hi! How can I help?')
  ],
  input: 'What is LangChain?'
});

// 方法 3: 模板字符串
const prompt = ChatPromptTemplate.fromTemplate(
  'You are a {role}. Tell me about {topic}.'
);
```

### 3. FewShotPromptTemplate

**源文件**: `libs/langchain-core/src/prompts/few_shot.ts`

用于少样本学习，提供示例来帮助模型理解任务。

```typescript
class FewShotPromptTemplate<
  T extends InputValues = InputValues
> extends BaseStringPromptTemplate<T> {
  
  /**
   * 示例列表
   */
  examples: Example[];
  
  /**
   * 示例选择器 (可选)
   */
  exampleSelector?: ExampleSelector;
  
  /**
   * 示例模板
   */
  exampleTemplate: PromptTemplate;
  
  /**
   * 示例分隔符
   */
  exampleSeparator: string = '\n\n';
  
  /**
   * 前缀 (示例之前的内容)
   */
  prefix: string = '';
  
  /**
   * 后缀 (示例之后的内容)
   */
  suffix: string = '';
  
  async format(values: T): Promise<string> {
    // 1. 选择示例
    let selectedExamples: Example[];
    if (this.exampleSelector) {
      selectedExamples = await this.exampleSelector.selectExamples(values);
    } else {
      selectedExamples = this.examples;
    }
    
    // 2. 格式化每个示例
    const formattedExamples = await Promise.all(
      selectedExamples.map(example => 
        this.exampleTemplate.format(example)
      )
    );
    
    // 3. 组合最终提示
    const exampleString = formattedExamples.join(this.exampleSeparator);
    
    return [
      this.prefix,
      exampleString,
      this.suffix
    ].filter(Boolean).join('\n\n');
  }
}
```

**使用示例**:

```typescript
import { FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts';

// 定义示例
const examples = [
  {
    input: 'happy',
    output: 'sad'
  },
  {
    input: 'tall',
    output: 'short'
  },
  {
    input: 'energetic',
    output: 'lethargic'
  }
];

// 示例模板
const exampleTemplate = new PromptTemplate({
  template: 'Input: {input}\nOutput: {output}',
  inputVariables: ['input', 'output']
});

// 创建少样本提示模板
const prompt = new FewShotPromptTemplate({
  examples,
  exampleTemplate,
  prefix: 'Give the antonym of every input word. Return the word only.',
  suffix: 'Input: {adjective}\nOutput:',
  inputVariables: ['adjective']
});

const result = await prompt.format({ adjective: 'sunny' });
// Output:
// Give the antonym of every input word. Return the word only.
//
// Input: happy
// Output: sad
//
// Input: tall
// Output: short
//
// Input: energetic
// Output: lethargic
//
// Input: sunny
// Output:
```

### 4. MessagesPlaceholder

**源文件**: `libs/langchain-core/src/prompts/chat.ts`

用于在聊天模板中插入消息历史。

```typescript
class MessagesPlaceholder extends BaseMessagePromptTemplate {
  /**
   * 变量名称
   */
  variableName: string;
  
  /**
   * 是否可选
   */
  optional: boolean = false;
  
  async format(values: Record<string, any>): Promise<BaseMessage[]> {
    const messages = values[this.variableName];
    
    if (!messages) {
      if (this.optional) {
        return [];
      } else {
        throw new Error(
          `Missing required variable: ${this.variableName}`
        );
      }
    }
    
    return messages;
  }
}
```

## 🔧 高级功能

### 1. 部分格式化 (Partial)

```typescript
const prompt = PromptTemplate.fromTemplate(
  'Tell me a {adjective} joke about {topic}'
);

// 预填充部分变量
const partialPrompt = prompt.partial({
  adjective: 'funny'
});

// 只需要提供剩余变量
const result = await partialPrompt.format({
  topic: 'cats'
});
// "Tell me a funny joke about cats"
```

### 2. 示例选择器

```typescript
import { SemanticSimilarityExampleSelector } from '@langchain/core/example_selectors';
import { embeddings } from './embeddings';

// 创建语义相似度示例选择器
const selector = await SemanticSimilarityExampleSelector.from Examples(
  examples,
  embeddings,
  {
    k: 3  // 选择 3 个最相似的示例
  }
);

const prompt = new FewShotPromptTemplate({
  exampleSelector: selector,
  exampleTemplate,
  prefix: '...',
  suffix: '...',
  inputVariables: ['input']
});
```

### 3. 输出解析器链

```typescript
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';

const prompt = ChatPromptTemplate.fromTemplate(`
Extract the following from the text:
- Name: {name}
- Age: {age}

Text: {text}
`);

const parser = new JsonOutputParser();

const chain = prompt | model | parser;

const result = await chain.invoke({
  text: 'John is 25 years old.',
  name: 'John',
  age: '25'
});
```

## 📝 完整使用示例

### 示例 1: 简单问答

```typescript
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';

const prompt = ChatPromptTemplate.fromTemplate(
  'What is the capital of {country}?'
);

const model = new ChatOpenAI({ modelName: 'gpt-4' });

const chain = prompt | model;

const result = await chain.invoke({ country: 'France' });
// "Paris"
```

### 示例 2: 对话历史

```typescript
const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful assistant.'],
  new MessagesPlaceholder('history'),
  ['human', '{input}']
]);

const model = new ChatOpenAI({ modelName: 'gpt-4' });

const chain = prompt | model;

const result = await chain.invoke({
  history: [
    new HumanMessage('Hello'),
    new AIMessage('Hi! How can I help you?')
  ],
  input: 'What is LangChain?'
});
```

### 示例 3: 复杂任务

```typescript
const complexPrompt = ChatPromptTemplate.fromMessages([
  ['system', `You are an expert {expertise}.
  
Your task is to {task}.

Respond in the following format:
{format}`],
  new MessagesPlaceholder('examples', { optional: true }),
  ['human', '{input}']
]);

const result = await complexPrompt.format({
  expertise: 'Python programmer',
  task: 'write a function to sort a list',
  format: '```python\n...\n```',
  examples: [
    new HumanMessage('Example 1'),
    new AIMessage('Example response')
  ],
  input: 'Sort [3, 1, 4, 1, 5]'
});
```

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 使用 ChatPromptTemplate 用于聊天模型
const prompt = ChatPromptTemplate.fromMessages([...]); // ✅

// 2. 使用有意义的变量名
const prompt = ChatPromptTemplate.fromTemplate(
  'Summarize the following text: {document}'
); // ✅

// 3. 对于对话场景，包含历史消息
const prompt = ChatPromptTemplate.fromMessages([
  ['system', '...'],
  new MessagesPlaceholder('history'),
  ['human', '{input}']
]); // ✅

// 4. 使用 Partial 预填常用参数
const systemPrompt = prompt.partial({
  systemMessage: 'You are a helpful assistant'
}); // ✅
```

### ❌ 不推荐

```typescript
// 1. 避免过长的模板
const longPrompt = PromptTemplate.fromTemplate(`
  You are a ... (1000 字符)
  Your task is to ... (500 字符)
  ...
`); // ❌ 难以维护

// 2. 避免缺少变量说明
const prompt = PromptTemplate.fromTemplate(
  'Process {x} with {y} using {z}'
); // ❌ 变量名不清晰

// 3. 避免硬编码示例
// 使用 FewShotPromptTemplate 和 ExampleSelector 代替
```

---

**源码参考**: `libs/langchain-core/src/prompts/` (15 个文件)