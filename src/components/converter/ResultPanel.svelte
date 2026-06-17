<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Button from '../ui/Button.svelte';
	import TreeView from './TreeView.svelte';
	import { cn } from '../../lib/utils';
	import type { XmindTopic } from '../../types/converter';

	interface ConversionStats {
		totalTopics: number;
		maxDepthReached: number;
		rootTopics: number;
		processingTime: number;
		markersProcessed: number;
		attachmentsProcessed: number;
		linksProcessed: number;
		imagesProcessed: number;
	}

	interface Props {
		content: string;
		stats: ConversionStats;
		sourceFile: string;
		isLoading?: boolean;
		class?: string;
		tree?: XmindTopic | null;
		onExport?: () => void;
		onCopy?: () => void;
	}

	let {
		content,
		stats,
		sourceFile,
		isLoading = false,
		class: className,
		tree = null,
		onExport,
		onCopy
	}: Props = $props();

	let showStats = $state(false);
	let copySuccess = $state(false);
	// 預覽模式：document = 既有標題式預覽；tree = 樹狀階層預覽（凸顯父子關係）
	let previewMode = $state<'document' | 'tree'>(tree ? 'tree' : 'document');
	// Tree 模式控制：全部展開/收合、預設展開層數
	let collapseAllCmd = $state({ tick: 0, expand: true });
	let collapseBelowDepth = $state(Infinity);

	function expandAll() {
		collapseAllCmd = { tick: collapseAllCmd.tick + 1, expand: true };
	}
	function collapseAll() {
		collapseAllCmd = { tick: collapseAllCmd.tick + 1, expand: false };
	}
	// 調整預設展開層數：重新渲染 TreeView（藉由 key 變動）
	let treeVersion = $state(0);
	function applyDepth(d: number) {
		collapseBelowDepth = d;
		treeVersion++;
	}

	async function handleCopy() {
		if (onCopy) {
			await onCopy();
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		}
	}

	const statItems = $derived([
		{ label: 'Topics', value: stats.totalTopics, icon: '📝' },
		{ label: 'Max Depth', value: stats.maxDepthReached, icon: '📊' },
		{ label: 'Root Topics', value: stats.rootTopics, icon: '🌳' },
		{ label: 'Processing Time', value: `${stats.processingTime}ms`, icon: '⏱️' },
		{ label: 'Markers', value: stats.markersProcessed, icon: '🏷️' },
		{ label: 'Attachments', value: stats.attachmentsProcessed, icon: '📎' },
		{ label: 'Links', value: stats.linksProcessed, icon: '🔗' },
		{ label: 'Images', value: stats.imagesProcessed, icon: '🖼️' }
	]);
</script>

<Card variant="default" class={cn('flex flex-col', className)}>
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
		<h2 class="text-2xl font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
			<svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
				/>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
				/>
			</svg>
			{previewMode === 'tree' ? '樹狀階層預覽' : 'Markdown Preview'}
		</h2>
		<div class="flex items-center gap-2 flex-wrap">
			{#if tree}
				<!-- 預覽模式切換 -->
				<div class="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
					<button
						onclick={() => (previewMode = 'document')}
						class="px-3 py-1 text-sm font-medium rounded-md transition-colors {previewMode === 'document' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}"
					>
						Document
					</button>
					<button
						onclick={() => (previewMode = 'tree')}
						class="px-3 py-1 text-sm font-medium rounded-md transition-colors {previewMode === 'tree' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}"
					>
						🌲 Tree
					</button>
				</div>
			{/if}
			<Button
				variant="outline"
				size="sm"
				onclick={() => (showStats = !showStats)}
				aria-label="Toggle statistics"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
					/>
				</svg>
				Stats
			</Button>
			<Button variant="outline" size="sm" onclick={handleCopy} disabled={isLoading}>
				{#if copySuccess}
					<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				{:else}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
						/>
					</svg>
				{/if}
			</Button>
			<Button variant="primary" size="sm" onclick={onExport} disabled={isLoading}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
					/>
				</svg>
				Export .md
			</Button>
		</div>
	</div>

	<!-- Tree 模式工具列 -->
	{#if previewMode === 'tree' && tree}
		<div class="flex flex-wrap items-center gap-3 mb-4 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm">
			<button
				onclick={expandAll}
				class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
				展開全部
			</button>
			<button
				onclick={collapseAll}
				class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4m0 0l4 4m-4-4l4-4" /></svg>
				收合全部
			</button>
			<div class="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
			<div class="flex items-center gap-2">
				<span class="text-slate-600 dark:text-slate-400">預設展開層數</span>
				<span class="font-semibold text-primary-600 dark:text-primary-400 w-8 text-center">
					{collapseBelowDepth === Infinity ? '全部' : collapseBelowDepth}
				</span>
				<input
					type="range" min="1" max="8" value={collapseBelowDepth === Infinity ? 9 : collapseBelowDepth}
					oninput={(e) => {
						const v = +(e.currentTarget as HTMLInputElement).value;
						applyDepth(v >= 9 ? Infinity : v);
					}}
					class="w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
				/>
			</div>
		</div>
	{/if}

	<!-- Statistics Panel -->
	{#if showStats}
		<div class="mb-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 animate-slide-down">
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
				{#each statItems as item}
					<div class="text-center">
						<div class="text-2xl mb-1">{item.icon}</div>
						<div class="text-lg font-semibold text-slate-900 dark:text-slate-100">
							{item.value}
						</div>
						<div class="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
					</div>
				{/each}
			</div>
			<div class="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-center">
				<p class="text-sm text-slate-600 dark:text-slate-400">
					Source: <span class="font-medium">{sourceFile}</span>
				</p>
			</div>
		</div>
	{/if}

	<!-- Content Area -->
	<div class="prose prose-slate max-w-none min-h-[400px] p-4 rounded-xl border overflow-auto
		bg-slate-50 border-slate-200
		dark:bg-slate-900/50 dark:border-slate-700
		text-slate-900 dark:text-slate-100
		prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-slate-100
		prose-h2:text-2xl prose-h2:leading-tight
		prose-h3:text-xl prose-h3:leading-tight
		prose-h4:text-lg prose-h4:leading-tight
		prose-p:text-slate-700 dark:prose-p:text-slate-300
		prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-li:text-base
		prose-strong:text-slate-900 dark:prose-strong:text-slate-100
		prose-code:text-pink-600 dark:prose-code:text-pink-400
		prose-links:text-blue-600 dark:prose-links:text-blue-400
		prose-a:text-blue-600 hover:prose-a:text-blue-700
		dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300">
		{#if isLoading}
			<div class="flex items-center justify-center h-64">
				<div class="text-center">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
					<p class="text-slate-600 dark:text-slate-400">Converting your XMind file...</p>
				</div>
			</div>
		{:else if previewMode === 'tree' && tree}
			{#key treeVersion}
				<TreeView node={tree} {collapseBelowDepth} command={collapseAllCmd} />
			{/key}
		{:else if content}
			{@html content}
		{:else}
			<div class="flex items-center justify-center h-64 text-slate-400 dark:text-slate-600">
				<div class="text-center">
					<svg
						class="w-12 h-12 mx-auto mb-4 opacity-50"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<p>Upload an XMind file to see the preview</p>
				</div>
			</div>
		{/if}
	</div>
</Card>
