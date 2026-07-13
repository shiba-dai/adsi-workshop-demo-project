# コードレビュー結果

- **実施日**: 2026-07-13
- **対象**: packages/backend, packages/frontend 全体
- **レビュー観点**: Java/Spring Boot, TypeScript/Next.js, セキュリティ, テスト品質

---

## サマリ

| 観点 | CRITICAL | HIGH | MEDIUM | LOW |
|------|:--------:|:----:|:------:|:---:|
| Java / Spring Boot | 0 | 8 | 6 | 5 |
| TypeScript / Next.js | 0 | 11 | 5 | 4 |
| セキュリティ | 2 | 2 | 4 | 2 |
| テスト品質 | 0 | 2 | 8 | 7 |
| **合計** | **2** | **23** | **23** | **18** |

**総合判定: Block** (CRITICAL あり — マージ前に修正が必要)

---

## 1. セキュリティ

### CRITICAL

| # | ファイル | 行 | 内容 |
|---|---------|----|----|
| S-1 | `attendance/controller/AttendanceController.java` | 31-61 | **IDOR (Insecure Direct Object Reference)**: 全 attendance エンドポイントが `employeeId`, `managerId` を `@RequestParam` で受け取るが、認証済みユーザーとの一致検証がない。任意のユーザーの出退勤操作・閲覧が可能。 |
| S-2 | `correction/controller/CorrectionController.java` | 37-68 | **IDOR**: 修正申請エンドポイントが `requesterId`, `managerId`, `approverId` を検証なしに受け取る。他ユーザーとして申請作成・承認が可能。 |

### HIGH

| # | ファイル | 行 | 内容 |
|---|---------|----|----|
| S-3 | `common/config/CorsConfig.java` | 26 | **CORS ワイルドカードヘッダー**: `setAllowedHeaders(List.of("*"))` で全ヘッダーを許可。明示的なホワイトリストに制限すべき。 |
| S-4 | `common/config/SecurityConfig.java` | 61 | **CSRF トークンが HttpOnly=false**: SPA パターンのため意図的だが、XSS 攻撃面が拡大。トレードオフを文書化するか代替策を検討。 |

### MEDIUM

| # | ファイル | 行 | 内容 |
|---|---------|----|----|
| S-5 | `application-dev.yaml` | 9 | ハードコードされた DB パスワード (`attendance`)。dev 限定だが本番流用を防ぐ注記が必要。 |
| S-6 | `application-workshop.yaml` | 20-21 | H2 Console 有効 (`/h2-console`)。ワークショップ限定だがプロダクション投入不可。 |
| S-7 | `application.yaml` | 21 | Actuator エンドポイント (`health,info,metrics`) が認証なしで公開。本番では制限必要。 |
| S-8 | `SecurityConfig.java` | 87-88 | Actuator / Swagger UI が `permitAll()`。本番環境では認証必須にすべき。 |

### LOW

| # | ファイル | 行 | 内容 |
|---|---------|----|----|
| S-9 | `CorrectionForm.tsx` | 23 | クライアント側のみのバリデーション。Backend にも `@Valid` あり問題ないが、文書化推奨。 |
| S-10 | `SecurityConfig.java` | 64-65 | login/logout への CSRF 免除。セッション認証では標準的だが文書化推奨。 |

---

## 2. Java / Spring Boot

### HIGH (N+1 クエリ)

| # | ファイル | 行 | 内容 |
|---|---------|----|----|
| J-1 | `AttendanceServiceImpl.java` | 122-125 | `getTeamAttendance()` で `manager.getDepartment().getId()` が LAZY fetch → 追加クエリ発行。 |
| J-2 | `AttendanceServiceImpl.java` | 138-164 | `buildTeamSummaries()` で `r.getEmployee().getId()` (146行) が N+1 を起こす。 |
| J-3 | `CorrectionServiceImpl.java` | 88-92 | `findPending()` で manager の department を LAZY ロード + correction の requester/approver も LAZY fetch。 |
| J-4 | `ReportServiceImpl.java` | 56-82 | `getMonthlyReport()` で `emp.getDepartment().getName()` (75行) が N+1 発生。 |
| J-5 | `EmployeeResponse.java` | 20-32 | `from()` で `employee.getDepartment().getId()/getName()` → Employee リスト変換時に N+1。 |
| J-6 | `CorrectionResponse.java` | 26-46 | `from()` で requester/approver への複数アクセス → LAZY fetch で N+1。 |
| J-7 | `AttendanceCorrectionRepository.java` | 17-18 | `findByRequesterDepartmentIdAndStatus...()` が JOIN なし → 後続 DTO 変換で N+1。 |
| J-8 | `AttendanceServiceImpl.java` | 191-208 | attendance records の employee が LAZY fetch のため N+1 の可能性。 |

### MEDIUM

| # | ファイル | 行 | 内容 |
|---|---------|----|----|
| J-9 | `Employee.java` | 37-73 | Entity フィールドが `final` でない（JPA 制約上やむを得ないが、業務ロジックでの直接変更に注意）。 |
| J-10 | `AttendanceRecord.java` | 35-62 | 同上。 |
| J-11 | `AttendanceCorrection.java` | 38-80 | 同上。 |
| J-12 | `EmployeeServiceImpl.java` | 96-117 | `update()` が 22 行。バリデーション・取得・更新・保存が混在。分割検討。 |
| J-13 | `AttendanceServiceImpl.java` | 166-189 | `buildDailyResponses()` で WorkDuration 計算と DTO 変換が混在。 |
| J-14 | `CorrectionServiceImpl.java` | 99-132 | `approve()` が 34 行で 30 行超過。既存レコード更新と新規作成に分割推奨。 |

### LOW

| # | ファイル | 行 | 内容 |
|---|---------|----|----|
| J-15 | `AttendanceServiceImpl.java` | 101 | `List.copyOf(responses)` が冗長（`toList()` は既にイミュータブル）。 |
| J-16 | `AttendanceServiceImpl.java` | 116 | 同上。`List.copyOf(days)` が冗長。 |
| J-17 | `ReportServiceImpl.java` | 84 | 同上。`List.copyOf(records)` が冗長。 |
| J-18 | `EmployeeServiceImpl.java` | 59-60 | `findAll()` の結果は Spring Data Page でイミュータブル。問題なし。 |
| J-19 | `SecurityConfig.java` | 82-113 | `configureAuthorization()` が 32 行で超過だが、設定列挙のため可読性は問題なし。 |

---

## 3. TypeScript / Next.js

### HIGH

| # | ファイル | 行 | 内容 |
|---|---------|----|----|
| T-1 | `features/attendance/ClockButtons.tsx` | 66 | **ロジックバグ**: `canClockIn = status === "NOT_CLOCKED_IN" || status !== "CLOCKED_OUT"` は CLOCKED_OUT 以外で常に true。出勤済みでも出勤ボタンが有効になる。 |
| T-2 | `features/attendance/useAttendance.ts` | 24 | Non-null assertion (`employeeId!`)。`enabled: !!employeeId` でガードされるが型安全でない。 |
| T-3 | `features/attendance/useAttendance.ts` | 35 | Non-null assertion (`user!.id`) in clockIn mutation。user が null になり得る。 |
| T-4 | `features/attendance/useAttendance.ts` | 48 | Non-null assertion (`user!.id`) in clockOut mutation。同上。 |
| T-5 | `features/attendance/useAttendance.ts` | 62 | Non-null assertion (`employeeId!`) in fetchHistory。 |
| T-6 | `features/attendance/useAttendance.ts` | 72 | Non-null assertion (`user!.id`) in fetchTeamAttendance。 |
| T-7 | `features/correction/useCorrections.ts` | 25 | Non-null assertion (`requesterId!`) in fetchCorrections。 |
| T-8 | `features/correction/useCorrections.ts` | 36 | Non-null assertion (`user!.id`) in createCorrection。 |
| T-9 | `features/correction/useCorrections.ts` | 52 | Non-null assertion (`user!.id`) in fetchPendingCorrections。 |
| T-10 | `features/correction/useCorrections.ts` | 63 | Non-null assertion (`user!.id`) in approveCorrection。 |
| T-11 | `features/correction/useCorrections.ts` | 88 | Non-null assertion (`user!.id`) in rejectCorrection。 |

### MEDIUM

| # | ファイル | 行 | 内容 |
|---|---------|----|----|
| T-12 | `app/(authenticated)/dashboard/page.tsx` | 1 | `"use client"` だがサーバーコンポーネントで十分。クライアントコンポーネントを子として描画するだけ。 |
| T-13 | `app/(authenticated)/admin/reports/page.tsx` | 1 | 同上。不要な `"use client"`。 |
| T-14 | `features/employee/EmployeeFormDialog.tsx` | 148 | `Select` の value に `form.departmentId || null` を渡すが型不整合。 |
| T-15 | `features/employee/EmployeeFormDialog.tsx` | 171 | `?? "EMPLOYEE"` が冗長（Select の value は既に型制約済み）。 |
| T-16 | Frontend 全体 | — | テストカバレッジ約 10%（7 テストファイル / 75+ 実装ファイル）。目標 80% に大幅未達。 |

### LOW

| # | ファイル | 行 | 内容 |
|---|---------|----|----|
| T-17 | `features/auth/useAuth.ts` | 32 | `router.push("/")` — Next.js は basePath を自動処理するが、`withBasePath` との一貫性がない。 |
| T-18 | `features/auth/useAuth.ts` | 45 | `router.push("/login")` — 同上。 |
| T-19 | 複数ファイル | — | Biome レポートで import ソート・改行のフォーマット問題あり。`npm run lint:fix` で自動修正可。 |
| T-20 | `components/DataTable.tsx` | 52 | `String(item[col.key] ?? "")` がネストオブジェクトで `[object Object]` になる可能性。 |

---

## 4. テスト品質

### HIGH

| # | ファイル | 行 | 内容 |
|---|---------|----|----|
| TE-1 | `common/controller/SystemController.java` | — | SystemController (`/api/system/health`) にテストなし。監視用エンドポイントのテスト必須。 |
| TE-2 | `correction/repository/AttendanceCorrectionRepository.java` | — | カスタムクエリメソッドに `@DataJpaTest` なし。クエリ正当性の検証が不足。 |

### MEDIUM

| # | ファイル | 行 | 内容 |
|---|---------|----|----|
| TE-3 | `frontend/src/features/correction/` | — | 修正申請フロー全体のコンポーネントテストなし（CorrectionForm, CorrectionList, ApprovalActions, PendingCorrectionList）。 |
| TE-4 | `frontend/src/features/employee/` | — | 社員管理コンポーネントテストなし（EmployeeTable, EmployeeFormDialog, EmployeeFilters, ManagerToggle, RetireDialog）。 |
| TE-5 | `frontend/src/features/department/` | — | 部署管理コンポーネントテストなし。 |
| TE-6 | `frontend/src/features/report/` | — | レポートコンポーネントテストなし（ExportButtons, MonthlyReportTable）。 |
| TE-7 | `frontend/src/features/attendance/` | — | 出退勤コンポーネントテストなし（ClockButtons, AttendanceTable, TodayRecords）。 |
| TE-8 | `attendance/service/AttendanceServiceTest.java` | 88-98 | `clockIn_normal_createsRecord` に 7 アサーション。単一責務に分割推奨。 |
| TE-9 | `correction/service/CorrectionServiceTest.java` | 275-282 | `approve_existingRecord_updatesAttendanceRecord` に複数アサーション。分割推奨。 |
| TE-10 | Backend 全体 | — | 空結果のエッジケーステストなし（履歴 0 件、保留中修正 0 件など）。 |
| TE-11 | Backend 全体 | — | 境界値テストなし（6 時間ちょうどの勤務、月の営業日数上限など）。 |
| TE-12 | `architecture/LayerDependencyTest.java` | — | ArchUnit で Service → Controller の逆依存チェックが不足。 |

### LOW

| # | ファイル | 行 | 内容 |
|---|---------|----|----|
| TE-13 | `report/service/PdfExportServiceTest.java` | 23-41 | PDF マジックバイト (`%PDF`) のみ検証。内容の構造検証なし。 |
| TE-14 | `report/service/CsvExportServiceTest.java` | 47-63 | BOM チェックが独立テストとして分離されていない。 |
| TE-15 | `auth/service/AuthServiceTest.java` | 30-32 | `mock()` 直接呼び出し。他テストとの一貫性のため `@Mock` + `@ExtendWith` 推奨。 |
| TE-16 | `attendance/service/AttendanceServiceTest.java` | 246-248 | absent days=21 のマジックナンバー。計算ロジックの検証テストまたはコメント必要。 |
| TE-17 | `correction/service/CorrectionServiceTest.java` | 388-394 | 自己承認テスト — ビジネスルールとして意図的かセキュリティ問題か文書化必要。 |
| TE-18 | Backend 全体 | — | `@MockBean` 未使用（`@MockitoBean` 使用）、Spring Boot 4.x 準拠。良好。 |
| TE-19 | Backend 全体 | — | `Thread.sleep()` 未使用。テスト安定性良好。 |

---

## 推奨対応（優先度順）

### 1. CRITICAL — 即時対応

- **S-1, S-2**: IDOR 修正。`SecurityContextHolder` から認証ユーザーを取得し、リクエストパラメータの `employeeId`/`managerId` と一致するか検証するロジックを Service 層に追加。

### 2. HIGH — マージ前に対応

- **T-1**: `ClockButtons.tsx` のロジックバグ修正（`canClockIn` 条件式）
- **J-1〜J-8**: N+1 クエリ対策。`@EntityGraph` または `JOIN FETCH` クエリを追加
- **T-2〜T-11**: Non-null assertion を型ガードまたは `useRequiredAuth()` カスタム hook に置換
- **S-3**: CORS の `allowedHeaders` を明示的リストに変更

### 3. MEDIUM — 次スプリントで対応

- Frontend テストカバレッジの向上（現在 10% → 目標 80%）
- `CorrectionServiceImpl.approve()` のメソッド分割
- Repository のカスタムクエリに `@DataJpaTest` 追加
- Actuator / Swagger の本番環境向けアクセス制御

### 4. LOW — 改善として随時

- 冗長な `List.copyOf()` の除去
- Biome lint の自動修正
- テストのアサーション分割
