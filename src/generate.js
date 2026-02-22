import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText } from 'ai';
import { marked } from 'marked';
import { $, state } from './state.js';
import { getOutputTokens } from './models.js';
import { parseThinking } from './ui.js';

marked.setOptions({ breaks: true });

export async function generate(prompt, label) {
	if (state.busy) return;
	if (!state.settings.useProvider && !state.engine) return;
	state.busy = true;
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

	const messages = [
		{ role: 'system', content: 'You are a helpful assistant that analyzes web pages. Be concise.' },
		{ role: 'user', content: prompt },
	];

	try {
		let reply = '';

		if (state.settings.useProvider) {
			// Stream from OpenAI-compatible API via Vercel AI SDK — no token limits
			const provider = createOpenAICompatible({
				name: 'lucid-provider',
				baseURL: state.settings.url.replace(/\/+$/, ''),
				apiKey: state.settings.key,
			});

			const result = streamText({
				model: provider(state.settings.model),
				messages,
				temperature: 0.7,
			});

			let reasoning = '';
			for await (const part of result.fullStream) {
				if (part.type === 'reasoning-delta') {
					reasoning += part.text;
					thinkEl.hidden = false;
					thinkEl.open = true;
					thinkBody.innerHTML = marked.parse(reasoning);
				} else if (part.type === 'text-delta') {
					reply += part.text;
					// Handle models that embed <think> tags in content instead of using the reasoning field
					const { thinking, response } = parseThinking(reply);
					if (thinking && !reasoning) {
						thinkEl.hidden = false;
						thinkEl.open = !response;
						thinkBody.innerHTML = marked.parse(thinking);
						body.innerHTML = response ? marked.parse(response) : '';
					} else {
						if (reasoning) thinkEl.open = false;
						body.innerHTML = reply ? marked.parse(reply) : '';
					}
				}
				$('#messages').scrollTop = $('#messages').scrollHeight;
			}
		} else {
			// Stream from local WebLLM engine
			const stream = await state.engine.chat.completions.create({
				messages,
				stream: true,
				temperature: 0.7,
				max_tokens: getOutputTokens(state.settings.localModel),
			});

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
		}
	} catch (err) {
		body.textContent = `Error: ${err}`;
		body.classList.add('error-text');
	} finally {
		body.classList.remove('streaming');
		state.busy = false;
		$('#send').disabled = $('#summarize').disabled = false;
	}
}
