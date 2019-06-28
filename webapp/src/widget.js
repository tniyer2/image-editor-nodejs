
import Enforcer from "./enforcer";
import { MouseActionHandler } from "./action";
import { addOptions } from "./options";

export { BoxWidget, CanvasWidget, SelectWidget };

const BoxWidget = (function(){
	const DEFAULTS = { boxes: [], offStackBoxes: [] };

	return class extends MouseActionHandler {
		constructor(options) {
			super();
			addOptions(this, DEFAULTS, options);

			const ef = new Enforcer(BoxWidget, this, "BoxWidget");
			ef.enforceAbstract();
		}
	};
})();

class CanvasWidget extends MouseActionHandler {
	constructor(options) {
		super();
		addOptions(this, options);

		const ef = new Enforcer(CanvasWidget, this, "CanvasWidget");
		ef.enforceAbstract();
	}

	_getMousePosition(evt, layer) {
		const l = layer;
		const rotPosition = l.position
			   				.subtract(l.center)
			   				.rotate(l.angle)
			   				.add(l.center);

		return super._getMousePosition(evt)
			   .subtract(rotPosition)
			   .rotate(-l.angle);
	}
}

class SelectWidget extends MouseActionHandler {
	constructor(lm) {
		super();
		this._layerManager = lm;
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
		if (layer && !layer["data-selected"]) {
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
