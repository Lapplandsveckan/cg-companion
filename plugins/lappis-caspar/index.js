import { InstanceBase, runEntrypoint, InstanceStatus } from '@companion-module/base'
import { configFields } from './config.js'

class LappisCasparInstance extends InstanceBase {
	configUpdated(config) {
		this.config = config;

		this.initActions();
		this.initFeedbacks();
	}

	init(config) {
		this.config = config;
		this.updateStatus(InstanceStatus.Ok);

		this.initActions();
		this.initFeedbacks();
	}

	// Return config fields for web config
	getConfigFields() {
		return configFields;
	}

	// When module gets deleted
	async destroy() {

	}

	getURL(path) {
		const ip = this.config.ip || '127.0.0.1:5353';
		return `http://${ip}/api/` + path;
	}

	fetchCatch = (e) => {
		this.log('error', `Failed to reach the API (${e.message})`);
		this.updateStatus(InstanceStatus.UnknownError, e.code);
	}

	initActions() {
		this.setActionDefinitions({
			queue_clear: {
				name: 'Clear Video Queue',
				options: [],
				callback: async (action, context) => {
					this.log('info', `Clearing video queue`);
					fetch(this.getURL('plugins/lappis/videos'), {
						method: 'DELETE',
					}).catch(this.fetchCatch);

					this.updateStatus(InstanceStatus.Ok)
				},
			},
			stop_video: {
				name: 'Stop Current Video',
				options: [
					{
						type: 'checkbox',
						label: 'Also clear queue',
						id: 'clear',
						default: false,
					},
				],
				callback: async (action, context) => {
					const clear = action.options.clear ?? false;
					this.log('info', `Stopping video, and possible clearing queue (${clear})`);

					fetch(this.getURL('plugins/lappis/video'), {
						body: JSON.stringify({ clear }),
						headers: {
							'Content-Type': 'application/json',
						},
						method: 'DELETE',
					}).catch(this.fetchCatch);

					this.updateStatus(InstanceStatus.Ok)
				},
			},
			bars: {
				name: 'Toggle Bars',
				options: [],
				callback: async (action, context) => {
					this.log('info', `Toggle bars`);
					fetch(this.getURL('plugins/lappis/bars'), {
						method: 'POST',
					}).catch(this.fetchCatch);

					this.updateStatus(InstanceStatus.Ok)
				},
			},
			presentation: {
				name: 'Toggle Presentation Mode',
				options: [
					{
						type: 'checkbox',
						label: 'ATEM',
						id: 'atem',
						default: false,
					},
				],
				callback: async (action, context) => {
					const atem = action.options.atem ?? false;
					this.log('info', `Toggle Presentation Mode (ATEM: ${atem})`);

					fetch(this.getURL('plugins/lappis/presentation'), {
						body: JSON.stringify({ atem }),
						headers: {
							'Content-Type': 'application/json',
						},
						method: 'POST',
					}).catch(this.fetchCatch);

					this.updateStatus(InstanceStatus.Ok)
				},
			},
			swish: {
				name: 'Swish',
				options: [
					{
						type: 'textinput',
						label: 'Swish Nummer',
						id: 'swish',
						default: '123 412 65 95',
					},
				],
				callback: async (action, context) => {
					const swish = action.options.swish;

					this.log('info', `Playing swish (number: ${swish})`);
					fetch(this.getURL('plugins/lappis/swish'), {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ swish }),
					}).catch(this.fetchCatch);

					this.updateStatus(InstanceStatus.Ok)
				},
			},
			insamling: {
				name: 'Insamlade Medel',
				options: [
					{
						type: 'textinput',
						label: 'Insamlade Medel',
						id: 'now',
						default: '0',
					},
					{
						type: 'textinput',
						label: 'Insalings Mål',
						id: 'goal',
						default: '1000000',
					},
				],
				callback: async (action, context) => {
					const now = action.options.now;
					const goal = action.options.goal;

					this.log('info', `Playing insamlade medel ${now} / ${goal}`);
					fetch(this.getURL('plugins/lappis/insamling'), {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							now,
							goal,
						}),
					}).catch(this.fetchCatch);

					this.updateStatus(InstanceStatus.Ok)
				},
			},
		});
	}

	initFeedbacks() {
		this.setFeedbackDefinitions({});
	}
}

runEntrypoint(LappisCasparInstance, [])
