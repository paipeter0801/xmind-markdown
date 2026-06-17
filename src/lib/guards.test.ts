/// <reference types="node" />
/**
 * Architecture & defense guards (D1–D7, D17–D21) — XMind to Markdown
 * 規則來源：04-HARDENING_PROTOCOL.md / ENFORCEMENT_REGISTRY.md
 *
 * 設計原則：
 * - 預算類 guard（D1/D2/D6）只減不增；初始預算 = 現況計數，故現況 PASS。
 * - artifact/meta 類（D17–D21）在工作流（FIX-LOG/REFLECT/CHANGELOG）未上軌前為寬鬆模式：
 *   對應檔案不不存在則 skip + console.warn，[NEVER] 偽造通過、[NEVER] 阻擋開發。
 * - 全部 guard [MUST] 雙向有效（違規時會 fail）。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');
const EXTS = ['.ts', '.svelte', '.astro'];
const IGNORE = [/\.test\.ts$/];

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.astro') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) collectFiles(full, out);
    else if (EXTS.includes(extname(full)) && !IGNORE.some((re) => re.test(full))) out.push(full);
  }
  return out;
}

const FILES = collectFiles(SRC);
const read = (f: string) => readFileSync(f, 'utf-8');

function countAcross(regex: RegExp): { count: number; hits: string[] } {
  let count = 0;
  const hits: string[] = [];
  for (const f of FILES) {
    const m = read(f).match(regex);
    if (m) {
      count += m.length;
      hits.push(`${f}: ${m.length}`);
    }
  }
  return { count, hits };
}

describe('D1–D7 defense matrix', () => {
  it('D1: `as any` within budget (only decrease)', () => {
    const MAX = 1; // 現況；只減不增
    const { count, hits } = countAcross(/\bas any\b/g);
    if (count > MAX) console.error('D1 violations:', hits);
    expect(count).toBeLessThanOrEqual(MAX);
  });

  it('D2: `{@html}` injection tracked within budget (target: DOMPurify)', () => {
    const MAX = 1; // 現況；目標引入 sanitizer 後降為 0
    const { count, hits } = countAcross(/\{@html\b/g);
    if (count > MAX) console.error('D2 violations:', hits);
    expect(count).toBeLessThanOrEqual(MAX);
  });

  it('D3: no obvious secrets / tokens committed in source', () => {
    // 高可信 secret 前綴；baseline 詳細掃描由 detect-secrets pre-commit 負責
    const PATTERNS = [/(?:sk-[a-zA-Z0-9]{20,})/, /(?:AKIA[0-9A-Z]{16})/, /(?:ghp_[a-zA-Z0-9]{36})/];
    const hits: string[] = [];
    for (const f of FILES) {
      const c = read(f);
      for (const p of PATTERNS) if (p.test(c)) hits.push(f);
    }
    expect(hits, `Secret-like patterns in:\n${hits.join('\n')}`).toHaveLength(0);
  });

  it('D4: every package.json dependency is used (no unused deps)', () => {
    const pkg = JSON.parse(read(join(ROOT, 'package.json')));
    // 非 `import` 的建置/設定/型別依賴 allowlist
    const ALLOW = new Set([
      '@astrojs/check',
      '@astrojs/svelte',
      '@tailwindcss/vite',
      'tailwindcss',
      'astro',
    ]);
    const haystack = [
      ...FILES,
      join(ROOT, 'astro.config.mjs'),
      join(ROOT, 'tsconfig.json'),
    ]
      .filter(existsSync)
      .map(read)
      .join('\n');
    const unused: string[] = [];
    for (const dep of Object.keys(pkg.dependencies || {})) {
      if (ALLOW.has(dep)) continue;
      // bare import name（@scope/pkg 取前兩段；一般套件取全名）；子路徑 import 也算
      const probe = dep.startsWith('@') ? dep.split('/').slice(0, 2).join('/') : dep;
      if (!haystack.includes(`'${probe}'`) && !haystack.includes(`"${probe}"`)) {
        unused.push(dep);
      }
    }
    expect(unused, `Unused dependencies:\n${unused.join('\n')}`).toHaveLength(0);
  });

  it('D5: key doc-referenced source paths exist', () => {
    const must = [
      'src/lib/client-converter.ts',
      'src/lib/markdown-to-xmind.ts',
      'src/lib/markdown-parser.ts',
      'src/lib/xmind-builder.ts',
      'src/lib/download.ts',
      'src/lib/utils.ts',
      'src/sw.ts',
      'src/layouts/Layout.astro',
      'src/components/converter/Converter.svelte',
      'src/components/converter/TreeView.svelte',
      'src/components/converter/ResultPanel.svelte',
      'references/COMPONENT_PATTERNS.md',
    ];
    const missing = must.filter((p) => !existsSync(join(ROOT, p)));
    expect(missing, `Missing referenced paths:\n${missing.join('\n')}`).toHaveLength(0);
  });

  it('D6: console.* residue within budget (app code)', () => {
    const MAX = 3; // 現況（storage quota warn + SW 註冊 log/error）；只減不增
    const { count, hits } = countAcross(/console\.(log|error|warn|debug|info)\s*\(/g);
    if (count > MAX) console.error('D6 violations:', hits);
    expect(count).toBeLessThanOrEqual(MAX);
  });

  it('D7: required npm scripts exist (build/lint/test gate)', () => {
    const pkg = JSON.parse(read(join(ROOT, 'package.json')));
    const scripts = pkg.scripts || {};
    for (const s of ['lint', 'typecheck', 'test', 'test:run', 'build']) {
      expect(scripts[s], `missing script: ${s}`).toBeTruthy();
    }
  });
});

describe('D17–D21 meta & artifact guards (lenient until workflow adopted)', () => {
  it('D17: CHANGELOG fix→lock parity (skip if no Fixed bullets)', () => {
    const path = join(ROOT, 'CHANGELOG.md');
    if (!existsSync(path)) {
      console.warn('D17: CHANGELOG.md absent — skip (lenient).');
      return;
    }
    const text = read(path);
    // 取最新一個 ## section
    const sections = text.split(/^## /m);
    const latest = sections[1] ? '## ' + sections[1] : '';
    const fixedHeader = latest.indexOf('### Fixed');
    if (fixedHeader === -1) return; // 最新 section 無 Fixed → vacuous pass
    const fixedBlock = latest.slice(fixedHeader).split(/^### /m)[0];
    // Fixed 下的 bullet 若無 (locked: D##) 或 (human:) tag → fail
    const untagged = fixedBlock
      .split('\n')
      .filter((l) => /^\s*-\s+\S/.test(l) && !/\(locked:|\(human:/.test(l));
    expect(untagged, `Untagged CHANGELOG Fixed bullets:\n${untagged.join('\n')}`).toHaveLength(0);
  });

  it('D18: registry + hardening docs exist (meta)', () => {
    expect(existsSync(join(ROOT, 'ENFORCEMENT_REGISTRY.md'))).toBe(true);
    expect(existsSync(join(ROOT, '04-HARDENING_PROTOCOL.md'))).toBe(true);
    // registry 內每個 D## [MUST] 出現於 04
    const reg = read(join(ROOT, 'ENFORCEMENT_REGISTRY.md'));
    const h04 = read(join(ROOT, '04-HARDENING_PROTOCOL.md'));
    const dIds = new Set([...reg.matchAll(/\b(D\d{1,2})\b/g)].map((m) => m[1]));
    const dangling = [...dIds].filter((id) => !h04.includes(id));
    expect(dangling, `Registry D## not in 04: ${dangling.join(',')}`).toHaveLength(0);
  });

  it('D19: FIX-LOG artifact (skip if absent)', () => {
    if (!existsSync(join(ROOT, 'FIX-LOG.md'))) {
      console.warn('D19: FIX-LOG.md absent — skip (lenient).');
      return;
    }
    expect(read(join(ROOT, 'FIX-LOG.md')).trim().length).toBeGreaterThan(0);
  });

  it('D20: REFLECT artifact (skip if absent)', () => {
    if (!existsSync(join(ROOT, 'REFLECT.md'))) {
      console.warn('D20: REFLECT.md absent — skip (lenient).');
      return;
    }
    expect(read(join(ROOT, 'REFLECT.md')).trim().length).toBeGreaterThan(0);
  });

  it('D21: THINK block artifact (skip if no FIX-LOG)', () => {
    if (!existsSync(join(ROOT, 'FIX-LOG.md'))) {
      console.warn('D21: FIX-LOG.md absent — skip THINK reference check (lenient).');
      return;
    }
    expect(read(join(ROOT, 'FIX-LOG.md'))).toMatch(/THINK/i);
  });
});
