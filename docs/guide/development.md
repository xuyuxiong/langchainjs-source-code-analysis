# LangChainJS 开发调试指南

> 环境搭建、调试技巧与最佳实践

## 📋 开发环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | >=18.0 | LTS 版本推荐 |
| pnpm | >=8.0 | 包管理器 |
| Git | >=2.0 | 版本控制 |

## 🚀 快速开始

### 1. 克隆源码

```bash
git clone https://github.com/langchain-ai/langchainjs.git
cd langchainjs
```

### 2. 安装依赖

```bash
# 启用 pnpm
corepack enable pnpm

# 安装根依赖
pnpm install
```

### 3. 构建项目

```bash
# 构建所有包
pnpm build

# 构建特定包
pnpm build --filter=@langchain/core
pnpm build --filter=@langchain/openai
```

### 4. 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
pnpm test --filter=@langchain/core

# 运行单个测试文件
pnpm test --filter=@langchain/core -- src/runnables/tests/base.test.ts
```

## 🔧 开发工作流

### 添加新包

```bash
# 进入 libs 目录
cd libs

# 创建新包 (使用 create-langchain-integration)
pnpm create langchain-integration my-provider

# 或手动创建
mkdir langchain-myprovider
cd langchain-myprovider

# 初始化 package.json
cat > package.json << 'EOF'
{
  "name": "@langchain/myprovider",
  "version": "0.0.0",
  "type": "module",
  "main": "./index.js",
  "types": "./index.d.ts",
  "dependencies": {
    "@langchain/core": "workspace:*"
  }
}
EOF

# 创建 tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "extends": "@tsconfig/recommended",
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["ES2021"],
    "module": "NodeNext",
    "moduleResolution": "nodenext",
    "outDir": "./dist",
    "declaration": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

### 开发模式

```bash
# 监听模式构建
pnpm build --watch --filter=@langchain/core

# 链接到本地项目
cd libs/langchain-core
pnpm link --global

# 在你的项目中使用
cd your-project
pnpm link --global @langchain/core
```

### 代码规范

```bash
# 格式化代码
pnpm format

# Lint 检查
pnpm lint

# 修复自动修复的问题
pnpm lint --fix
```

## 🐛 调试技巧

### 1. VS Code 调试配置

创建 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current Test",
      "skipFiles": ["<node_internals>/**"],
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["test", "--", "${file}"],
      "console": "integratedTerminal",
      "env": {
        "NODE_OPTIONS": "--inspect-brk"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Example",
      "program": "${workspaceFolder}/examples/src/path/to/example.ts",
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal",
      "env": {
        "OPENAI_API_KEY": "${env:OPENAI_API_KEY}"
      }
    }
  ]
}
```

### 2. 日志输出

```typescript
// 启用 LangChain 调试日志
import { setVerbose } from '@langchain/core/utils/env';
setVerbose(true);

// 或在环境变量中设置
// export LANGCHAIN_VERBOSE=true
```

### 3. 回调调试

```typescript
import { ConsoleCallbackHandler } from 'langchain/callbacks';
import { CallbackManager } from '@langchain/core/callbacks/manager';

const manager = new CallbackManager();
manager.addHandler(new ConsoleCallbackHandler());

const model = new ChatOpenAI({
  modelName: 'gpt-4',
  callbackManager: manager
});
```

## 📝 测试指南

### 单元测试

```typescript
// src/tests/my_feature.test.ts
import { describe, it, expect } from '@jest/globals';
import { MyFeature } from '../my_feature.js';

describe('MyFeature', () => {
  it('should work correctly', async () => {
    const feature = new MyFeature();
    const result = await feature.invoke('input');
    expect(result).toBe('expected');
  });
});
```

### 集成测试

```typescript
// src/tests/integration.test.ts
import { test, expect } from '@playwright/test';
import { ChatOpenAI } from '@langchain/openai';

test('ChatOpenAI should generate response', async () => {
  const model = new ChatOpenAI({ 
    modelName: 'gpt-4',
    temperature: 0
  });
  
  const response = await model.invoke([
    new HumanMessage('Say hello')
  ]);
  
  expect(response.content).toBeTruthy();
});
```

### 模拟测试

```typescript
import { jest } from '@jest/globals';

// 模拟 API 调用
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({
      content: 'mocked response'
    })
  }))
}));
```

## 🏗️ 项目结构

```
langchainjs/
├── libs/
│   ├── langchain-core/        # 核心库
│   │   ├── src/
│   │   │   ├── runnables/     # LCEL 运行时
│   │   │   ├── language_models/
│   │   │   ├── messages/
│   │   │   ├── prompts/
│   │   │   └── ...
│   │   └── tests/
│   │
│   ├── langchain/             # 高级 API
│   ├── langchain-classic/     # 经典 API
│   └── providers/             # 提供商集成
│       ├── openai/
│       ├── anthropic/
│       └── ...
│
├── examples/                  # 示例代码
├── docs/                      # 官方文档
└── internal/                  # 内部工具
```

## 🔑 环境变量

创建 `.env` 文件 (不要提交到版本控制):

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=...

# Google
GOOGLE_API_KEY=...

# LangSmith (追踪)
LANGCHAIN_API_KEY=...
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=my-project

# 其他提供商
COHERE_API_KEY=...
AZURE_OPENAI_API_KEY=...
```

## 📦 发布流程

### 1. 更新版本号

```bash
# 使用 changesets
pnpm changeset

# 选择要更新的包和版本类型
# 提交 changeset 文件
```

### 2. 构建与测试

```bash
pnpm build
pnpm test
```

### 3. 发布

```bash
# 发布到 npm
pnpm release
```

## 💡 最佳实践

### ✅ 推荐

```typescript
// 1. 使用 TypeScript 严格模式
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}

// 2. 导出清晰的公共 API
export { MyFeature } from './my_feature.js';
export type { MyFeatureInput, MyFeatureOutput } from './types.js';

// 3. 编写类型安全的代码
function myFunction(input: string): Promise<string> {
  // 明确的输入输出类型
}

// 4. 添加 JSDoc 文档注释
/**
 * 执行 HTTP 请求
 * @param url - 请求 URL
 * @param options - 请求选项
 * @returns 响应文本
 */
async function fetchUrl(url: string, options?: RequestInit): Promise<string> {
  // ...
}
```

### ❌ 不推荐

```typescript
// 1. 避免使用 any 类型
function process(data: any): any { /* ❌ */ }

// 应该使用
function process(data: unknown): string { /* ✅ */ }

// 2. 避免硬编码 API Key
const model = new ChatOpenAI({ apiKey: 'sk-...' }); // ❌

// 使用环境变量
const model = new ChatOpenAI(); // ✅ 自动读取 OPENAI_API_KEY

// 3. 避免忽略错误处理
try {
  await model.invoke(messages);
} catch {} // ❌

// 添加错误处理
try {
  await model.invoke(messages);
} catch (e) {
  console.error('Model invocation failed:', e);
  throw e;
}
```

## 🔍 常见问题

### 1. pnpm 安装失败

```bash
# 清除缓存
pnpm store prune

# 重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 2. 构建错误

```bash
# 清理构建缓存
pnpm clean

# 重新构建
pnpm build
```

### 3. 测试超时

```bash
# 增加超时时间
pnpm test -- --testTimeout=60000
```

---

**源码参考**: `/Users/xilin/Documents/sources/langchainjs/`