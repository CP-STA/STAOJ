<script>
	import { onMount } from 'svelte';
	import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
	import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

	/** @type import('monaco-editor').editor.IStandaloneCodeEditor */
	let editor;

	/** @type String */
	export let language;

	/** @type String */
	export let languageId;
	let previousLanguage = '';

	export function getCode() {
		return editor.getValue();
	}

	/** @type {{[name:string]: string}} */
	const languageBoilerPlate = {
		java: 'class Solution {\n    public static void main(String args[]){\n        \n    }\n}',
		gcc: 'int main(){\n    \n}',
		gpp: 'int main(){\n    \n}',
		rust: 'fn main(){\n    \n}',
		mono: 'class Solution {\n    static void Main() {\n        \n    }\n}'
	};

	/** @param {string} language */
	function getLanguageBoilerPlate(language) {
		if (!language) {
			return '';
		}
		const languageName = language.split('-')[0];
		if (languageName in languageBoilerPlate) {
			return languageBoilerPlate[languageName];
		} else {
			return '';
		}
	}

	/** @type import('monaco-editor') | null */
	let monaco;

	/** @type HTMLDivElement */
	let editorBlock;

	$: if (language) {
		(async () => {
			await updateLanguage(language, languageId);
		})();
	}

	/**
	 * @param language {string}
	 * @param languageId {string} */
	async function updateLanguage(language, languageId) {
		let model = editor.getModel();
		// @ts-ignore
		monaco.editor.setModelLanguage(model, language);

		if (!editor.getValue() || editor.getValue() == getLanguageBoilerPlate(previousLanguage)) {
			editor.setValue(getLanguageBoilerPlate(languageId));
		}
		previousLanguage = languageId;
	}

	onMount(async () => {
		self.MonacoEnvironment = {
			getWorker: function (_moduleId, label) {
				if (label === 'typescript' || label === 'javascript') return new tsWorker();
				return new editorWorker();
			}
		};

		monaco = await import('monaco-editor');
		editor = monaco.editor.create(editorBlock, {
			value: getLanguageBoilerPlate(language),
			automaticLayout: true
		});
		if (language) updateLanguage(language, languageId);

		return () => {
			editor.dispose();
		};
	});
</script>

<div bind:this={editorBlock} style="height:720px; width=100%" />
