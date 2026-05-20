import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'LangChainJS 源码深度解析',
  description: '深入剖析 LangChainJS 架构、LCEL、Agent 系统与 35+ 提供商集成',
  lang: 'zh-CN',
  base: '/langchainjs-source-code-analysis/',
  lastUpdated: true,
  
  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: '指南', link: '/guide/' },
      { text: '核心架构', link: '/architecture/' },
      { text: 'LCEL', link: '/lcel/' },
      { text: '组件', link: '/components/' },
      { text: '集成', link: '/integrations/' },
    ],
    
    sidebar: {
      '/guide/': [
        {
          text: '入门指南',
          items: [
            { text: '项目概览', link: '/guide/getting-started' },
            { text: '源码结构', link: '/guide/structure' },
            { text: '开发调试', link: '/guide/development' },
          ]
        }
      ],
      '/architecture/': [
        {
          text: '核心架构',
          items: [
            { text: '架构总览', link: '/architecture/overview' },
            { text: 'Monorepo 结构', link: '/architecture/monorepo' },
            { text: 'LangChain Core', link: '/architecture/langchain-core' },
            { text: '包依赖关系', link: '/architecture/dependencies' },
          ]
        }
      ],
      '/lcel/': [
        {
          text: 'LCEL 表达式语言',
          items: [
            { text: 'LCEL 总览', link: '/lcel/overview' },
            { text: 'Runnable 接口', link: '/lcel/runnable-interface' },
            { text: 'RunnableSequence', link: '/lcel/runnable-sequence' },
            { text: 'RunnableParallel', link: '/lcel/runnable-parallel' },
            { text: 'RunnableMap', link: '/lcel/runnable-map' },
            { text: 'RunnableLambda', link: '/lcel/runnable-lambda' },
            { text: 'RunnableBranch', link: '/lcel/runnable-branch' },
            { text: '绑定与配置', link: '/lcel/binding-config' },
            { text: '流式处理', link: '/lcel/streaming' },
          ]
        }
      ],
      '/components/': [
        {
          text: '核心组件',
          items: [
            { text: '组件总览', link: '/components/overview' },
            { text: '语言模型', link: '/components/language-models' },
            { text: '提示模板', link: '/components/prompts' },
            { text: '消息系统', link: '/components/messages' },
            { text: '输出解析器', link: '/components/output-parsers' },
            { text: '嵌入模型', link: '/components/embeddings' },
            { text: '向量存储', link: '/components/vectorstores' },
            { text: 'Agent 系统', link: '/components/agents' },
            { text: '工具定义', link: '/components/tools' },
            { text: '记忆系统', link: '/components/memory' },
            { text: '文档加载器', link: '/components/document-loaders' },
            { text: '文本分割器', link: '/components/text-splitters' },
            { text: '检索器', link: '/components/retrievers' },
          ]
        }
      ],
      '/integrations/': [
        {
          text: '回调与追踪',
          items: [
            { text: '回调系统', link: '/integrations/callbacks' },
            { text: '追踪系统', link: '/integrations/tracers' },
          ]
        },
        {
          text: '存储与缓存',
          items: [
            { text: '缓存系统', link: '/integrations/caches' },
            { text: '存储抽象', link: '/integrations/stores' },
          ]
        },
        {
          text: '提供商集成',
          items: [
            { text: 'OpenAI', link: '/integrations/providers/openai' },
            { text: 'Anthropic', link: '/integrations/providers/anthropic' },
            { text: '其他 LLM', link: '/integrations/providers/llms' },
            { text: '向量数据库', link: '/integrations/providers/vectorstores' },
          ]
        }
      ],
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/xuyuxiong/langchainjs-source-code-analysis' }
    ],
    
    footer: {
      message: '基于 LangChainJS 源码分析 | MIT License',
      copyright: 'Copyright © 2024'
    },
    
    search: {
      provider: 'local'
    }
  },
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ]
})