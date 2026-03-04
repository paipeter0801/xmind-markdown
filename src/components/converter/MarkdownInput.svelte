<script lang="ts">
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import { MarkdownToXmindConverter } from '../../lib/markdown-to-xmind';
	import { downloadXmind } from '../../lib/download';
	import type { MarkdownToXmindResult } from '../../types/converter';

	let filename = $state('');
	let markdownContent = $state('');
	let showPreview = $state(false);
	let isConverting = $state(false);
	let conversionResult = $state<MarkdownToXmindResult | null>(null);
	let errorMessage = $state<string | null>(null);

	async function handlePaste(event: ClipboardEvent) {
		const paste = (event.clipboardData || window.clipboardData).getData('text');
		markdownContent = paste;
	}

	async function handleConvert() {
		if (!markdownContent.trim()) {
			errorMessage = 'Please enter some Markdown content';
			return;
		}

		if (!filename.trim()) {
			errorMessage = 'Please enter a filename';
			return;
		}

		isConverting = true;
		errorMessage = null;

		try {
			const converter = new MarkdownToXmindConverter();
			const result = await converter.convert(markdownContent);

			if (result.success && result.blob) {
				// Auto-download the XMind file
				const baseFilename = filename.replace(/\.xmind$/i, '');
				downloadXmind(result.blob, baseFilename);

				conversionResult = result;
				showPreview = true;
			} else {
				errorMessage = result.error || 'Failed to convert Markdown content';
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to convert Markdown content';
		} finally {
			isConverting = false;
		}
	}

	function handleClear() {
		filename = '';
		markdownContent = '';
		showPreview = false;
		conversionResult = null;
		errorMessage = null;
	}
</script>

<Card>
	<div class="space-y-4">
		<!-- Header -->
		<h2 class="text-2xl font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
			<svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
				/>
			</svg>
			Text Input Mode
		</h2>

		<!-- Filename Input -->
		<div>
			<label for="filename" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
				Filename
			</label>
			<input
				id="filename"
				type="text"
				bind:value={filename}
				placeholder="my-mindmap"
				class="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
			/>
		</div>

		<!-- Markdown Content Textarea -->
		<div>
			<label for="markdown" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
				Markdown Content
			</label>
			<textarea
				id="markdown"
				bind:value={markdownContent}
				onpaste={handlePaste}
				placeholder="# Main Topic&#10;&#10;## Subtopic 1&#10;- Item 1&#10;- Item 2&#10;&#10;## Subtopic 2&#10;- Item 3&#10;- Item 4"
				rows="12"
				class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm resize-none"
			></textarea>
		</div>

		<!-- Error Message -->
		{#if errorMessage}
			<div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
				<p class="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex items-center justify-between">
			<button
				onclick={handleClear}
				class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
			>
				Clear
			</button>

			<div class="flex items-center gap-2">
				{#if markdownContent.trim()}
					<button
						onclick={() => (showPreview = !showPreview)}
						class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
					>
						{showPreview ? 'Hide Preview' : 'Show Preview'}
					</button>
				{/if}

				<Button variant="primary" onclick={handleConvert} disabled={isConverting || !markdownContent.trim()}>
					{#if isConverting}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
							/>
						</svg>
					{/if}
					{isConverting ? 'Converting...' : 'Convert & Download'}
				</Button>
			</div>
		</div>

		<!-- Preview -->
		{#if showPreview && conversionResult}
			<div class="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
				<h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
					Conversion Result
				</h3>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span class="text-slate-600 dark:text-slate-400">Total Nodes:</span>
						<span class="ml-2 font-medium text-slate-900 dark:text-slate-100">{conversionResult.stats.totalNodes}</span>
					</div>
					<div>
						<span class="text-slate-600 dark:text-slate-400">Max Depth:</span>
						<span class="ml-2 font-medium text-slate-900 dark:text-slate-100">{conversionResult.stats.maxDepth}</span>
					</div>
					<div>
						<span class="text-slate-600 dark:text-slate-400">Empty Nodes Filtered:</span>
						<span class="ml-2 font-medium text-slate-900 dark:text-slate-100">{conversionResult.stats.emptyNodesFiltered}</span>
					</div>
					<div>
						<span class="text-slate-600 dark:text-slate-400">Links Processed:</span>
						<span class="ml-2 font-medium text-slate-900 dark:text-slate-100">{conversionResult.stats.linksProcessed}</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Markdown Content Preview -->
		{#if showPreview && markdownContent.trim()}
			<div class="mt-4">
				<h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
					Markdown Preview
				</h3>
				<div class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-auto max-h-64">
					<pre class="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">{markdownContent}</pre>
				</div>
			</div>
		{/if}
	</div>
</Card>
