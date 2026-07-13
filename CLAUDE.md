# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

勤怠管理デモアプリ（モノレポ）。SDD（仕様駆動開発）ワークショップ教材。

## パッケージ構成

- `packages/backend/` — Spring Boot 3.5 (Java 21, Gradle Kotlin DSL)
- `packages/frontend/` — Next.js 16 (React 19, TypeScript, Tailwind CSS 4)
- `packages/infra/` — AWS CDK (TypeScript)
- `docs/` — 要件・設計・過程ドキュメント

## コマンド

### セットアップ
```bash
npm run setup              # 全パッケージの依存解決
npm run db:up              # PostgreSQL 起動 (podman compose)
npm run db:down            # PostgreSQL 停止
```

### 開発サーバー
```bash
npm run boot               # Backend (dev profile, 要 PostgreSQL)
npm run boot:workshop      # Backend (workshop profile, H2 インメモリ DB)
npm run dev                # Frontend (Next.js dev server, :3000)
npm run dev:sagemaker      # SageMaker 用フルスタック起動 (proxy:3000 → next:3001 + backend:8080)
npm run dev:sagemaker:stop # SageMaker プロセス停止
```

### テスト・検証
```bash
npm run test:backend                                    # Backend 全テスト
npm run check:backend                                   # Backend テスト + Checkstyle + SpotBugs
npm run lint:frontend                                   # Frontend lint (Biome)
cd packages/frontend && npm test                        # Frontend 全テスト (Vitest)
cd packages/frontend && npx vitest run src/lib/api-client.test.ts  # 単一テスト
cd packages/backend && ./gradlew test --tests '*AttendanceIntegrationTest'  # 単一テストクラス
```

### ビルド・デプロイ
```bash
npm run build:backend      # bootJar
npm run build:frontend     # next build
npm run synth              # CDK synth (dev)
npm run deploy:dev         # CDK deploy (dev)
npm run deploy:prod        # CDK deploy (prod)
```

## アーキテクチャ

### Backend (Spring Boot)

ドメイン分割レイヤード。各ドメインが `controller/dto/entity/repository/service` を持つ:

```
com.example.attendance
├── attendance/    # 出退勤打刻・履歴・月次サマリ
├── auth/          # ログイン認証 (Spring Security, Cookie Session)
├── correction/    # 勤怠修正申請・承認
├── department/    # 部署管理
├── employee/      # 社員管理
├── report/        # 月次レポート (CSV/PDF via JasperReports)
└── common/        # SecurityConfig, GlobalExceptionHandler
```

- Service は interface + impl 分離
- DTO は Java `record`、Entity は Lombok
- DB マイグレーション: Flyway (`src/main/resources/db/migration/`)
- テスト DB: Testcontainers (PostgreSQL)。`workshop` profile は H2 インメモリ
- 静的解析: Checkstyle + SpotBugs + JaCoCo (80% カバレッジ必須)
- API ドキュメント: SpringDoc OpenAPI (`/swagger-ui.html`)

### Frontend (Next.js)

App Router。認証済みページは `(authenticated)/` route group で保護:

```
src/
├── app/              # App Router pages
│   ├── (authenticated)/  # 認証必須 (dashboard, attendance, history, team, corrections, admin)
│   └── login/
├── features/         # ドメイン別 (attendance, auth, correction, department, employee, report)
│   └── <domain>/     # Table, FormDialog, *-api.ts, use*.ts
├── components/       # 共有 UI (DataTable, FormDialog, ConfirmDialog, layout/, ui/)
└── lib/              # api-client.ts (全 fetch の基盤), validators.ts
```

- 状態管理: TanStack Query
- UI: shadcn/ui + Tailwind CSS
- Lint: Biome
- テスト: Vitest + Testing Library
- SageMaker 環境では `withBasePath()` で全 fetch に basePath を前置

### Frontend → Backend 接続

Next.js の rewrites (`/api/*` → `localhost:8080/api/*`) でプロキシ。本番は static export。

## Spring Profiles

| Profile | DB | 用途 |
|---------|----|----|
| `dev` | PostgreSQL (localhost:5432) | ローカル開発 |
| `workshop` | H2 インメモリ (PostgreSQL モード) | SageMaker ワークショップ (DB 不要) |
| `test` | Testcontainers PostgreSQL | 自動テスト |

## SageMaker クイックリファレンス

```bash
npm run dev:sagemaker        # 起動
npm run dev:sagemaker:stop   # 停止
```

アクセス: PORTS タブの地球儀 → URL の `ports` を `absports` に置換（例: `.../absports/3000/`）

## Claude Code ハーネス

`.claude/` に rules / skills / agents を同梱。詳細は `.claude/README.md`。

> **スキルの起動方針（ワークショップ）**: SDD 工程スキル（`requirements` / `design` / `work-decomposition` / `tdd-implementation`）は **明示的に指定されたときのみ** 使用し、自動では起動しない。

## docs/path ルール

デモの過程を `docs/path/` に番号付きファイル（`00-xxx.md`）で記録する。
新ステップに進んだら新ファイルを作成。プロンプト・やったこと・つまずき・最終構成を含める。
