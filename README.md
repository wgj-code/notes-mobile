# notes-mobile

6A Demo 项目 · 个人笔记 App Mobile 端(Expo React Native + TypeScript)。

## 环境要求

- Node.js >= 20
- Expo CLI(全局或 npx)
- EAS CLI(构建 Android/iOS 需要)

## 本地启动

```bash
npm install
npm start          # Expo Dev Server
npm run android    # Android Emulator
npm run web        # Web 预览(调试用)
```

## 环境变量

复制 `.env.example` 为 `.env` 并填值:

- `EXPO_PUBLIC_SUPABASE_URL` — Supabase 项目 URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon public key

CI / EAS Build 通过 GitHub Secrets 注入,本地用 `.env`。

## 构建与分发

EAS Build + Internal Distribution:

```bash
eas build -p android --profile preview    # Android APK(当前默认)
# iOS 暂缓,待 Apple Developer 账号就绪(P1 阶段)
```

## 契约引用

`notes-contracts` 作为 git submodule 引用,提供 API 契约 + TypeScript 类型:

```bash
git submodule update --init --recursive
```

## 项目归属

组A(Mobile 线)主力仓。CODEOWNERS 见 `.github/CODEOWNERS`。Agent 花名册(组A):

- 产品 Agent / 架构 Agent / 开发 Agent / 测试 Agent / 运维 Agent
- 组A PL Agent

## 关联文档

- [A1 基础设施实例化 Checklist](https://www.feishu.cn/wiki/ZHlhwUPK7i8oDBkCem4cvb4FnUc)
- [6A 压测报告 v0.1](https://www.feishu.cn/wiki/ZBptwnRdfiVDdzk3164ckmyHn3o)
- [M1 · Demo 启动方案](https://www.feishu.cn/wiki/QjTVwR7OOi8WZakBRqTcgbGenAb)
- 项目主控:`~/6a-demo-notes/README.md`
