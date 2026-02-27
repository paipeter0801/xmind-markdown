<script lang="ts">
	import DropZone from '../ui/DropZone.svelte';
	import Card from '../ui/Card.svelte';
	import ResultPanel from './ResultPanel.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import { convertXmindToMarkdown } from '../../lib/converter';
	import { markdownToHtml, downloadFile, copyToClipboard, getBaseFilename } from '../../lib/utils';
	import type { ConversionResult } from '../../types/converter';

	interface Props {
		onConversionStart?: () => void;
		onConversionComplete?: (result: ConversionResult) => void;
		onError?: (error: string) => void;
	}

	let { onConversionStart, onConversionComplete, onError }: Props = $props();

	let selectedFile = $state<File | null>(null);
	let isConverting = $state(false);
	let conversionProgress = $state(0);
	let result = $state<ConversionResult | null>(null);
	let htmlContent = $derived(result ? markdownToHtml(result.content) : '');
	let errorMessage = $state<string | null>(null);

	async function handleFileSelect(files: File[]) {
		if (files.length === 0) return;

		const file = files[0];
		if (!file.name.endsWith('.xmind')) {
			errorMessage = 'Please select a valid XMind file (.xmind)';
			return;
		}

		selectedFile = file;
		errorMessage = null;
		await performConversion(file);
	}

	async function performConversion(file: File) {
		isConverting = true;
		conversionProgress = 0;
		result = null;

		onConversionStart?.();

		try {
			// Read file
			conversionProgress = 10;
			const arrayBuffer = await file.arrayBuffer();

			// Convert
			conversionProgress = 30;
			const conversionResult = await convertXmindToMarkdown(arrayBuffer, file.name, {
				outputFormat: 'markdown',
				includeMetadata: true,
				includeIds: false,
				includeTimestamps: false,
				skipEmpty: true,
				preserveFormatting: true
			});

			conversionProgress = 90;

			// Simulate final progress
			await new Promise((resolve) => setTimeout(resolve, 200));
			conversionProgress = 100;

			result = conversionResult;
			onConversionComplete?.(conversionResult);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to convert file';
			errorMessage = message;
			onError?.(message);
		} finally {
			isConverting = false;
		}
	}

	function handleExport() {
		if (result && selectedFile) {
			const filename = `${getBaseFilename(selectedFile.name)}.md`;
			downloadFile(result.content, filename, 'text/markdown');
		}
	}

	async function handleCopy() {
		if (result) {
			const success = await copyToClipboard(result.content);
			if (!success) {
				errorMessage = 'Failed to copy to clipboard';
			}
		}
	}

	function handleClearFile() {
		selectedFile = null;
		result = null;
		errorMessage = null;
		conversionProgress = 0;
	}
</script>

<div class="space-y-6">
	<!-- Upload Section -->
	<section>
		{#if !selectedFile}
			<Card>
				<h2 class="text-2xl font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
					<svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
						/>
					</svg>
					Upload XMind File
				</h2>
				<DropZone onFileSelect={handleFileSelect} />
			</Card>
		{:else}
			<!-- File Info Card -->
			<Card>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-slate-900 dark:text-slate-100">
								{selectedFile.name}
							</p>
							<p class="text-sm text-slate-500 dark:text-slate-400">
								{(selectedFile.size / 1024).toFixed(2)} KB
							</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						{#if isConverting}
							<div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
								<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
								Converting...
							</div>
						{/if}
						<button
							onclick={handleClearFile}
							class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
							aria-label="Clear file"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>

				{#if isConverting}
					<div class="mt-4">
						<ProgressBar progress={conversionProgress} label="Converting..." />
					</div>
				{/if}
			</Card>
		{/if}
	</section>

	<!-- Error Message -->
	{#if errorMessage}
		<div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
			<div class="flex items-start gap-3">
				<svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div>
					<p class="font-medium text-red-800 dark:text-red-200">Conversion Error</p>
					<p class="text-sm text-red-600 dark:text-red-400 mt-1">{errorMessage}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Result Panel -->
	{#if result}
		<ResultPanel
			content={htmlContent}
			stats={result.stats}
			sourceFile={result.metadata.sourceFile}
			isLoading={isConverting}
			onExport={handleExport}
			onCopy={handleCopy}
		/>
	{/if}
</div>
