
import Enforcer from "./enforcer";
import { addGetter } from "./utility";
import { EventDictionary } from "./dictionary";

export { ToolUI, EmptyToolUI };

const cl_element = "tool-options";

class ToolUI {
	constructor(settings) {
		const ef = new Enforcer(ToolUI, this, "ToolUI");
		ef.enforceAbstract();
		ef.enforceFunctions(["_createUI"]);
		ef.preventOverride(["enable", "disable"]);

		const dict = new EventDictionary(settings);
		addGetter(this, "settings", dict);
	}

	enable(parent) {
		if (!this._initialized) {
			const d = this._createUI();
			if (d instanceof HTMLElement) {
				d.classList.add(cl_element);
				this._element = d;
			} else {
				throw new Error("_createUI did not return an HTMLElement:", elm);
			}
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
