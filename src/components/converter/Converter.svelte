<script lang="ts">
	import DropZone from '../ui/DropZone.svelte';
	import Card from '../ui/Card.svelte';
	import ResultPanel from './ResultPanel.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import TableOfContents from './TableOfContents.svelte';
	import type { ConversionResult } from '../../types/converter';
	import { MarkdownToXmindConverter } from '../../lib/markdown-to-xmind';
	import { downloadXmind } from '../../lib/download';

	// Type for global converter
	type GlobalConverter = {
		convertXmindToMarkdown: (
			file: File | ArrayBuffer,
			fileName?: string,
			options?: any
		) => Promise<ConversionResult>;
	};

	// Generate unique ID for headings (uses closure, not reactive state)
	function createHeadingIdGenerator() {
		let counter = 0;
		return (text: string): string => {
			// Remove leading emoji
			let cleanText = text.replace(/^[\p{Emoji}\p{Extended_Pictographic}]\s*/u, '');
			// Remove special characters, keep only letters, numbers, spaces, and hyphens
			cleanText = cleanText.replace(/[^\p{L}\p{N}\s-]/gu, '');
			// Trim whitespace
			cleanText = cleanText.trim();
			// Convert spaces to hyphens
			cleanText = cleanText.replace(/\s+/g, '-');
			// Lowercase the result
			cleanText = cleanText.toLowerCase();
			return `heading-${cleanText}-${++counter}`;
		};
	}

	// Inline utility functions to avoid import issues
	function markdownToHtml(markdown: string): string {
		// Create a new ID generator for each conversion
		const generateId = createHeadingIdGenerator();

		const lines = markdown.split('\n');
		const result: string[] = [];

		for (const line of lines) {
			// Handle headings with IDs
			const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
			if (headingMatch) {
				const level = headingMatch[1].length;
				const text = headingMatch[2].trim();
				const id = generateId(text);
				result.push(`<h${level} id="${id}">${text}</h${level}>`);
			}
			// Handle list items with indentation (depth 5+)
			else if (line.match(/^\s{2,}-\s/)) {
				const indentMatch = line.match(/^(\s*)-\s(.+)$/);
				if (indentMatch) {
					const spaces = indentMatch[1].length;
					const text = indentMatch[2];
					const indentLevel = Math.floor(spaces / 2);
					const marginLeft = `${indentLevel * 1.5}rem`;
					result.push(`<div style="margin-left: ${marginLeft}" class="list-item">- ${text}</div>`);
				} else {
					result.push(line);
				}
			}
			// Handle other markdown syntax
			else if (line.match(/^\*\*(.*)\*\*/)) {
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
				// 空行保持為空行（不添加 <br />）
				result.push('');
			} else {
				result.push(line);
			}
		}

		return result.join('\n');
	}

	function downloadFile(content: string, filename: string, mimeType: string) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	async function copyToClipboard(content: string): Promise<boolean> {
		try {
			await navigator.clipboard.writeText(content);
			return true;
		} catch {
			// Fallback for older browsers
			const textArea = document.createElement('textarea');
			textArea.value = content;
			textArea.style.position = 'fixed';
			textArea.style.left = '-999999px';
			document.body.appendChild(textArea);
			textArea.select();
			try {
				document.execCommand('copy');
				document.body.removeChild(textArea);
				return true;
			} catch {
				document.body.removeChild(textArea);
				return false;
			}
		}
	}

	function getBaseFilename(filename: string): string {
		return filename.replace(/\.[^/.]+$/, '');
	}

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
	let htmlContent = $derived(result && result.success && result.content ? markdownToHtml(result.content) : '');
	let errorMessage = $state<string | null>(null);
	let tocMaxDepth = $state(5); // 預設顯示 5 層目錄
	let showToc = $state(true); // 是否顯示目錄

	async function handleFileSelect(files: File[]) {
		if (files.length === 0) return;

		const file = files[0];
		const fileName = file.name.toLowerCase();

		// Detect file type and convert accordingly
		if (!fileName.endsWith('.xmind') && !fileName.endsWith('.md')) {
			errorMessage = 'Please select a valid file (.xmind or .md)';
			return;
		}

		selectedFile = file;
		errorMessage = null;

		// Handle Markdown → XMind conversion
		if (fileName.endsWith('.md')) {
			await performMarkdownToXmindConversion(file);
		} else {
			// Existing XMind → Markdown conversion
			await performConversion(file);
		}
	}

	async function performConversion(file: File) {
		isConverting = true;
		conversionProgress = 0;
		result = null;

		onConversionStart?.();

		try {
			// Check if converter is available
			const converter = (globalThis as any).XmindConverter as GlobalConverter;
			if (!converter?.convertXmindToMarkdown) {
				throw new Error('Converter not loaded. Please refresh the page.');
			}

			// Read file
			conversionProgress = 10;
			const arrayBuffer = await file.arrayBuffer();

			// Convert using global converter
			conversionProgress = 30;
			const conversionResult = await converter.convertXmindToMarkdown(arrayBuffer, file.name, {
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

			// 如果轉換失敗，設置錯誤訊息
			if (!conversionResult.success) {
				errorMessage = conversionResult.error || 'Failed to convert XMind file';
				onError?.(errorMessage);
			} else {
				onConversionComplete?.(conversionResult);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to convert file';
			errorMessage = message;
			onError?.(message);
		} finally {
			isConverting = false;
		}
	}

	async function performMarkdownToXmindConversion(file: File) {
		isConverting = true;
		conversionProgress = 0;
		result = null;

		onConversionStart?.();

		try {
			conversionProgress = 10;
			const text = await file.text();

			conversionProgress = 30;
			const mdConverter = new MarkdownToXmindConverter();
			const xmindResult = await mdConverter.convert(text);

			conversionProgress = 90;

			if (xmindResult.success && xmindResult.blob) {
				// Auto-download the XMind file
				const baseName = file.name.replace(/\.md$/i, '');
				downloadXmind(xmindResult.blob, baseName);

				// Update UI to show conversion result
				result = {
					content: `Successfully converted to XMind!\n\nNodes created: ${xmindResult.stats.totalNodes}\nMax depth: ${xmindResult.stats.maxDepth}\nLinks processed: ${xmindResult.stats.linksProcessed}`,
					stats: {
						totalTopics: xmindResult.stats.totalNodes,
						maxDepthReached: xmindResult.stats.maxDepth,
						rootTopics: 1,
						processingTime: 0,
						markersProcessed: 0,
						attachmentsProcessed: 0,
						linksProcessed: xmindResult.stats.linksProcessed,
						imagesProcessed: 0,
					},
					metadata: {
						sourceFile: file.name,
						sourceFormat: 'markdown',
						timestamp: new Date(),
						version: '1.0.0',
					},
					success: true,
				};

				onConversionComplete?.(result);
			} else {
				errorMessage = xmindResult.error || 'Failed to convert Markdown file';
				onError?.(errorMessage);
			}

			conversionProgress = 100;
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
					Upload File (.xmind or .md)
				</h2>
				<DropZone onFileSelect={handleFileSelect} />
			</Card>
		{:else}
			<!-- Compact File Info Bar -->
			<div class="bg-white dark:bg-slate-800 rounded-xl px-4 py-2 flex items-center justify-between border border-slate-200 dark:border-slate-700">
				<div class="flex items-center gap-3 min-w-0">
					<svg class="w-5 h-5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<div class="min-w-0">
						<p class="font-medium text-slate-900 dark:text-slate-100 truncate text-sm">
							{selectedFile.name}
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					{#if isConverting}
						<div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
						</div>
					{/if}
					<button
						onclick={handleClearFile}
						class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400 flex-shrink-0"
						aria-label="Clear file"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			{#if isConverting}
				<div class="mt-3">
					<ProgressBar progress={conversionProgress} label="Converting..." />
				</div>
			{/if}
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

	<!-- Result Panel with TOC -->
	{#if result}
		<div class="space-y-4">
			<!-- Control Bar -->
			<div class="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-700">
				<div class="flex items-center gap-2">
					<svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7" />
					</svg>
					<span class="font-semibold text-slate-900 dark:text-slate-100">Markdown Preview</span>
				</div>
				<div class="flex items-center gap-4">
					<!-- TOC Toggle -->
					<button
						onclick={() => showToc = !showToc}
						class="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
						</svg>
						<span>目錄</span>
						<div class="relative inline-flex h-5 w-8 items-center rounded-full bg-slate-200 dark:bg-slate-700 transition-colors">
							<div
								class="inline-block h-3 w-3 transform rounded-full bg-white dark:bg-slate-900 transition-transform {showToc ? 'translate-x-5' : 'translate-x-0.5'}"
							></div>
						</div>
					</button>
					<!-- Depth Control -->
					{#if showToc}
						<div class="flex items-center gap-2 text-sm">
							<span class="text-slate-600 dark:text-slate-400">層數</span>
							<span class="font-semibold text-primary-600 dark:text-primary-400 w-5 text-center">{tocMaxDepth}</span>
							<input
								type="range"
								min="2"
								max="10"
								bind:value={tocMaxDepth}
								class="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
							/>
						</div>
					{/if}
				</div>
			</div>

			<!-- Content Grid -->
			<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
				<!-- Main Content -->
				<div class={showToc ? 'lg:col-span-3' : 'lg:col-span-4'}>
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
				{#if showToc}
					<div class="lg:col-span-1">
						<div class="sticky top-4">
							<TableOfContents htmlContent={htmlContent} maxDepth={tocMaxDepth} />
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
