import { $ } from './state.js';

export function hideAllScreens() {
	$('#onboarding').classList.add('hidden');
	$('#loading').classList.add('hidden');
	$('#chat').classList.add('hidden');
	$('#settings').classList.add('hidden');
}

export function notify(text) {
	const div = document.createElement('div');
	div.className = 'message system';
	div.textContent = text;
	$('#messages').append(div);
	$('#messages').scrollTop = $('#messages').scrollHeight;
}

export function parseThinking(text) {
	if (!text.includes('<think>')) return { thinking: '', response: text };
	const start = text.indexOf('<think>') + 7;
	const end = text.indexOf('</think>');
	if (end === -1) return { thinking: text.slice(start), response: '' };
	return { thinking: text.slice(start, end).trim(), response: text.slice(end + 8).trim() };
}
