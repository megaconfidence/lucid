import { $, state, saveSettings } from './state.js';
import { LOCAL_MODELS, DEFAULT_LOCAL_MODEL } from './models.js';
import { hideAllScreens } from './ui.js';

export async function fetchModels(url, key) {
	const endpoint = url.replace(/\/+$/, '') + '/models';
	const res = await fetch(endpoint, {
		headers: { Authorization: `Bearer ${key}` },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const body = await res.json();
	return (body.data || []).map((m) => m.id).filter(Boolean).sort();
}

export function getSelectedModel() {
	if ($('#use-custom-model').checked) {
		return $('#provider-model-custom').value.trim();
	}
	return $('#provider-model-select').value;
}

export function populateLocalModels() {
	const list = $('#local-model-list');
	list.innerHTML = '';
	const selected = state.settings.localModel || DEFAULT_LOCAL_MODEL;

	LOCAL_MODELS.forEach((m) => {
		const option = document.createElement('label');
		option.className = 'local-model-option' + (m.id === selected ? ' selected' : '');
		option.innerHTML = `
			<input type="radio" name="local-model" value="${m.id}" ${m.id === selected ? 'checked' : ''} />
			<span class="local-model-radio"></span>
			<span class="local-model-details">
				<span class="local-model-name">
					${m.name}${m.tag ? `<span class="local-model-tag">${m.tag}</span>` : ''}
				</span>
				<span class="local-model-meta">
					<span>${m.params} params</span><span>${m.vram}</span>
				</span>
			</span>`;
		option.querySelector('input').addEventListener('change', () => {
			list.querySelectorAll('.local-model-option').forEach((el) => el.classList.remove('selected'));
			option.classList.add('selected');
		});
		list.append(option);
	});
}

export function showSettings() {
	$('#use-provider').checked = state.settings.useProvider;
	$('#provider-url').value = state.settings.url;
	$('#provider-key').value = state.settings.key;
	$('#provider-fields').classList.toggle('hidden', !state.settings.useProvider);
	$('#local-mode-info').classList.toggle('hidden', state.settings.useProvider);
	populateLocalModels();
	$('#test-result').textContent = '';
	$('#test-result').className = '';
	$('#model-status').textContent = '';
	$('#model-status').className = '';

	// Restore model selection state
	const select = $('#provider-model-select');
	const hasOptions = select.options.length > 1;
	if (hasOptions) {
		select.value = state.settings.model;
	}
	$('#provider-model-custom').value = state.settings.model;

	// If the saved model isn't in the dropdown, default to custom mode
	const inDropdown = hasOptions && [...select.options].some((o) => o.value === state.settings.model);
	const useCustom = state.settings.model && !inDropdown;
	$('#use-custom-model').checked = useCustom;
	$('#provider-model-custom').classList.toggle('hidden', !useCustom);
	$('#model-selector').classList.toggle('hidden', useCustom);

	hideAllScreens();
	$('#settings').classList.remove('hidden');
}

export function hideSettings() {
	hideAllScreens();
	if (state.settings.useProvider && state.settings.url && state.settings.key && state.settings.model) {
		$('#chat').classList.remove('hidden');
	} else if (state.settings.useProvider) {
		$('#settings').classList.remove('hidden');
	} else if (state.engine) {
		$('#chat').classList.remove('hidden');
	} else {
		$('#onboarding').classList.remove('hidden');
	}
}
