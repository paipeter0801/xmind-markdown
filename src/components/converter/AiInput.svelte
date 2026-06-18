<script lang="ts">
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import { MarkdownToXmindConverter } from '../../lib/markdown-to-xmind';
	import { downloadXmind } from '../../lib/download';
	import { generateOutline, AiClientError } from '../../lib/ai-client';
	import { AI_ENABLED } from '../../lib/ai-config';

	let topic = $state('');
	let content = $state('');
	let hint = $state('');
	let isGenerating = $state(false);
	let errorMessage = $state<string | null>(null);
	let generatedMarkdown = $state('');

	function downloadMarkdownFile(text: string, name: string) {
		const blob = new Blob([text], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function handleGenerate() {
		if (!topic.trim()) {
			errorMessage = '請輸入主題';
			return;
		}
		if (!content.trim()) {
			errorMessage = '請輸入內容／想法';
			return;
		}
		isGenerating = true;
		errorMessage = null;
		generatedMarkdown = '';
		try {
			generatedMarkdown = await generateOutline({
				topic: topic.trim(),
				content: content.trim(),
				hint: hint.trim() || undefined,
			});
		} catch (e) {
			errorMessage = e instanceof AiClientError ? e.message : '生成失敗，請稍後再試。';
		} finally {
			isGenerating = false;
		}
	}

	async function handleDownloadXmind() {
		if (!generatedMarkdown) return;
		try {
			const result = await new MarkdownToXmindConverter().convert(generatedMarkdown);
			if (result.success && result.blob) {
				const base = (topic.trim() || 'ai-mindmap').replace(/\.xmind$/i, '');
				downloadXmind(result.blob, base);
			} else {
				errorMessage = result.error || '轉換 .xmind 失敗';
			}
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : '轉換 .xmind 失敗';
		}
	}

	function handleDownloadMd() {
		if (!generatedMarkdown) return;
		const base = (topic.trim() || 'ai-mindmap').replace(/\.xmind$/i, '');
		downloadMarkdownFile(generatedMarkdown, `${base}.md`);
	}

	function handleClear() {
		topic = '';
		content = '';
		hint = '';
		generatedMarkdown = '';
		errorMessage = null;
	}
</script>

<Card>
	<div class="space-y-4">
		<h2 class="text-2xl font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
			<svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
			</svg>
			AI Help
		</h2>

		<!-- 隱私提示 -->
		<div class="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
			<p class="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
				🔒 此模式會將你下方輸入的<b>文字</b>送至 AI（Cloudflare Workers AI）生成心智圖大綱。
				AI <b>不會</b>處理你上傳的 <code>.xmind</code> 檔案——免費轉換全程在你的瀏覽器本地完成。
			</p>
		</div>

		{#if !AI_ENABLED}
			<div class="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
				<p class="text-xs text-slate-600 dark:text-slate-400">
					⚠️ AI 功能尚未啟用（管理員尚未設定 AI API endpoint）。免費的檔案/文字轉換仍可正常使用。
				</p>
			</div>
		{/if}

		<!-- 主題 -->
		<div>
			<label for="ai-topic" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
				主題
			</label>
			<input
				id="ai-topic"
				type="text"
				bind:value={topic}
				placeholder="例：產品上市計畫"
				class="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
			/>
		</div>

		<!-- 內容 -->
		<div>
			<label for="ai-content" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
				內容／想法（純文字即可，不必 markdown）
			</label>
			<textarea
				id="ai-content"
				bind:value={content}
				rows="8"
				placeholder="把腦中想到的點子、會議筆記、零散清單貼進來，AI 會幫你組織成有層次的心智圖大綱。"
				class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
			></textarea>
		</div>

		<!-- 提示（可選） -->
		<div>
			<label for="ai-hint" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
				額外提示 <span class="text-slate-400 font-normal">(可選)</span>
			</label>
			<input
				id="ai-hint"
				type="text"
				bind:value={hint}
				placeholder="例：偏向 3 層深度 / 繁體中文 / 重點標 star"
				class="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
			/>
		</div>

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
			<Button variant="primary" onclick={handleGenerate} disabled={isGenerating || !AI_ENABLED || !topic.trim() || !content.trim()}>
				{#if isGenerating}
					<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
				{:else}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				{/if}
				{isGenerating ? '生成中...' : 'AI 生成大綱'}
			</Button>
		</div>

		<!-- 結果 -->
		{#if generatedMarkdown}
			<div class="mt-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">生成結果（可下載）</h3>
					<div class="flex items-center gap-2">
						<button
							onclick={handleDownloadMd}
							class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
						>
							⬇ .md
						</button>
						<button
							onclick={handleDownloadXmind}
							class="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
						>
							⬇ .xmind
						</button>
					</div>
				</div>
				<pre class="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono max-h-72 overflow-auto">{generatedMarkdown}</pre>
			</div>
		{/if}
	</div>
</Card>
