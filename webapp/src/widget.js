
import Enforcer from "./enforcer";
import { preventBubble, show, hide, forEach, addGetter, extend, isUdf } from "./utility";
import { Vector2 } from "./geometry";
import { MouseActionHandler } from "./event";

export { BoxWidget, CanvasWidget, SelectWidget };

const Widget = (function(){
	const DEFAULTS = { origin: Vector2.zero, scale: 1 };

	return class extends MouseActionHandler {
		constructor(options) {
			super();

			const ef = new Enforcer(Widget, this, "Widget");
			ef.enforceAbstract();
			ef.preventOverride(["_addOptionGetter", "_evaluate"]);

			this._options = extend(DEFAULTS, options);
			this._addOptionGetter("origin");
			this._addOptionGetter("scale");
		}

		_evaluate(a) {
			return typeof a === "function" ? a() : a;
		}

		_addOptionGetter(optionName, propertyName) {
			if (isUdf(propertyName)) {
				propertyName = "_" + optionName;
			}

			Object.defineProperty(this, propertyName, { get: () => {
				return this._evaluate(this._options[optionName]);
			}});
		}

		_getMousePosition(evt) {
			const mousePosition = super._getMousePosition(evt);
			return mousePosition.subtract(this._origin).divide(this._scale);
		}
	};
})();

const BoxWidget = (function(){
	const DEFAULTS = { boxes: () => [], offStackBoxes: () => [] };

	return class extends Widget {
		constructor(options) {
			options = extend(DEFAULTS, options);
			super(options);

			const ef = new Enforcer(BoxWidget, this, "BoxWidget");
			ef.enforceAbstract();

			this._addOptionGetter("boxes");
			this._addOptionGetter("offStackBoxes");
		}
	};
})();

class CanvasWidget extends Widget {
	constructor(options) {
		super(options);

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
			   .rotate(-l.angle)
			   .divide(l.canvasScale);
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
