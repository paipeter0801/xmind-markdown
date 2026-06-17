<script lang="ts">
	import type { XmindTopic } from '../../types/converter';

	// 每層對應一個顏色，循環使用，用左邊框表達階層
	const DEPTH_BORDER = [
		'border-primary-500',
		'border-sky-500',
		'border-emerald-500',
		'border-amber-500',
		'border-violet-500',
		'border-rose-500',
		'border-cyan-500',
	];
	const DEPTH_TEXT = [
		'text-primary-600 dark:text-primary-400',
		'text-sky-600 dark:text-sky-400',
		'text-emerald-600 dark:text-emerald-400',
		'text-amber-600 dark:text-amber-400',
		'text-violet-600 dark:text-violet-400',
		'text-rose-600 dark:text-rose-400',
		'text-cyan-600 dark:text-cyan-400',
	];

	interface Props {
		node: XmindTopic;
		depth?: number;
		/** 預設收合此深度（含）以下的節點；Infinity = 全展開 */
		collapseBelowDepth?: number;
		/** 外部「全部展開/收合」指令：tick 改變時套用 expand 狀態 */
		command?: { tick: number; expand: boolean };
	}

	let { node, depth = 0, collapseBelowDepth = Infinity, command }: Props = $props();

	const hasChildren = $derived(!!node.children && node.children.length > 0);
	// 初始：深度 >= collapseBelowDepth 的節點預設收合
	let collapsed = $state(depth >= collapseBelowDepth);
	const borderClass = $derived(DEPTH_BORDER[depth % DEPTH_BORDER.length]);
	const textClass = $derived(DEPTH_TEXT[depth % DEPTH_TEXT.length]);

	// 外部指令：展開/收合全部（僅對有子節點者生效）
	$effect(() => {
		if (!hasChildren) return;
		const tick = command?.tick;
		if (tick === undefined) return;
		collapsed = !command!.expand;
	});

	function toggle(e: MouseEvent) {
		if (!hasChildren) return;
		e.stopPropagation();
		collapsed = !collapsed;
	}

	const marker = $derived(node.markers && node.markers.length > 0 ? node.markers.join(' ') : '');
	const childCount = $derived(node.children?.length ?? 0);
	const linkCount = $derived(node.links?.length ?? 0);
</script>

<div class="group">
	<!-- 節點列 -->
	<div
		class="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors cursor-{hasChildren ? 'pointer' : 'default'}"
		role={hasChildren ? 'button' : undefined}
		tabindex={hasChildren ? 0 : undefined}
		onclick={toggle}
		onkeydown={(e) => e.key === 'Enter' && toggle(e as unknown as MouseEvent)}
	>
		<!-- 摺疊箭頭 / 葉節點圓點 -->
		<span class="flex-shrink-0 w-4 mt-0.5 text-slate-400 select-none">
			{#if hasChildren}
				<svg
					class="w-4 h-4 transition-transform {collapsed ? '' : 'rotate-90'}"
					fill="none" stroke="currentColor" viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
				</svg>
			{:else}
				<span class="block w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mt-1.5 mx-auto"></span>
			{/if}
		</span>

		<!-- 標題與內容 -->
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2 flex-wrap">
				{#if marker}<span class="text-base leading-none">{marker}</span>{/if}
				<span
					class="font-medium {depth === 0 ? 'text-lg' : ''} {depth === 0 ? 'text-slate-900 dark:text-slate-100' : textClass} break-words"
				>
					{node.title}
				</span>

				<!-- 徽章 -->
				{#if depth === 0 && childCount}
					<span class="text-xs px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
						{childCount} 個分支
					</span>
				{/if}
				{#if node.notes}
					<span class="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" title="含備註">
						📝 <span class="hidden sm:inline">備註</span>
					</span>
				{/if}
				{#if linkCount}
					<span class="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" title="{linkCount} 個連結">
						🔗 {linkCount}
					</span>
				{/if}
				{#if node.labels && node.labels.length}
					{#each node.labels as label}
						<span class="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 font-mono">{label}</span>
					{/each}
				{/if}
			</div>

			<!-- 備註內容（展開時顯示） -->
			{#if node.notes && !collapsed}
				<div class="mt-1.5 pl-3 border-l-2 border-amber-300 dark:border-amber-700 text-sm text-slate-500 dark:text-slate-400 whitespace-pre-line">
					{node.notes}
				</div>
			{/if}

			<!-- 連結清單 -->
			{#if node.links && node.links.length && !collapsed}
				<div class="mt-1.5 flex flex-col gap-0.5">
					{#each node.links as link}
						<a href={link.href} target="_blank" rel="noopener noreferrer" class="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate">
							🔗 {link.title || link.href}
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- 子節點：用左邊框 + 縮排表達父子巢狀 -->
	{#if hasChildren && !collapsed}
		<div class="ml-2 pl-3 border-l-2 {borderClass} space-y-0.5">
			{#each node.children as child (child.id)}
				<svelte:self node={child} depth={depth + 1} {collapseBelowDepth} {command} />
			{/each}
		</div>
	{/if}
</div>
