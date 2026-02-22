import './styles.css';
import { CreateMLCEngine } from '@mlc-ai/web-llm';
import { $, state, loadSettings, saveSettings } from './state.js';
import { DEFAULT_LOCAL_MODEL, getAvailableChars } from './models.js';
import { hideAllScreens, notify } from './ui.js';
import { getPageContent } from './content.js';
import { generate } from './generate.js';
import { showSettings, hideSettings, fetchModels, getSelectedModel } from './settings.js';

// --- Model initialization ---

async function initLocal() {
	hideAllScreens();
	$('#loading').classList.remove('hidden');
	// Reset loading screen state from any previous attempt
	$('#progress-bar').style.width = '0%';
	$('#progress-pct').textContent = '0%';
	$('#progress-text').textContent = 'Initializing...';
	$('#progress-text').classList.remove('error');
	$('#loading-retry').classList.add('hidden');
	try {
		const modelId = state.settings.localModel || DEFAULT_LOCAL_MODEL;
		state.engine = await CreateMLCEngine(modelId, {
			initProgressCallback({ progress, text }) {
				const pct = Math.round(progress * 100);
				$('#progress-bar').style.width = `${pct}%`;
				$('#progress-pct').textContent = `${pct}%`;
				$('#progress-text').textContent = text;
			},
		});
		state.loadedModel = modelId;
		$('#loading').classList.add('hidden');
		$('#chat').classList.remove('hidden');
		$('#status-dot').classList.add('online');
		$('#status-text').textContent = 'Ready';
		notify('Model loaded. Summarize this page or ask a question.');
	} catch (err) {
		$('#progress-text').textContent = `Failed to load: ${err}`;
		$('#progress-text').classList.add('error');
		$('#loading-retry').classList.remove('hidden');
	}
}

function initProvider() {
	state.engine = null;
	hideAllScreens();
	$('#chat').classList.remove('hidden');
	$('#status-dot').classList.add('online');
	$('#status-text').textContent = 'Ready (API)';
	notify('Using API provider. Summarize this page or ask a question.');
}

async function init() {
	await loadSettings();
	if (!state.settings.configured) {
		hideAllScreens();
		$('#onboarding').classList.remove('hidden');
		return;
	}
	if (state.settings.useProvider && state.settings.url && state.settings.key && state.settings.model) {
		initProvider();
	} else if (state.settings.useProvider) {
		showSettings();
	} else {
		await initLocal();
	}
}

// --- Event handlers ---

$('#summarize').addEventListener('click', async () => {
	try {
		const page = await getPageContent();
		const text = state.settings.useProvider ? page.content : page.content.substring(0, getAvailableChars(state.settings.localModel));
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
		const text = state.settings.useProvider ? page.content : page.content.substring(0, getAvailableChars(state.settings.localModel));
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
	state.engine?.resetChat();
	notify('Chat cleared.');
});

// --- Settings event handlers ---

$('#settings-btn').addEventListener('click', showSettings);
$('#settings-cancel').addEventListener('click', hideSettings);
$('#loading-settings-btn').addEventListener('click', showSettings);

$('#use-provider').addEventListener('change', () => {
	const checked = $('#use-provider').checked;
	$('#provider-fields').classList.toggle('hidden', !checked);
	$('#local-mode-info').classList.toggle('hidden', checked);
});

function populateModelDropdown(models) {
	const select = $('#provider-model-select');
	const statusEl = $('#model-status');
	select.innerHTML = '';

	if (models.length === 0) {
		select.innerHTML = '<option value="" disabled selected>No models found</option>';
		select.disabled = true;
		statusEl.textContent = 'No models available on this server.';
		statusEl.className = 'error';
		return;
	}

	models.forEach((id) => {
		const opt = document.createElement('option');
		opt.value = id;
		opt.textContent = id;
		select.append(opt);
	});
	select.disabled = false;

	if (state.settings.model && models.includes(state.settings.model)) {
		select.value = state.settings.model;
	}

	statusEl.textContent = `${models.length} model${models.length > 1 ? 's' : ''} available.`;
	statusEl.className = 'success';
}

$('#fetch-models-btn').addEventListener('click', async () => {
	const url = $('#provider-url').value.trim();
	const key = $('#provider-key').value.trim();
	const statusEl = $('#model-status');

	if (!url || !key) {
		statusEl.textContent = 'Enter URL and API key first.';
		statusEl.className = 'error';
		return;
	}

	$('#fetch-models-btn').disabled = true;
	statusEl.textContent = 'Fetching models...';
	statusEl.className = '';

	try {
		const models = await fetchModels(url, key);
		populateModelDropdown(models);
	} catch (err) {
		const msg = err?.message || `${err}`;
		statusEl.textContent = msg.length > 60 ? msg.slice(0, 60) + '...' : msg;
		statusEl.className = 'error';
	} finally {
		$('#fetch-models-btn').disabled = false;
	}
});

$('#use-custom-model').addEventListener('change', () => {
	const useCustom = $('#use-custom-model').checked;
	$('#provider-model-custom').classList.toggle('hidden', !useCustom);
	$('#model-selector').classList.toggle('hidden', useCustom);
});

$('#test-btn').addEventListener('click', async () => {
	const url = $('#provider-url').value.trim();
	const key = $('#provider-key').value.trim();
	const resultEl = $('#test-result');

	if (!url || !key) {
		resultEl.textContent = 'Enter URL and API key first.';
		resultEl.className = 'error';
		return;
	}

	$('#test-btn').disabled = true;
	resultEl.textContent = 'Connecting...';
	resultEl.className = '';

	try {
		const models = await fetchModels(url, key);
		resultEl.textContent = `Connected. ${models.length} model${models.length > 1 ? 's' : ''} found.`;
		resultEl.className = 'success';
		populateModelDropdown(models);
	} catch (err) {
		const msg = err?.message || `${err}`;
		resultEl.textContent = msg.length > 80 ? msg.slice(0, 80) + '...' : msg;
		resultEl.className = 'error';
	} finally {
		$('#test-btn').disabled = false;
	}
});

$('#settings-save').addEventListener('click', async () => {
	const selectedLocal = $('input[name="local-model"]:checked');
	const next = {
		configured: true,
		useProvider: $('#use-provider').checked,
		localModel: selectedLocal ? selectedLocal.value : state.settings.localModel,
		url: $('#provider-url').value.trim(),
		key: $('#provider-key').value.trim(),
		model: getSelectedModel(),
	};

	if (next.useProvider && (!next.url || !next.key || !next.model)) {
		$('#test-result').textContent = 'Please fill in all fields before saving.';
		$('#test-result').className = 'error';
		return;
	}

	if (!next.useProvider && !next.localModel) {
		$('#test-result').textContent = 'Please select a local model.';
		$('#test-result').className = 'error';
		return;
	}

	if (next.useProvider) {
		await saveSettings(next);
		initProvider();
	} else if (state.engine && state.loadedModel === next.localModel) {
		await saveSettings(next);
		hideAllScreens();
		$('#chat').classList.remove('hidden');
	} else {
		await saveSettings(next);
		$('#status-dot').classList.remove('online');
		$('#status-text').textContent = 'Offline';
		await initLocal();
	}
});

// --- Onboarding ---

$('#choose-local').addEventListener('click', async () => {
	await saveSettings({ ...state.settings, configured: true, useProvider: false });
	showSettings();
});

$('#choose-provider').addEventListener('click', async () => {
	await saveSettings({ ...state.settings, configured: true, useProvider: true });
	showSettings();
});

init();
