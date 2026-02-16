import './styles.css';
import { CreateMLCEngine } from '@mlc-ai/web-llm';
import { marked } from 'marked';

marked.setOptions({ breaks: true });

// Configuration — change to any model from WebLLM's prebuilt list
const MODEL_ID = 'Qwen3-1.7B-q4f16_1-MLC';
const MAX_CHARS = 4000;

const $ = (sel) => document.querySelector(sel);
let engine = null;
let busy = false;

// Load the model
async function init() {
	try {
		engine = await CreateMLCEngine(MODEL_ID, {
			initProgressCallback({ progress, text }) {
				const pct = Math.round(progress * 100);
				$('#progress-bar').style.width = `${pct}%`;
				$('#progress-pct').textContent = `${pct}%`;
				$('#progress-text').textContent = text;
			},
		});
		$('#loading').classList.add('hidden');
		$('#chat').classList.remove('hidden');
		$('#status-dot').classList.add('online');
		$('#status-text').textContent = 'Ready';
		notify('Model loaded. Summarize this page or ask a question.');
	} catch (err) {
		$('#progress-text').textContent = `Failed to load: ${err}`;
		$('#progress-text').classList.add('error');
	}
}

// Get the text content of the active tab
async function getPageContent() {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	if (!tab?.id) throw new Error('No active tab');
	const [{ result }] = await chrome.scripting.executeScript({
		target: { tabId: tab.id },
		func: () => ({
			content: (document.querySelector('main, article, [role="main"]') || document.body).innerText.trim(),
			title: document.title,
			url: location.href,
		}),
	});
	if (!result) throw new Error('Cannot read this page.');
	return result;
}

// Strip <think>...</think> blocks from model output
function parseThinking(text) {
	if (!text.includes('<think>')) return { thinking: '', response: text };
	const start = text.indexOf('<think>') + 7;
	const end = text.indexOf('</think>');
	if (end === -1) return { thinking: text.slice(start), response: '' };
	return { thinking: text.slice(start, end).trim(), response: text.slice(end + 8).trim() };
}

// Add a system notification to the chat
function notify(text) {
	const div = document.createElement('div');
	div.className = 'message system';
	div.textContent = text;
	$('#messages').append(div);
	$('#messages').scrollTop = $('#messages').scrollHeight;
}

// Stream a response from the model
async function generate(prompt, label) {
	if (!engine || busy) return;
	busy = true;
	$('#send').disabled = $('#summarize').disabled = true;

	// User message
	const userMsg = document.createElement('div');
	userMsg.className = 'message user';
	userMsg.innerHTML = '<div class="message-role">You</div><div class="message-content"></div>';
	userMsg.lastChild.textContent = label;
	$('#messages').append(userMsg);

	// Assistant message with collapsible thinking section
	$('#messages').insertAdjacentHTML(
		'beforeend',
		`<div class="message assistant">
			<div class="message-role">Lucid</div>
			<details class="thinking" hidden><summary>Thinking</summary><div class="thinking-content"></div></details>
			<div class="message-content streaming"></div>
		</div>`,
	);
	const msg = $('#messages').lastElementChild;
	const thinkEl = msg.querySelector('.thinking');
	const thinkBody = msg.querySelector('.thinking-content');
	const body = msg.querySelector('.message-content');

	try {
		const stream = await engine.chat.completions.create({
			messages: [
				{ role: 'system', content: 'You are a helpful assistant that analyzes web pages. Be concise.' },
				{ role: 'user', content: prompt },
			],
			stream: true,
			temperature: 0.7,
			max_tokens: 1024,
		});

		let reply = '';
		for await (const chunk of stream) {
			reply += chunk.choices[0]?.delta?.content || '';
			const { thinking, response } = parseThinking(reply);
			if (thinking) {
				thinkEl.hidden = false;
				thinkEl.open = !response;
				thinkBody.innerHTML = marked.parse(thinking);
			}
			body.innerHTML = response ? marked.parse(response) : '';
			$('#messages').scrollTop = $('#messages').scrollHeight;
		}
	} catch (err) {
		body.textContent = `Error: ${err}`;
		body.classList.add('error-text');
	} finally {
		body.classList.remove('streaming');
		busy = false;
		$('#send').disabled = $('#summarize').disabled = false;
	}
}

// Event handlers
$('#summarize').addEventListener('click', async () => {
	try {
		const page = await getPageContent();
		const text = page.content.substring(0, MAX_CHARS);
		await generate(
			`Summarize this web page:\n\nTitle: ${page.title}\nURL: ${page.url}\n\n${text}`,
			`Summarize: ${page.title}`,
		);
	} catch (err) {
		notify(`${err}`);
	}
});

$('#send').addEventListener('click', async () => {
	const q = $('#input').value.trim();
	if (!q) return;
	$('#input').value = '';
	try {
		const page = await getPageContent();
		const text = page.content.substring(0, MAX_CHARS);
		await generate(`Web page: ${page.title} (${page.url})\n\n${text}\n\nQuestion: ${q}`, q);
	} catch (err) {
		notify(`${err}`);
	}
});

$('#input').addEventListener('keydown', (e) => {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault();
		$('#send').click();
	}
});

$('#clear').addEventListener('click', () => {
	$('#messages').innerHTML = '';
	engine?.resetChat();
	notify('Chat cleared.');
});

init();
