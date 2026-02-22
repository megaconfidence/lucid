import { DEFAULT_LOCAL_MODEL } from './models.js';

export const $ = (sel) => document.querySelector(sel);

// Shared mutable state — import and mutate from other modules
export const state = {
	engine: null,
	loadedModel: null,
	busy: false,
	settings: {
		configured: false,
		useProvider: false,
		localModel: DEFAULT_LOCAL_MODEL,
		url: '',
		key: '',
		model: '',
	},
};

export async function loadSettings() {
	try {
		const stored = await chrome.storage.local.get('lucid_settings');
		if (stored.lucid_settings) state.settings = stored.lucid_settings;
	} catch {
		const raw = localStorage.getItem('lucid_settings');
		if (raw) state.settings = JSON.parse(raw);
	}
}

export async function saveSettings(next) {
	state.settings = next;
	try {
		await chrome.storage.local.set({ lucid_settings: state.settings });
	} catch {
		localStorage.setItem('lucid_settings', JSON.stringify(state.settings));
	}
}
