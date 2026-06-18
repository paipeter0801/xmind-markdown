<script lang="ts">
	import { cn } from '../../lib/utils';

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();

	const currentYear = $derived(new Date().getFullYear());
</script>

<footer class={cn('w-full py-6 px-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700', className)}>
	<div class="container mx-auto max-w-7xl">
		<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
			<!-- Left Section -->
			<div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
				<span>&copy; {currentYear} AI GoEZ</span>
				<span class="hidden sm:inline">•</span>
				<span class="hidden sm:inline">XMind ⇄ Markdown · 免費・隱私・離線</span>
			</div>

			<!-- Right Section - Links -->
			<nav class="flex items-center gap-4" aria-label="Footer navigation">
				<a
					href="/"
					class="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-500 transition-colors"
				>
					AI GoEZ
				</a>
				<a
					href="/xmind-to-markdown/"
					class="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-500 transition-colors"
				>
					XMind 轉 Markdown
				</a>
				<a
					href="/privacy/"
					class="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-500 transition-colors"
				>
					隱私
				</a>
			</nav>
		</div>

		<!-- Bottom Tagline -->
		<div class="mt-4 text-center sm:text-left">
			<p class="text-xs text-slate-500 dark:text-slate-500">
				主要相容 XMind 8（.xmind ZIP/XML 格式）· 檔案不上傳，全程在瀏覽器本地完成
			</p>
		</div>
	</div>
</footer>
