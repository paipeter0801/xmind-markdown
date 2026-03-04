# Table of Contents Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a right-side table of contents (TOC) navigation panel for the Markdown preview, with click-to-scroll, active section highlighting, and collapsible sections.

**Architecture:**
1. Modify `client-converter.ts` to output depth 4 as `####` headings (not list items)
2. Update `Converter.svelte`'s `markdownToHtml()` function to inject unique IDs into headings for anchor navigation
3. Create new `TableOfContents.svelte` component that extracts heading structure and provides navigation
4. Update layout in `Converter.svelte` to show TOC on the right side of results

**Tech Stack:** Svelte 5 Runes, TypeScript, Tailwind CSS, Intersection Observer API

---

### Task 1: Modify client-converter.ts Output Format

**Files:**
- Modify: `src/lib/client-converter.ts` (function `convertTopic`)

**Step 1: Update convertTopic function for depth 4 headings**

Modify the `convertTopic` function to use `####` headings for depth 4 instead of list format:

```typescript
function convertTopic(topic: XmindTopic, lines: string[], depth: number, options: ConversionOptions): void {
  const text = sanitizeTitle(topic.title);
  const emoji = topic.markers?.[0] ? `${topic.markers[0]} ` : '';
  const hasChildren = topic.children && topic.children.length > 0;

  // New logic: depth 2-4 use headings, depth 5+ use list format
  if (depth === 2) {
    lines.push(`## ${emoji}${text}`);
    lines.push('');
  } else if (depth === 3) {
    lines.push(`### ${emoji}${text}`);
    if (!hasChildren) {
      lines.push('');
    }
  } else if (depth === 4) {
    // Changed from list format to heading
    lines.push(`#### ${emoji}${text}`);
    if (!hasChildren) {
      lines.push('');
    }
  } else {
    // depth 5+ - list format
    const indent = '  '.repeat(depth - 5);
    if (hasChildren) {
      const cleanText = text.replace(/：$/g, '');
      lines.push(`${indent}- ${emoji}${cleanText}:`);
    } else {
      const cleanText = text.replace(/：$/g, '');
      lines.push(`${indent}- ${emoji}${cleanText}`);
    }
  }

  // Recursively process children
  if (hasChildren) {
    for (const child of topic.children) {
      convertTopic(child, lines, depth + 1, options);
    }
  }
}
```

**Step 2: Rebuild client-converter.js**

Run: `npm run build:client`
Expected: `public/client-converter.js` updated successfully

**Step 3: Commit**

```bash
git add src/lib/client-converter.ts public/client-converter.js
git commit -m "feat: output depth 4 as #### heading for TOC support"
```

---

### Task 2: Update markdownToHtml with Anchor IDs

**Files:**
- Modify: `src/components/converter/Converter.svelte` (function `markdownToHtml`)

**Step 1: Replace markdownToHtml with ID-injecting version**

```typescript
// Add heading counter for ID generation
let headingCounter = $state(0);

function generateHeadingId(text: string): string {
	// Remove emoji and special chars, create slug
	const cleanText = text
		.replace(/^[\p{Emoji}\p{Extended_Pictographic}]\s*/u, '') // Remove leading emoji
		.replace(/[^\p{L}\p{N}\s-]/gu, '') // Keep only letters, numbers, spaces, hyphens
		.trim()
		.replace(/\s+/g, '-') // Replace spaces with hyphens
		.toLowerCase();
	return `heading-${cleanText}-${++headingCounter}`;
}

function markdownToHtml(markdown: string): string {
	headingCounter = 0; // Reset counter for each conversion
	const lines = markdown.split('\n');
	const result: string[] = [];

	for (const line of lines) {
		// Handle headings with IDs
		const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
		if (headingMatch) {
			const level = headingMatch[1].length;
			const text = headingMatch[2].trim();
			const id = generateHeadingId(text);
			result.push(`<h${level} id="${id}">${text}</h${level}>`);
		} else if (line.match(/^\*\*(.*)\*\*/)) {
			result.push(line.replace(/^\*\*(.*)\*\*/gim, '<strong>$1</strong>'));
		} else if (line.match(/\*(.*)\*/)) {
			result.push(line.replace(/\*(.*)\*/gim, '<em>$1</em>'));
		} else if (line.match(/!\[(.*?)\]\((.*?)\)/)) {
			result.push(line.replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" />'));
		} else if (line.match(/\[(.*?)\]\((.*?)\)/)) {
			result.push(line.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>'));
		} else if (line.match(/^> (.*)$/)) {
			result.push(line.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>'));
		} else if (line.match(/`(.*?)`/)) {
			result.push(line.replace(/`(.*?)`/gim, '<code>$1</code>'));
		} else if (line === '') {
			result.push('<br />');
		} else {
			result.push(line);
		}
	}

	return result.join('\n');
}
```

**Step 2: Commit**

```bash
git add src/components/converter/Converter.svelte
git commit -m "feat: inject anchor IDs into headings for TOC navigation"
```

---

### Task 3: Create TableOfContents Component

**Files:**
- Create: `src/components/converter/TableOfContents.svelte`

**Step 1: Create the TOC component with TypeScript interfaces**

```svelte
<script lang="ts">
	interface TocItem {
		id: string;
		text: string;
		level: number;
		children: TocItem[];
	}

	interface Props {
		htmlContent: string;
		class?: string;
	}

	let { htmlContent, class: className }: Props = $props();

	let tocItems = $derived<TocItem[]>(parseTocItems(htmlContent));
	let activeId = $state<string>('');
	let expandedItems = $state<Set<string>>(new Set());

	// Parse headings from HTML content
	function parseTocItems(html: string): TocItem[] {
		const headingRegex = /<h([2-6])\s+id="([^"]+)">([^<]+)<\/h\1>/g;
		const items: TocItem[] = [];
		const stack: TocItem[] = [];
		let match: RegExpExecArray | null;

		while ((match = headingRegex.exec(html)) !== null) {
			const level = parseInt(match[1], 10);
			const id = match[2];
			const text = match[3].trim();

			const item: TocItem = { id, text, level, children: [] };

			// Find parent in stack
			while (stack.length > 0 && stack[stack.length - 1].level >= level) {
				stack.pop();
			}

			if (stack.length === 0) {
				items.push(item);
			} else {
				stack[stack.length - 1].children.push(item);
			}

			stack.push(item);
		}

		return items;
	}

	// Check if item has children
	function hasChildren(item: TocItem): boolean {
		return item.children && item.children.length > 0;
	}

	// Check if item is expanded
	function isExpanded(id: string): boolean {
		return expandedItems.has(id);
	}

	// Toggle item expansion
	function toggleExpand(id: string) {
		if (expandedItems.has(id)) {
			expandedItems.delete(id);
		} else {
			expandedItems.add(id);
		}
		expandedItems = new Set(expandedItems); // Trigger reactivity
	}

	// Scroll to heading
	function scrollToHeading(id: string) {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			activeId = id;
		}
	}

	// Intersection Observer for active heading
	let observer: IntersectionObserver | undefined;

	function setupObserver() {
		const headings = document.querySelectorAll('h2[id], h3[id], h4[id], h5[id], h6[id]');

		observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						activeId = entry.target.id;
					}
				}
			},
			{ rootMargin: '-20% 0px -70% 0px', threshold: 0 }
		);

		for (const heading of headings) {
			observer?.observe(heading);
		}
	}

	// Cleanup observer
	function cleanupObserver() {
		observer?.disconnect();
	}

	// Setup on mount
	$effect(() => {
		if (htmlContent) {
			// Small delay to ensure DOM is updated
			setTimeout(() => {
				cleanupObserver();
				setupObserver();
			}, 100);
		}

		return () => {
			cleanupObserver();
		};
	});

	// Expand parent of active item
	$effect(() => {
		if (activeId) {
			function findParent(items: TocItem[], targetId: string, parentPath: string[] = []): string[] | null {
				for (const item of items) {
					if (item.id === targetId) {
						return parentPath;
					}
					if (item.children?.length > 0) {
						const result = findParent(item.children, targetId, [...parentPath, item.id]);
						if (result) return result;
					}
				}
				return null;
			}

			const parents = findParent(tocItems, activeId);
			if (parents) {
				const newExpanded = new Set(expandedItems);
				for (const parentId of parents) {
					newExpanded.add(parentId);
				}
				expandedItems = newExpanded;
			}
		}
	});
</script>

{#if tocItems.length > 0}
	<nav class={className}>
		<div class="flex items-center gap-2 mb-3">
			<svg class="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
			</svg>
			<span class="text-sm font-medium text-slate-700 dark:text-slate-300">目錄</span>
		</div>

		<ul class="space-y-1">
			{#each tocItems as item}
				{svelte:component self item={item} depth={0} /}
			{/each}
		</ul>
	</nav>
{/if}

<!-- Recursive item component -->
{#instance self : TocItem & { depth: number }}
	<li class="toc-item">
		<div
			class="flex items-center gap-1 py-1 px-2 rounded-lg cursor-pointer transition-colors
				{item.id === activeId
					? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
					: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}
				style="padding-left: {depth * 0.5 + 0.5}rem"
			>
				{#if hasChildren(item)}
					<button
						onclick={(e) => {
							e.stopPropagation();
							toggleExpand(item.id);
						}}
						class="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
						aria-label="Toggle section"
					>
						<svg
							class="w-3 h-3 transition-transform {isExpanded(item.id) ? 'rotate-90' : ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				{:else}
					<span class="w-4"></span>
				{/if}

				<button
					onclick={() => scrollToHeading(item.id)}
					class="flex-1 text-left text-xs font-medium truncate"
				>
					{item.text}
				</button>
			</div>

			{#if hasChildren(item) && isExpanded(item.id)}
				<ul class="space-y-1 mt-0.5">
					{#each item.children as child}
						<svelte:component self item={child} depth={depth + 1} />
					{/each}
				</ul>
			{/if}
	</li>
{/instance}
```

**Step 2: Commit**

```bash
git add src/components/converter/TableOfContents.svelte
git commit -m "feat: create TableOfContents component with navigation"
```

---

### Task 4: Update Converter Layout for Side-by-Side View

**Files:**
- Modify: `src/components/converter/Converter.svelte`

**Step 1: Import TOC component and update layout**

Add import at top of script section:

```typescript
import TableOfContents from './TableOfContents.svelte';
```

**Step 2: Modify Result Panel section**

Replace the existing ResultPanel section with side-by-side layout:

```svelte
<!-- Result Panel with TOC -->
{#if result}
	<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
		<!-- Main Content -->
		<div class="lg:col-span-3">
			<ResultPanel
				content={htmlContent}
				stats={result.stats}
				sourceFile={result.metadata.sourceFile}
				isLoading={isConverting}
				onExport={handleExport}
				onCopy={handleCopy}
			/>
		</div>

		<!-- Table of Contents -->
		<div class="lg:col-span-1">
			<div class="sticky top-6">
				<TableOfContents htmlContent={htmlContent} />
			</div>
		</div>
	</div>
{/if}
```

**Step 3: Commit**

```bash
git add src/components/converter/Converter.svelte
git commit -m "feat: add side-by-side layout with TOC navigation"
```

---

### Task 5: Manual Testing & Verification

**Files:**
- No files modified

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts on http://localhost:4321

**Step 2: Test with XMind file**

1. Open browser to http://localhost:4321
2. Upload a test XMind file with depth 4+ structure
3. Verify output format:
   - Depth 2 should be `## heading`
   - Depth 3 should be `### heading`
   - Depth 4 should be `#### heading` (not list format)
   - Depth 5+ should be list format with indentation

**Step 3: Test TOC functionality**

1. Verify TOC appears on right side
2. Click on TOC items - should scroll smoothly to heading
3. Scroll through content - active TOC item should highlight
4. Click expand/collapse arrows - sections should toggle
5. Test on mobile - TOC should stack below content

**Step 4: Test exported .md file**

1. Click "Export .md" button
2. Open downloaded file in text editor
3. Verify NO HTML tags present (should be pure Markdown)
4. Verify depth 4 outputs as `#### heading`

**Step 5: Final commit if adjustments needed**

```bash
# If any fixes were made
git add .
git commit -m "fix: adjust TOC behavior based on testing"
```

---

## Summary

This plan implements a complete table of contents navigation system with:

1. **Depth 4 as heading** - Changed from list format to `####` for better TOC structure
2. **Anchor injection** - Only in preview, not in exported .md
3. **Interactive TOC** - Click navigation, active highlighting, collapsible sections
4. **Responsive layout** - Side-by-side on desktop, stacked on mobile

**Files modified:**
- `src/lib/client-converter.ts` - Output format change
- `src/components/converter/Converter.svelte` - Layout + HTML rendering
- `src/components/converter/TableOfContents.svelte` - New component
- `public/client-converter.js` - Rebuilt from client-converter.ts
