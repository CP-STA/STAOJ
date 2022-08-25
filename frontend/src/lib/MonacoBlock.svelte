<script>
	import { onMount } from 'svelte';
	/** @type import('monaco-editor').editor.IStandaloneCodeEditor */
	let editor;

	/** @type String */
	export let language;

	export function getCode() {
		return editor.getValue();
	}

	/** @type import('monaco-editor') | null */
	let monaco;

	/** @type HTMLDivElement */
	let editorBlock;

	async function getMonaco() {
		if (!monaco) {
			monaco = await import('monaco-editor');
		}
		return monaco;
	}

	$: if (language) {
		(async () => {
			await updateLanguage(language);
		})();
	}

	/** @param language {String} */
	async function updateLanguage(language) {
		let model = editor.getModel();
		// @ts-ignore
		(await getMonaco()).editor.setModelLanguage(model, language);
	}

	onMount(async () => {
		const monaco = await getMonaco();
		editor = monaco.editor.create(editorBlock, {
			value: '',
			automaticLayout: true
		});

		return () => {
			editor.dispose();
		};
	});
</script>

<div bind:this={editorBlock} style="height:720px; width=100%" />
