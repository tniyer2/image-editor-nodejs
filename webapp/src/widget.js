
import Enforcer from "./enforcer";
import { preventBubble, show, hide, forEach, addGetter, extend, isUdf } from "./utility";
import { Vector2 } from "./geometry";
import { MouseActionHandler } from "./event";

export { Widget, SelectWidget };

const Widget = (function(){
	const DEFAULTS = { origin: Vector2.zero, scale: 1 };

	return class extends MouseActionHandler {
		constructor(options) {
			super();
			this._options = extend(DEFAULTS, options);
		}

		_evaluate(arr) {
			if (typeof arr === "function") {
				return arr();
			} else {
				return arr;
			}
		}

		_getOrigin() {
			return this._evaluate(this._options.origin);
		}

		_getScale() {
			return this._evaluate(this._options.scale);
		}
	};
})();

class SelectWidget extends Widget {
	constructor(lm, stack) {
		super();
		this._layerManager = lm;
		this._stack = stack;
	}

	_onClick(mdEvt, muEvt, layer) {
		if (layer) {		
			if (mdEvt.ctrlKey) {
				this._layerManager.select(layer);
			} else {
				this._layerManager.deselectAll();
				this._layerManager.select(layer);
			}
		} else if (this._layerManager.selected.length > 1) {
			this._layerManager.deselectAll();
		}
	}

	_onStart(evt, layer)
	{
		if (layer && !layer.selected) {
			if (evt.ctrlKey) {
				this._layerManager.select(layer);
			} else {
				this._layerManager.deselectAll();
				this._layerManager.select(layer);
			}
		}
	}

	_onMove(evt, layer){}
	_onEnd(evt, layer){}
}
