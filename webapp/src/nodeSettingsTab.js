
import { Tab } from "./area";

const cl_root = "node-settings-tab";

export default class extends Tab {
	constructor() {
		super();
		this._box.element.classList.add(cl_root);
	}

	static get tabName() {
		return "Node Settings";
	}

	get box() {
		return this._box;
	}
}
