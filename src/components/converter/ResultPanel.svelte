<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Button from '../ui/Button.svelte';
	import { cn } from '../../lib/utils';

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
		onExport?: () => void;
		onCopy?: () => void;
	}

	let {
		content,
		stats,
		sourceFile,
		isLoading = false,
		class: className,
		onExport,
		onCopy
	}: Props = $props();

	let showStats = $state(false);
	let copySuccess = $state(false);

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
	<div class="flex items-center justify-between mb-4">
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
			Markdown Preview
		</h2>
		<div class="flex items-center gap-2">
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
		prose-headings:font-semibold prose-headings:text-slate-900 dark:prose-headings:text-slate-100
		prose-p:text-slate-700 dark:prose-p:text-slate-300
		prose-li:text-slate-700 dark:prose-li:text-slate-300
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
