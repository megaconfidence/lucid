import { Readability } from '@mozilla/readability';

export async function getPageContent() {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	if (!tab?.id) throw new Error('No active tab');
	const [{ result }] = await chrome.scripting.executeScript({
		target: { tabId: tab.id },
		func: () => ({
			html: document.documentElement.outerHTML,
			fallback: (document.querySelector('main, article, [role="main"]') || document.body).innerText.trim(),
			title: document.title,
			url: location.href,
		}),
	});
	if (!result) throw new Error('Cannot read this page.');

	// Try Readability for cleaner content extraction; fall back to innerText
	let content = result.fallback;
	try {
		const doc = new DOMParser().parseFromString(result.html, 'text/html');
		const article = new Readability(doc).parse();
		if (article?.textContent?.trim()) {
			content = article.textContent.trim();
		}
	} catch {
		// Readability failed — use fallback
	}

	return { content, title: result.title, url: result.url };
}
