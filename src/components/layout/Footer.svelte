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
				<span>&copy; {currentYear} XMind to Markdown</span>
				<span class="hidden sm:inline">•</span>
				<span class="hidden sm:inline">Built with Astro, Svelte, and Tailwind CSS</span>
			</div>

			<!-- Right Section - Links -->
			<nav class="flex items-center gap-4" aria-label="Footer navigation">
				<a
					href="/"
					class="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-500 transition-colors"
				>
					Home
				</a>
				<a
					href="https://github.com"
					target="_blank"
					rel="noopener noreferrer"
					class="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-500 transition-colors"
				>
					GitHub
				</a>
				<a
					href="/privacy"
					class="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-500 transition-colors"
				>
					Privacy
				</a>
			</nav>
		</div>

		<!-- Bottom Tagline -->
		<div class="mt-4 text-center sm:text-left">
			<p class="text-xs text-slate-500 dark:text-slate-500">
				Convert your XMind mind maps to Markdown format with real-time preview
			</p>
		</div>
	</div>
</footer>
