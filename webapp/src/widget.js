
import { myeval } from "./utility";
import { MouseActionHandler } from "./action";

export { BoxWidget, CanvasWidget, SelectWidget };

class BoxWidget extends MouseActionHandler {
	constructor(groups) {
		super();

		if (groups.constructor !== Array) {
			groups = [groups];
		}
		this._boxGroups = groups;
	}

	_onStart(evt) {
		this._commands = this._boxGroups.map((g) => {
			const c = this._getCommand(myeval(g.boxes), evt);
			const s = myeval(g.stack);
			if (s) {
				s.add(c);
			}
			return c;
		});
	}

	_onMove(evt) {
		const args = this._getArguments(evt);
		this._commands.forEach((c) => {
			c.execute(...args);
		});
	}

	_onEnd(evt) {
		this._commands.forEach((c) => {
			c.close();
		});
	}
}

class CanvasWidget extends MouseActionHandler {
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
		this._lm = lm;
	}

	_onClick(mdEvt, muEvt, layer) {
		if (layer) {
			const ctrl = mdEvt.ctrlKey,
				  shift = mdEvt.shiftKey;
			if (ctrl && layer["data-selected"]) {
				this._lm.deselect(layer);
			} else if (shift && !layer["data-selected"]) {
				this._lm.select(layer);
			} else if (!ctrl && !shift) {
				this._lm.deselectAll();
				this._lm.select(layer);
			}
		}
	}

	_onStart(evt, layer)
	{
		if (layer && !layer["data-selected"]) {
			if (evt.shiftKey) {
				this._lm.select(layer);
			} else {
				this._lm.deselectAll();
				this._lm.select(layer);
			}
		}
	}
}
