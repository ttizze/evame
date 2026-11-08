// The same browser editor and public APIs run in Playwright and WKWebView.
window.runCorpus = async () => {
	await window.ready;
	const results = [];
	for (const entry of window.corpus) {
		try {
			window.editor.setValue(entry.markdown, true);
			results.push({
				...entry,
				saved: window.editor.getValue(),
				editorHTML: window.editor.getHTML(),
			});
		} catch (error) {
			results.push({ ...entry, error: String(error) });
		}
		if (results.length % 50 === 0)
			await new Promise((resolve) => setTimeout(resolve, 0));
	}
	return results;
};
