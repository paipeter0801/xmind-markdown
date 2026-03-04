<script lang="ts">
	import { cn } from '../../lib/utils';
	import { onMount } from 'svelte';

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

	let tocTree = $state<TocItem[]>([]);
	let expandedItems = $state<Set<string>>(new Set());
	let activeId = $state<string | null>(null);

	// Parse headings from HTML content
	function parseHeadings(html: string): TocItem[] {
		const headingRegex = /<h([2-6])\s+id="([^"]+)">([^<]+)<\/h\1>/g;
		const headings: Array<{ id: string; text: string; level: number }> = [];
		let match;

		while ((match = headingRegex.exec(html)) !== null) {
			const [, levelStr, id, text] = match;
			headings.push({
				id,
				text: text.trim(),
				level: parseInt(levelStr, 10)
			});
		}

		return buildTree(headings);
	}

	// Build tree structure from flat headings array
	function buildTree(
		headings: Array<{ id: string; text: string; level: number }>,
		startLevel = 2
	): TocItem[] {
		const result: TocItem[] = [];
		const stack: Array<TocItem & { parent: TocItem | null }> = [];

		for (const heading of headings) {
			const item: TocItem = {
				id: heading.id,
				text: heading.text,
				level: heading.level,
				children: []
			};

			// Find the appropriate parent
			while (
				stack.length > 0 &&
				stack[stack.length - 1].level >= item.level
			) {
				stack.pop();
			}

			if (stack.length === 0) {
				result.push(item);
			} else {
				stack[stack.length - 1].children.push(item);
			}

			stack.push({ ...item, parent: null });
		}

		return result;
	}

	// Handle click on TOC item
	function handleItemClick(item: TocItem, event: MouseEvent) {
		event.preventDefault();

		// Auto-expand all parents
		expandParents(item.id);

		// Smooth scroll to heading
		const element = document.getElementById(item.id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
		return item.children.length > 0;
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

		// Observe all heading elements
		const headings = document.querySelectorAll('h2[id], h3[id], h4[id], h5[id], h6[id]');
		for (const heading of headings) {
			observer.observe(heading);
		}

		return observer;
	}

	let observer: IntersectionObserver | null = null;

	// Initialize TOC tree and observer
	$effect(() => {
		tocTree = parseHeadings(htmlContent);

		// Cleanup previous observer
		if (observer) {
			observer.disconnect();
		}

		// Setup new observer after DOM update
		if (typeof document !== 'undefined') {
			// Use setTimeout to ensure DOM is updated
			const timeoutId = setTimeout(() => {
				observer = setupIntersectionObserver();
			}, 100);

			return () => {
				clearTimeout(timeoutId);
			};
		}

		return () => {
			if (observer) {
				observer.disconnect();
			}
		};
	});

	// Cleanup on unmount
	onMount(() => {
		return () => {
			if (observer) {
				observer.disconnect();
			}
		};
	});

	// Recursively render TOC items
	function renderTocItem(item: TocItem, depth: number = 0) {
		const isActive = activeId === item.id;
		const itemHasChildren = hasChildren(item);
		const itemIsExpanded = isExpanded(item.id);

		return {
			get item() {
				return item;
			},
			get depth() {
				return depth;
			},
			get isActive() {
				return isActive;
			},
			get itemHasChildren() {
				return itemHasChildren;
			},
			get itemIsExpanded() {
				return itemIsExpanded;
			}
		};
	}
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

	{#if tocTree.length > 0}
		<ul class="space-y-1">
			{#each tocTree as item}
				{@const rendered = renderTocItem(item)}
				<svelte:self item={rendered.item} depth={rendered.depth} />
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-slate-500 dark:text-slate-400 italic">No headings found</p>
	{/if}
</nav>

{#instance renderTocItem(item, depth)}
	{@const isActive = activeId === item.id}
	{@const itemHasChildren = hasChildren(item)}
	{@const itemIsExpanded = isExpanded(item.id)}
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
					aria-label={itemIsExpanded ? 'Collapse' : 'Expand'}
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
			<span class="truncate text-sm">{item.text}</span>
		</div>

		{#if itemHasChildren && itemIsExpanded}
			<ul class="space-y-1 mt-0.5">
				{#each item.children as child}
					{@const childRendered = renderTocItem(child, depth + 1)}
					<svelte:self item={childRendered.item} depth={childRendered.depth} />
				{/each}
			</ul>
		{/if}
	</li>
{/instance}
