# hongyu-admin

[根目录](../CLAUDE.md) > **hongyu-admin**

## 变更记录 (Changelog)

| 时间 | 说明 |
|------|------|
| 2026-10-19T10:14:00+08:00 | 模块级详尽扫描：schema、导航、双鉴权、Front/Admin API、学院/内容/电商域 |

## 模块职责

HONGYU Medical **后台运营平台 + 全部前台 REST API + 数据库层**。工程结构继承 `vexmotor-admin`。运行 **http://localhost:5100**；根路径重定向到 `/admin`。

职责切分：

| 路径前缀 | 用途 |
|----------|------|
| `/admin` | 运营 UI（Ant Design + Auth.js Credentials） |
| `/api/admin/*` | 后台管理 API（需管理员会话） |
| `/api/front/*` | 前台 REST（CORS 对 web/course 开放） |
| `/api-doc` | Swagger UI；`/api/openapi.json` OpenAPI |

## 入口与启动

- **Dev**：`pnpm dev` → `node scripts/dev-server.mjs --db`（可联动 DB）
- **Prod**：`pnpm build` / `pnpm start -p 5100`
- **DB**：`db:generate` / `db:push` / `db:migrate` / `db:seed` / `db:studio`
- **默认管理员**（seed）：`admin@lianchuan.local` / `Admin123456`
- **Schema 真相**：`src/server/db/schema.ts`
- **迁移**：`drizzle/*.sql`（已至 0030+）

关键环境变量见 `.env.example`：`DATABASE_URL`、`AUTH_SECRET`、`JWT_SECRET`、`ADMIN_URL`、`SITE_URL`、`COURSE_SITE_URL`、R2、Stripe、SMTP、Google OAuth、文本翻译 LLM。

## 对外接口

### 后台导航（产品模块）

来源 `src/lib/admin-navigation.ts`：

1. **仪表盘** `/admin`
2. **产品管理**：产品、产品看板
3. **订单管理**（侧栏名；实际主推）：询盘、客户（订单/退款等页面仍存在，属模板遗产）
4. **企业内容**：企业叙事、解决方案、认证术者、合作中心、行业峰会、市场活动、企业信息、社交媒体、首页配置、网站配置
5. **内容管理**：内容看板、博客、其他内容（法务等 slug 页）
6. **课程管理**：证书、课程、题库、考试记录
7. **站点管理**：多语言、主站文案、课程站文案

### Front API（消费端）

契约：`docs/openapi.front.yaml`。实现约 **111** 个 `route.ts`，域包括：

- **内容 CMS**：homepage、website-config、company、social-media、solutions、brand-narratives、products、insights/blog、pages、summits、market-events、partner-centers、surgeons、ui-strings、course-ui-strings、languages
- **学院**：certificates/courses、progress、notes、exams、my-certificates、my-exams、certs 核验、home 个性化
- **获客**：inquiries、upload
- **账号**：auth（login/register/oauth/password/verify）、profile
- **电商遗产**：cart、checkout、orders、wishlist、compare、commerce、coupons 相关后台等

### Admin API

约 **132** 个路由：与导航域一一对应，另含 media-assets/presign、upload、AI translate、shipping/exchange-rates/coupons 等。

### 服务层布局

```
src/server/
  admin/        # 后台写路径业务
  storefront/   # Front 读/会员写路径
  auth/         # 管理员与会员认证
  db/           # schema、seed
  payments/     # stripe、airwallex
  email/ oss/ ai/
```

## 关键依赖与配置

| 类别 | 技术 |
|------|------|
| 框架 | Next 16、React 19、TypeScript |
| UI | antd 6、@ant-design/icons、dnd-kit、TinyMCE |
| ORM | drizzle-orm + postgres（Neon） |
| 鉴权 | next-auth 5 beta、jose JWT |
| 存储 | @aws-sdk S3 兼容 → Cloudflare R2 |
| 支付 | stripe；airwallex（遗留未付订单） |
| 校验 | zod |
| 文档 | next-swagger-doc、swagger-ui-react |

`next.config.ts`：`/` → `/admin`；R2 图片 remotePatterns；openapi rewrite。

## 数据模型（领域）

### 角色与权限

| 角色枚举 | 值 | 用途 |
|----------|-----|------|
| `admin_role` | `admin`, `super_admin` | 后台运营账号 |
| `admin_status` | `active`, `disabled` | 禁用即无法登录 |
| `user_role` | `customer`, `staff`, `admin` | 前台会员（学院/询盘） |
| `user_status` | `active`, `disabled`, `pending` | 审核/禁用 |

细粒度 RBAC 未在导航层拆分（侧栏对登录管理员全开）；接口层以「是否有 admin session / front user id」为主。

### 核心实体簇

1. **身份**：`users`、`admins`、`accounts`、sessions/verificationTokens  
2. **目录电商**：categories/brands/products/variants/inventory、carts/orders/refunds、coupons、shipping、geo  
3. **询盘**：`inquiries`、`inquiry_messages`、销售状态枚举  
4. **企业 CMS**：brand_narratives、solutions、surgeons、partner_centers、summits、market_events、company_profiles、homepage_configs、website_configs、social_media、editorial_*  
5. **学院**：  
   - 结构：`academy_certificates` → `academy_certificate_courses` → `academy_courses` → units → lessons  
   - 题库：`academy_question_banks` / questions ↔ certificate  
   - 进度：views、lesson_completions、certificate_course_progress、certificate_progress、lesson_notes  
   - 考试发证：`academy_exam_attempts`、`academy_user_certificates`（证书编号唯一）  
6. **i18n**：各实体 `*_i18n` 表 + `site_languages` + `ui_strings`

几乎所有可展示内容均为 **主表 + locale 翻译表**，Front 按 `x-vex-locale` 选择文案。

## 鉴权细节

- **后台**：`src/auth/admin-auth.ts` → basePath `/api/admin/auth`；middleware 用 `getToken` 保护 `/admin`（除 login）。
- **前台**：`signFrontAccessToken` / `verifyFrontAccessToken`；`getFrontUserIdFromRequest` 读 Bearer 或 `access_token` query。
- **OAuth**：`src/auth/front-oauth.ts`，basePath `/api/front/auth/oauth`，回调后带 token 回 `SITE_URL`。
- **CORS**：middleware 对 `/api/front/*` 注入 Allow-Origin（web + course）。

## 测试与质量

- `pnpm check` = eslint + tsc  
- Playwright 已安装；脚本侧有 audit/seed 辅助  
- OpenAPI 为 Front 契约源

## 常见问题 (FAQ)

**Q: web README 写「本期静态不对接 API」，实际呢？**  
A: 代码已大量对接 Front API（homepage、solutions、insights 等）；README 可能滞后。以 `src/lib/storefront-*-api.ts` 为准。

**Q: 侧栏没有订单，但有 `/admin/orders` 页面？**  
A: 电商后台页面仍在，导航已收敛为询盘/客户；属模板遗产，需按产品策略启用。

**Q: 课程站 CORS？**  
A: 设置 `COURSE_SITE_URL`，admin 会自动并入允许源。

## 相关文件清单

| 路径 | 说明 |
|------|------|
| `src/server/db/schema.ts` | 全库表与枚举 |
| `src/lib/admin-navigation.ts` | 后台信息架构 |
| `src/middleware.ts` | CORS + admin 登录门 |
| `src/auth/admin-auth.ts` / `front-oauth.ts` | 双 Auth.js |
| `docs/openapi.front.yaml` | Front 契约 |
| `src/server/storefront/academy-*.ts` | 学院读/学路径 |
| `src/server/admin/academy-*.ts` | 学院运营写路径 |
| `.env.example` | 环境变量模板 |
