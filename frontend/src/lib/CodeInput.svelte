<script>
	// @ts-nocheck
	import { onMount } from 'svelte';

	export let languages;

	/** @type String */
	let selectedLanguage = '';
	/** @type HTMLDivElement */
	let editorBlock;

	/** @type import('monaco-editor').editor.IStandaloneCodeEditor */
	let editor;

	let updateLangauge;
	let monaco;
	async function getMonaco() {
		if (monaco) {
			return monaco;
		} else {
			monaco = await import('monaco-editor');
			return monaco;
		}
	}

	$: if (selectedLanguage) {
		(async () => {
			await updateLangauge(languages[selectedLanguage].monaco);
		})();
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

	updateLangauge = async (langauge) => {
		let model = editor.getModel();
		(await getMonaco()).editor.setModelLanguage(model, langauge);
	};

	function submitCode() {
		// TODO
		console.log(editor.getValue());
	}
</script>

<div class="accordion my-3">
	<div class="accordion-item">
		<h2 class="accordion-header" id="headingOne">
			<button
				class="accordion-button collapsed"
				type="button"
				data-bs-toggle="collapse"
				data-bs-target="#collapseOne"
				aria-expanded="false"
				aria-controls="collapseOne"
			>
				Submit Code
			</button>
		</h2>
		<div id="collapseOne" class="accordion-collapse collapse" aria-labelledby="headingOne">
			<form class="mx-3 my-3" on:submit|preventDefault={submitCode}>
				<label for="langauge" class="form-lable">Language</label>
				<select bind:value={selectedLanguage} class="form-select" required>
					{#each Object.entries(languages) as [key, value]}
						<option value={key}>
							{value.name}
						</option>
					{/each}
				</select>

				<div class="accordion-body">
					<div bind:this={editorBlock} style="height:720px; width=100%" />
					<button type="submit" class="btn btn-primary mt-3">Submit</button>
				</div>
			</form>
		</div>
	</div>
</div>
