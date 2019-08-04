
import { isFunction } from "./type";
import { clamp } from "./utility";
import { addOptions } from "./options";
import { MultiCommand } from "./command";
import { UserActionHandler, ZoomActionHandler } from "./action";

export { BoxWidget, CanvasWidget, ZoomWidget };

class BoxWidget extends UserActionHandler {
	constructor(groups) {
		super();

		if (groups.constructor !== Array) {
			groups = [groups];
		}
		this._boxGroups = groups;
	}

	_onStart(evt) {
		this._commands = this._boxGroups.map((g) => {
			const boxes = isFunction(g.boxes) ? g.boxes() : g.boxes;
			let c = this._getCommand(boxes, evt);
			if (c.constructor === Array) {
				c = new MultiCommand(c);
			}

			const stack = isFunction(g.stack) ? g.stack() : g.stack;
			if (stack) {
				stack.add(c);
			}
			return c;
		});
	}

	_onMove(evt) {
		if (!this._commands) return;

		const args = this._getArguments(evt);
		this._commands.forEach((c) => {
			c.execute(...args);
		});
	}

	_onEnd(evt) {
		if (!this._commands) return;

		this._commands.forEach((c) => {
			c.close();
		});
		this._commands = null;
	}
}

class CanvasWidget extends UserActionHandler {
	_getMousePosition(evt, layer) {
		const l = layer;
		const rotPosition = l.localPosition
			   				.subtract(l.localCenter)
			   				.rotate(l.angle)
			   				.add(l.localCenter);
		const mp = l.toLocalPoint(super._getMousePosition(evt));
		return mp.subtract(rotPosition)
			   	 .rotate(-l.angle);
	}
}

const ZoomWidget = (function(){
	const DEFAULTS =
	{ condition: () => true, factor: 1,
	  min: 0, max: Infinity };
	const BASE_FACTOR = -0.001;

	return class extends ZoomActionHandler {
		constructor(box, options) {
			super();
			this._box = box;
			addOptions(this, DEFAULTS, options);
		}

		_onZoom(evt) {
			if (this.options.get("condition", false)(evt)) {
				let scale = this._box.localScaleX;
				const factor = this.options.get("factor"),
					  min = this.options.get("min"),
					  max = this.options.get("max");

				scale += evt.deltaY * BASE_FACTOR * factor;
				scale = clamp(scale, min, max);

				this._box.localScaleX = scale;
				this._box.localScaleY = scale;
			}
		}
	};
})();
