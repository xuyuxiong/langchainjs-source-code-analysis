import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'LangChainJS 源码深度解析',
  description: 'LangChainJS 源码深度解析 - 从 LCEL 到 Agent 系统',
  base: '/langchainjs-source-code-analysis/',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#1c1c1c' }],
  ],

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: '架构', link: '/architecture/overview' },
      { text: 'LCEL', link: '/lcel/overview' },
      { text: '组件', link: '/components/overview' },
      { text: '集成', link: '/integrations/callbacks' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南篇',
          items: [
            { text: '项目概览', link: '/guide/getting-started' },
            { text: '源码结构', link: '/guide/structure' },
            { text: '开发调试', link: '/guide/development' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: '架构篇',
          items: [
            { text: '架构总览', link: '/architecture/overview' },
            { text: 'Monorepo 结构', link: '/architecture/monorepo' },
            { text: 'LangChain Core', link: '/architecture/langchain-core' },
            { text: '包依赖关系', link: '/architecture/dependencies' },
          ],
        },
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
            { text: '参数绑定', link: '/lcel/binding-config' },
            { text: '流式处理', link: '/lcel/streaming' },
          ],
        },
      ],
      '/components/': [
        {
          text: '组件篇',
          items: [
            { text: '组件总览', link: '/components/overview' },
            { text: '语言模型', link: '/components/language-models' },
            { text: '消息系统', link: '/components/messages' },
            { text: '提示模板', link: '/components/prompts' },
            { text: '嵌入模型', link: '/components/embeddings' },
            { text: '向量存储', link: '/components/vectorstores' },
            { text: '输出解析器', link: '/components/output-parsers' },
            { text: '工具系统', link: '/components/tools' },
            { text: '记忆管理', link: '/components/memory' },
            { text: '文档加载器', link: '/components/document-loaders' },
            { text: '文本分割器', link: '/components/text-splitters' },
            { text: '检索器', link: '/components/retrievers' },
          ],
        },
      ],
      '/integrations/': [
        {
          text: '集成篇',
          items: [
            { text: '回调系统', link: '/integrations/callbacks' },
            { text: '追踪器', link: '/integrations/tracers' },
            { text: '缓存系统', link: '/integrations/caches' },
            { text: 'KV 存储', link: '/integrations/stores' },
            { text: 'OpenAI 集成', link: '/integrations/providers/openai' },
            { text: 'Anthropic 集成', link: '/integrations/providers/anthropic' },
            { text: '其他 LLM', link: '/integrations/providers/llms' },
            { text: '向量数据库', link: '/integrations/providers/vectorstores' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xuyuxiong/langchainjs-source-code-analysis' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present',
    },

    outline: {
      label: '本页目录',
      level: [2, 3],
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                },
              },
            },
          },
        },
      },
    },
  },
  
  markdown: {
    theme: {
      light: 'vitesse-light',
      dark: 'vitesse-dark',
    },
  },
})