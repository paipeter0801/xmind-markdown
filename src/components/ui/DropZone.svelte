<script lang="ts">
	import { cn } from '../../lib/utils';

	interface Props {
		accept?: string;
		multiple?: boolean;
		disabled?: boolean;
		class?: string;
		onFileSelect: (files: File[]) => void;
	}

	let {
		accept = '.xmind',
		multiple = false,
		disabled = false,
		class: className,
		onFileSelect
	}: Props = $props();

	let isDragging = $state(false);
	let fileInput = $state<HTMLInputElement>();

	const baseClasses =
		'border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer';

	const stateClasses = $derived(
		cn(
			baseClasses,
			disabled
				? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
				: 'hover:border-primary-500 dark:hover:border-primary-500',
			isDragging && !disabled
				? 'border-primary-500 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.02]'
				: 'border-slate-300 dark:border-slate-600',
			className
		)
	);

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		if (!disabled) {
			isDragging = true;
		}
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		if (!disabled) {
			isDragging = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (!disabled) {
			isDragging = true;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;

		if (disabled) return;

		const files = Array.from(e.dataTransfer?.files || []);
		if (files.length > 0) {
			onFileSelect(multiple ? files : [files[0]]);
		}
	}

	function handleClick() {
		if (!disabled) {
			fileInput?.click();
		}
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const files = Array.from(target.files || []);
		if (files.length > 0) {
			onFileSelect(multiple ? files : [files[0]]);
		}
		// Reset input value so same file can be selected again
		target.value = '';
	}
</script>

<div
	class="{stateClasses}"
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	onclick={handleClick}
	role="button"
	tabindex="0"
	aria-label="Drop zone for file upload"
>
	<div class="flex flex-col items-center gap-4">
		<div
			class="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center transition-transform"
			class:scale-110={isDragging}
		>
			<svg class="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 4v16m8-8H4"
				/>
			</svg>
		</div>
		<div>
			<p class="text-lg font-medium text-slate-700 dark:text-slate-300">
				{isDragging ? 'Drop your file here' : 'Drop your XMind file here'}
			</p>
			<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">or click to browse</p>
		</div>
		<input
			bind:this={fileInput}
			type="file"
			{accept}
			{multiple}
			onchange={handleFileChange}
			class="hidden"
			disabled={disabled}
		/>
	</div>
</div>
