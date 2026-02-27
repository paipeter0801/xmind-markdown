<script lang="ts">
	import { cn } from '../../lib/utils';

	interface Props {
		progress: number;
		max?: number;
		showPercentage?: boolean;
		label?: string;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'default' | 'success' | 'warning' | 'error';
		class?: string;
	}

	let {
		progress,
		max = 100,
		showPercentage = true,
		label,
		size = 'md',
		variant = 'default',
		class: className
	}: Props = $props();

	const percentage = $derived(Math.min(Math.max((progress / max) * 100, 0), 100));

	const sizeClasses = $derived(
		cn(
			size === 'sm' && 'h-1.5',
			size === 'md' && 'h-2.5',
			size === 'lg' && 'h-4'
		)
	);

	const variantClasses = $derived(
		cn(
			'rounded-full transition-all duration-300 ease-out',
			variant === 'default' && 'bg-primary-500',
			variant === 'success' && 'bg-green-500',
			variant === 'warning' && 'bg-yellow-500',
			variant === 'error' && 'bg-red-500'
		)
	);
</script>

<div class={cn('w-full', className)}>
	{#if label || showPercentage}
		<div class="flex items-center justify-between mb-2">
			{#if label}
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
			{/if}
			{#if showPercentage}
				<span class="text-sm text-slate-600 dark:text-slate-400">
					{Math.round(percentage)}%
				</span>
			{/if}
		</div>
	{/if}
	<div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden {sizeClasses}">
		<div
			class="{variantClasses} {sizeClasses}"
			style="width: {percentage}%"
			role="progressbar"
			aria-valuenow={progress}
			aria-valuemin={0}
			aria-valuemax={max}
		>
		</div>
	</div>
</div>
