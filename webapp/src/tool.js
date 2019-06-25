
import Enforcer from "./enforcer";
import { extend } from "./utility";

export { Tool, TestTool };

const Tool = (function(){
	const DEFAULTS = { cursor: "default" };

	return class {
		constructor(lm, stack, ui, options) {
			let ef = new Enforcer(Tool, this, "Tool");
			ef.enforceAbstract();
			ef.enforceFunctions(["_enable", "_disable"]);

			this._layerManager = lm;
			this._stack = stack;
			this._ui = ui;
			this._options = extend(DEFAULTS, options);
		}

		enable(parent) {
			this._layerManager.cursor = this._options.cursor;
			this._ui.enable(parent);
			this._enable();
		}

		disable() {
			this._layerManager.resetCursor();
			this._ui.disable();
			this._disable();
		}
	};
})();

class TestTool extends Tool {
	_enable(){}	
	_disable(){}	
}
