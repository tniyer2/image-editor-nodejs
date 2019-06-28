
import Enforcer from "./enforcer";
import { addOptions } from "./options";

export { Tool, TestTool };

const Tool = (function(){
	const DEFAULTS = { cursor: "default" };

	return class {
		constructor(lm, stack, options) {
			let ef = new Enforcer(Tool, this, "Tool");
			ef.enforceAbstract();
			ef.enforceFunctions(["_enable", "_disable"]);

			this._layerManager = lm;
			this._stack = stack;
			addOptions(this, DEFAULTS, options);
		}

		enable() {
			this._layerManager.cursor = this._options.get("cursor");
			this._enable();
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
