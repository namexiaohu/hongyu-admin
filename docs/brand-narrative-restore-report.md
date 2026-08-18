# 叙事四页还原度报告（阶段 A）

生成时间：2026-08-18  
参考站：https://hongyutest.chanyechuhai.com/

## 已完成

1. 清空并重建 DB 四条叙事（about / patents / history / training）
2. 补全 about、training 的 hero stats
3. 从原站下载 15 张图片至 `hongyu-web/public/images/`
4. 增强 `mapBlocksToSections`：按区块 `id` 与文案启发式输出 7 种前台 section
5. Seed 仅写入现有 UI 等价字段（无 hidden JSON）

## 各页 section 映射（预期）

| 页面 | sections 顺序 |
|------|---------------|
| about | split → header-grid(values) → split → header-grid(certs) → cta |
| patents | patent-grid → split(rd) → header-grid(innovation) → cta |
| history | timeline → header-grid(outlook) → cta |
| training | program-grid → schedule → cta |

## 阶段 A 还原情况

| 能力 | 状态 | 说明 |
|------|------|------|
| Hero 文案/封面 | ✅ | 四页对齐 |
| Stats 指标条 | ✅ | about / patents / training 已有 |
| 价值 3 列卡 + 图标 | ✅ | about values |
| 资质认证 2 列卡 | ✅ | 靠 block.id=certs 映射 |
| 专利 6 卡片 | ⚠️ | 版式正确，**无标签 tags** |
| 研发 rd-split 分栏 | ✅ | 靠 eyebrow「研发能力」启发式 |
| 创新亮点带配图 | ✅ | coverImage 写入子项（seed 专用，后台 summary 子项暂无封面图 UI） |
| 时间轴 + 配图 | ✅ | history timeline |
| 时间轴标签 tags | ❌ | 无 UI 字段 |
| 未来展望年份卡 | ✅ | block.id=outlook |
| 培训课程 Banner + meta | ⚠️ | program-grid 正确；meta 暂写入描述第二行「·」分隔 |
| 培训排期 schedule 样式 | ✅ | block.id=schedule |
| Split 要点 bullets | ❌ | 无 UI 字段，列表未显示 |
| 区块浅灰背景 | ✅ | 靠 block.id 启发式 |

## 仍缺的后台表单项（阶段 B 建议）

以下均为 **Input / Select / Form.List 单行文本**，不是 JSON 文本框：

### 图文分栏 split

- **要点列表**：Form.List，每项 Input → `bullets[]`
- **分栏样式**：Select — `标准(team-split)` / `研发(rd-split)`（替代 eyebrow 文案启发式）

### 摘要点 summary

- **展示样式**：Select — `价值网格` / `资质认证` / `专利列表` / `未来展望` / `创新亮点` / `培训课程`（替代 block.id 硬编码）
- **背景**：Select — `默认` / `浅灰`

### 时间节点 timeline

- **展示样式**：Select — `里程碑` / `排期列表`

### 子项编辑

- **标签**：Input，逗号分隔 → `tagsText`（专利 tag、时间轴 tag）
- **封面图 URL**：summary 模式也显示（创新亮点 / 培训课程 Banner）
- **元信息一 / 二 / 三**：Input ×3（培训课程底部 meta，替代描述第二行 hack）

## 验收命令

```bash
cd hongyu-admin
pnpm db:seed:brand-narratives   # 会先 purge 再写入
pnpm db:test:brand-narratives
pnpm exec tsx --tsconfig tsconfig.test.json scripts/verify-brand-narrative-pages.ts
```

前台对比：`http://localhost:5000/about` 等（需 admin:5100 + web:5000 运行中）。
