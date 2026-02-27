<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '../../lib/utils';

	interface Props {
		class?: string;
		size?: 'sm' | 'md' | 'lg';
	}

	let { class: className, size = 'md' }: Props = $props();

	let theme = $state<'light' | 'dark' | 'system'>('system');
	let isDark = $state(false);

	const sizeClasses = $derived(
		cn(
			'inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
			size === 'sm' && 'p-1.5',
			size === 'md' && 'p-2',
			size === 'lg' && 'p-3',
			className
		)
	);

	const iconClasses = $derived(cn(size === 'sm' && 'w-4 h-4', size === 'md' && 'w-5 h-5', size === 'lg' && 'w-6 h-6'));

	function updateTheme() {
		if (theme === 'system') {
			isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		} else {
			isDark = theme === 'dark';
		}

		if (isDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}

		try {
			localStorage.setItem('theme', theme);
		} catch {
			// localStorage not available
		}
	}

	function toggleTheme() {
		const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
		const currentIndex = themes.indexOf(theme);
		theme = themes[(currentIndex + 1) % themes.length];
		updateTheme();
	}

	onMount(() => {
		// Load saved theme preference
		try {
			const savedTheme = localStorage.getItem('theme');
			if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
				theme = savedTheme as 'light' | 'dark' | 'system';
			}
		} catch {
			// localStorage not available
		}

		updateTheme();

		// Listen for system theme changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			if (theme === 'system') {
				updateTheme();
			}
		};

		mediaQuery.addEventListener('change', handleChange);

		return () => {
			mediaQuery.removeEventListener('change', handleChange);
		};
	});
</script>

<button
	class="{sizeClasses} bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
	onclick={toggleTheme}
	aria-label="Toggle theme"
	title="Current theme: {theme}"
>
	{#if isDark}
		<!-- Moon Icon -->
		<svg class="{iconClasses}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
			/>
		</svg>
	{:else}
		<!-- Sun Icon -->
		<svg class="{iconClasses}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
			/>
		</svg>
	{/if}
</button>
