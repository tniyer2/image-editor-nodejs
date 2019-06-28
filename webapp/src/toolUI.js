
import Enforcer from "./enforcer";

export { ToolUI, EmptyToolUI };

const cl_element = "tool-options";

class ToolUI {
	constructor() {
		const ef = new Enforcer(ToolUI, this, "ToolUI");
		ef.enforceAbstract();
		ef.enforceFunctions(["_createUI"]);
		ef.preventOverride(["enable", "disable"]);
	}

	_initialize() {
		const d = this._createUI();
		if (d instanceof HTMLElement) {
			d.classList.add(cl_element);
			this._element = d;
		} else {
			throw new Error("_createUI did not return an HTMLElement:", d);
		}
	}

	enable(parent) {
		if (!this._initialized) {
			this._initialize();
			this._initialized = true;
		}

		parent.appendChild(this._element);
	}

	disable() {
		this._element.remove();
	}
}

class EmptyToolUI extends ToolUI {
	_createUI() {
		return document.createElement("div");
	}
}
