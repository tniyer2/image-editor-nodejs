
import Enforcer from "./enforcer";
import { addGetter, extend } from "./utility";
import { EventDictionary } from "./dictionary";

export { Tool, TestTool };

class ToolUI {
	constructor(settings) {
		let ef = new Enforcer(ToolUI, this, "ToolUI");
		ef.enforceAbstract();
		ef.enforceFunctions(["_createUI"]);

		settings = new EventDictionary(settings);
		addGetter(this, "settings", settings);
		let d = document.createElement("div");
		addGetter(this, "parent", d);
		addGetter(this, "initialized", false);
	}

	createUI() {
		if (this._initialized) {
			throw new Error("Cannot call createUI more than once.");
		}
		this._createUI();
		this._initialized = true;
	}
}

const Tool = (function(){
	const DEFAULTS = { cursor: "default" };

	return class {
		constructor(lm, stack, options) {
			let ef = new Enforcer(Tool, this, "Tool");
			ef.enforceAbstract();
			ef.enforceFunctions(["_enable", "_disable"]);

			this._layerManager = lm;
			this._stack = stack;
			this._options = extend(DEFAULTS, options);
			this._firstTime = true;
		}

		enable() {
			this._layerManager.cursor = this._options.cursor;
			this._enable();
			this._firstTime = false;
		}

		disable() {
			this._layerManager.resetCursor();
			this._disable();
		}
	};
})();

class TestTool extends Tool {
	_enable(){}	
	_disable(){}	
}
