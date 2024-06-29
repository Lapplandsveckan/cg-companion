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
		this.setActionDefinitions({});
	}

	initFeedbacks() {
		this.setFeedbackDefinitions({});
	}
}

runEntrypoint(LappisCasparInstance, [])
