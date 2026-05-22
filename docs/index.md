---
layout: home

hero:
  name: LangChainJS 源码深度解析
  text: LangChainJS 完整源码学习指南
  tagline: 从 LCEL 到 Agent 系统，全面掌握 LangChain 核心原理
  image:
    src: /langchain-logo.svg
    alt: LangChain Logo
  actions:
    - theme: brand
      text: 开始学习
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/xuyuxiong/langchainjs-source-code-analysis

features:
  - icon: 🔗
    title: LangChainJS 0.3+
    details: 全面覆盖 LangChainJS 最新特性，包括 LCEL 表达式语言、Runnable 接口、Agent 系统等
  - icon: 📚
    title: 渐进式学习
    details: 从指南篇 → 架构篇 → LCEL → 组件篇 → 集成篇，自顶向下，符合认知规律
  - icon: 🔍
    title: 源码调试
    details: 手把手教你搭建调试环境，深入理解每一行代码
  - icon: 🎯
    title: 图解丰富
    details: 大量架构图、流程图、类层次图，让抽象概念可视化
  - icon: ⚙️
    title: 核心抽象
    details: 深入解析 Runnable 接口、LCEL 表达式语言、消息系统等核心设计
  - icon: 🌙
    title: 暗色模式
    details: 支持亮色/暗色主题切换，舒适阅读体验

---

## 📖 为什么学习 LangChainJS 源码？

<div class="why-learn">

**很多同学有这样的困惑：**

- LangChain 能用，但不知道 LCEL 怎么实现的
- Runnable 接口到底有什么作用？
- LangChain 的架构设计为什么这样组织？
- 如何自定义组件和集成新模型？

**学习源码能帮你：**

1. ✅ 理解 LangChain 的设计理念，写出更优雅的 AI 应用代码
2. ✅ 掌握 LCEL 表达式语言的本质，灵活组合各种组件
3. ✅ 信心满满地使用新特性和集成新模型
4. ✅ 甚至成为 LangChain 贡献者

</div>

## 🗺️ 学习路线

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   指南篇    │ ──► │   架构篇    │ ──► │   LCEL 篇   │
│  入门准备   │     │  设计思想   │     │ 表达式语言  │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   集成篇    │ ◄── │   组件篇    │ ◄── │  进阶主题  │
│  提供商集成 │     │  核心组件   │     │  高级用法  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 📋 内容概览

### 指南篇
学习前的准备工作，包括环境搭建、调试方法、源码结构等

### 架构篇
理解 LangChainJS 为什么这样设计，Monorepo 架构、核心抽象层、包依赖关系等

### LCEL 篇
深入 LangChain 表达式语言，Runnable 接口、Sequence、Parallel、Map 等核心组件

### 组件篇
逐行分析语言模型、消息系统、提示模板、嵌入模型、向量存储等核心功能

### 集成篇
OpenAI、Anthropic 等提供商集成详解，以及如何自定义集成

## 👥 谁适合学习？

- ✅ 有 1-2 年 LangChain 使用经验
- ✅ 熟悉 JavaScript/TypeScript
- ✅ 对 LLM 应用开发有热情
- ✅ 愿意投入时间深入学习

## 📝 关于本项目

本项目系统性解析 LangChainJS 源码架构和核心实现。

相比其他资料，本项目的特点：
- 🆕 **内容完整**：37 篇文档覆盖 LangChainJS 核心模块
- 📊 **图解更多**：大量可视化架构图和类层次图
- ⚙️ **深度解析**：详细解析 LCEL 表达式语言和 Runnable 接口
- 📱 **现代化体验**：响应式设计、暗色模式、代码高亮

<style>
.why-learn {
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  padding: 24px;
  margin: 24px 0;
}
</style>