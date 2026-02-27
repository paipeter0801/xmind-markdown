<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '../../lib/utils';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		isLoading?: boolean;
	}

	let {
		variant = 'primary',
		size = 'md',
		isLoading = false,
		class: className,
		children,
		disabled,
		...restProps
	}: Props = $props();

	const baseClasses =
		'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

	const variantClasses = $derived(
		cn(
			baseClasses,
			variant === 'primary' &&
				'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm',
			variant === 'secondary' &&
				'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600',
			variant === 'outline' &&
				'border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
			variant === 'ghost' &&
				'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
			variant === 'danger' &&
				'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm',
			className
		)
	);

	const sizeClasses = $derived(
		cn(
			size === 'sm' && 'px-3 py-1.5 text-sm',
			size === 'md' && 'px-4 py-2 text-base',
			size === 'lg' && 'px-6 py-3 text-lg'
		)
	);

	const isDisabled = $derived(disabled || isLoading);
</script>

<button
	class="{variantClasses} {sizeClasses}"
	disabled={isDisabled}
	{...restProps}
>
	{#if isLoading}
		<svg
			class="animate-spin h-4 w-4"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
	{/if}
	{#if !isLoading}
		{@render children?.()}
	{/if}
</button>
