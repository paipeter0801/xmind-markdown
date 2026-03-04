<script lang="ts">
	import { cn } from '../../lib/utils';

	interface TocItem {
		id: string;
		text: string;
		level: number;
		children: TocItem[];
		isListItem?: boolean; // 標記這是列表項（非標題）
	}

	interface Props {
		htmlContent: string;
		class?: string;
		maxDepth?: number; // 最大顯示層數，預設 5
	}

	let { htmlContent, class: className, maxDepth = 5 }: Props = $props();

	let tocTree = $state<TocItem[]>([]);
	let expandedItems = $state<Set<string>>(new Set());
	let activeId = $state<string | null>(null);

	// 解析 HTML 內容，提取標題和列表項
	function parseHeadingsAndListItems(html: string): TocItem[] {
		const items: Array<{ id: string; text: string; level: number; isListItem: boolean }> = [];

		// 解析標題 (h2-h6)
		const headingRegex = /<h([2-6])\s+id="([^"]+)">([^<]+)<\/h\1>/g;
		let match;
		while ((match = headingRegex.exec(html)) !== null) {
			const [, levelStr, id, text] = match;
			items.push({
				id,
				text: text.trim(),
				level: parseInt(levelStr, 10),
				isListItem: false
			});
		}

		// 解析列表項 (深度 5+)
		// 格式: <div style="margin-left: Xrem" class="list-item">- text</div>
		const listItemRegex = /<div\s+style="margin-left:\s*([\d.]+)rem"[^>]*class="list-item"[^>]*>-?\s*(.+?)<\/div>/g;
		while ((match = listItemRegex.exec(html)) !== null) {
			const [, marginLeftStr, text] = match;
			const marginLeft = parseFloat(marginLeftStr);
			// 計算虛擬層級：margin-left 0 = 深度 5, 1.5 = 深度 5, 3 = 深度 6, 4.5 = 深度 7...
			// 實際上：depth 4 是 ####，depth 5 是列表第一層
			// 所以虛擬層級 = 4 + ceil(marginLeft / 1.5)
			// 但是 margin-left: 0rem 是深度 5，margin-left: 1.5rem 是深度 6
			// 層級 = 4 + floor(marginLeft / 1.5) + 1
			const baseLevel = 4;
			const listDepth = Math.floor(marginLeft / 1.5);
			const level = baseLevel + listDepth + 1;

			// 生成列表項的 ID（用於跳轉）
			// 列表項沒有 id 屬性，我們需要基於文本生成一個
			const cleanText = text.replace(/^-\s*/, '').trim();
			const id = `list-${cleanText.substring(0, 20).replace(/\s+/g, '-')}-${items.length}`;

			items.push({
				id,
				text: text.replace(/^-\s*/, ''), // 移除列表符號
				level,
				isListItem: true
			});
		}

		return buildTree(items);
	}

	// Build tree structure from flat items array
	function buildTree(
		items: Array<{ id: string; text: string; level: number; isListItem: boolean }>,
		startLevel = 2
	): TocItem[] {
		const result: TocItem[] = [];
		const stack: Array<TocItem & { parent: TocItem | null }> = [];

		for (const item of items) {
			const tocItem: TocItem = {
				id: item.id,
				text: item.text,
				level: item.level,
				children: [],
				isListItem: item.isListItem
			};

			// Find the appropriate parent
			while (
				stack.length > 0 &&
				stack[stack.length - 1].level >= tocItem.level
			) {
				stack.pop();
			}

			if (stack.length === 0) {
				result.push(tocItem);
			} else {
				stack[stack.length - 1].children.push(tocItem);
			}

			stack.push({ ...tocItem, parent: null });
		}

		return result;
	}

	// 根據 maxDepth 過濾樹狀結構
	function filterTreeByDepth(items: TocItem[], currentDepth = 2): TocItem[] {
		return items
			.filter(item => item.level <= maxDepth)
			.map(item => ({
				...item,
				children: item.children ? filterTreeByDepth(item.children, item.level + 1) : []
			}));
	}

	// 計算顯示用的樹（已過濾）
	let displayTree = $derived<TocItem[]>(filterTreeByDepth(tocTree));

	// Handle click on TOC item
	function handleItemClick(item: TocItem, event: MouseEvent) {
		event.preventDefault();

		// Auto-expand all parents
		expandParents(item.id);

		// Smooth scroll to element
		const element = document.getElementById(item.id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			// 高亮顯示該元素（可選）
			element.classList.add('ring-2', 'ring-primary-500');
			setTimeout(() => {
				element.classList.remove('ring-2', 'ring-primary-500');
			}, 1500);
		}
	}

	// Expand all parent items for a given item ID
	function expandParents(itemId: string) {
		function findAndExpandParents(items: TocItem[], targetId: string, path: string[]): boolean {
			for (const item of items) {
				const currentPath = [...path, item.id];

				if (item.id === targetId) {
					// Expand all items in the path
					for (const id of currentPath) {
						expandedItems.add(id);
					}
					return true;
				}

				if (item.children.length > 0) {
					if (findAndExpandParents(item.children, targetId, currentPath)) {
						return true;
					}
				}
			}
			return false;
		}

		findAndExpandParents(tocTree, itemId, []);
	}

	// Toggle expand/collapse for an item
	function toggleExpand(itemId: string, event: MouseEvent) {
		event.stopPropagation();
		if (expandedItems.has(itemId)) {
			expandedItems.delete(itemId);
		} else {
			expandedItems.add(itemId);
		}
		expandedItems = new Set(expandedItems); // Trigger reactivity
	}

	// Check if an item has children
	function hasChildren(item: TocItem): boolean {
		return item.children && item.children.length > 0;
	}

	// Check if an item is expanded
	function isExpanded(itemId: string): boolean {
		return expandedItems.has(itemId);
	}

	// Setup Intersection Observer for active section highlighting
	function setupIntersectionObserver() {
		const observerOptions = {
			root: null,
			rootMargin: '-20% 0px -70% 0px',
			threshold: 0
		};

		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					const id = entry.target.id;
					activeId = id;
					// Expand parents of active item
					expandParents(id);
					break;
				}
			}
		}, observerOptions);

		// Observe all heading elements and list items
		const headings = document.querySelectorAll('h2[id], h3[id], h4[id], h5[id], h6[id]');
		for (const heading of headings) {
			observer.observe(heading);
		}

		return observer;
	}

	let observer: IntersectionObserver | null = null;

	// Initialize TOC tree and observer
	$effect(() => {
		tocTree = parseHeadingsAndListItems(htmlContent);

		if (observer) {
			observer.disconnect();
		}

		if (typeof document !== 'undefined') {
			const timeoutId = setTimeout(() => {
				observer = setupIntersectionObserver();
			}, 100);

			return () => {
				clearTimeout(timeoutId);
				if (observer) observer.disconnect();
			};
		}
	});
</script>

<nav
	class={cn(
		'flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4',
		className
	)}
>
	<h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
		<svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 6h16M4 10h16M4 14h16M4 18h16"
			/>
		</svg>
		目錄
	</h3>

	{#if displayTree.length > 0}
		<ul class="space-y-1">
			{#each displayTree as item}
				{@const isActive = activeId === item.id}
				{@const itemHasChildren = hasChildren(item)}
				{@const itemIsExpanded = isExpanded(item.id)}
				{@render renderItem(item, 0, isActive, itemHasChildren, itemIsExpanded)}
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-slate-500 dark:text-slate-400 italic">找不到標題</p>
	{/if}
</nav>

{#snippet renderItem(item: TocItem, depth: number, isActive: boolean, itemHasChildren: boolean, itemIsExpanded: boolean)}
	<li class="toc-item">
		<div
			class="flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer transition-colors {isActive
				? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
				: 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}"
			style="padding-left: {depth * 0.75 + 0.5}rem"
			role="button"
			tabindex="0"
			onclick={(e) => handleItemClick(item, e)}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleItemClick(item, e as any);
				}
			}}
			aria-current={isActive ? 'true' : undefined}
		>
			{#if itemHasChildren}
				<button
					class="flex-shrink-0 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
					onclick={(e) => toggleExpand(item.id, e)}
					aria-label={itemIsExpanded ? '收起' : '展開'}
					aria-expanded={itemIsExpanded}
				>
					<svg
						class="w-3 h-3 transition-transform duration-200 {itemIsExpanded
							? 'rotate-90'
							: ''}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			{:else}
				<span class="w-5 flex-shrink-0"></span>
			{/if}
			<!-- 列表項使用不同圖示 -->
			{#if item.isListItem}
				<span class="flex-shrink-0 w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700"></span>
			{/if}
			<span class="truncate text-sm">{item.text}</span>
		</div>

		{#if itemHasChildren && itemIsExpanded}
			<ul class="space-y-1 mt-0.5">
				{#each item.children as child}
					{@const childIsActive = activeId === child.id}
					{@const childHasChildren = hasChildren(child)}
					{@const childIsExpanded = isExpanded(child.id)}
					{@render renderItem(child, depth + 1, childIsActive, childHasChildren, childIsExpanded)}
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}
