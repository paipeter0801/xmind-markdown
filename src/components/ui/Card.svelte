<script lang="ts">
	import { cn } from '../../lib/utils';

	interface Props {
		variant?: 'default' | 'bordered' | 'elevated' | 'flat';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		variant = 'default',
		padding = 'md',
		class: className,
		children
	}: Props = $props();

	const baseClasses = 'rounded-xl transition-all';

	const variantClasses = $derived(
		cn(
			baseClasses,
			variant === 'default' &&
				'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg',
			variant === 'bordered' &&
				'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600',
			variant === 'elevated' &&
				'bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700',
			variant === 'flat' && 'bg-transparent dark:bg-transparent border-0 shadow-none'
		)
	);

	const paddingClasses = $derived(
		cn(
			padding === 'none' && 'p-0',
			padding === 'sm' && 'p-4',
			padding === 'md' && 'p-6',
			padding === 'lg' && 'p-8'
		)
	);
</script>

<div class="{variantClasses} {paddingClasses} {className}">
	{@render children?.()}
</div>
