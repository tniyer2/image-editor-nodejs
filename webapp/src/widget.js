
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
		this._commands = null;
	}
}

class CanvasWidget extends MouseActionHandler {
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

class SelectWidget extends MouseActionHandler {
	constructor(collection) {
		super();
		this._collection = collection;
	}

	_onClick(mdEvt, muEvt, item) {
		if (item) {
			const ctrl = mdEvt.ctrlKey,
				  shift = mdEvt.shiftKey;
			if (ctrl && item.selected) {
				this._collection.deselect(item);
			} else if (shift && !item.selected) {
				this._collection.select(item);
			} else if (!ctrl && !shift) {
				this._collection.selectOnly(item);
			}
		}
	}

	_onStart(evt, item) {
		if (item && !item.selected) {
			if (evt.shiftKey) {
				this._collection.select(item);
			} else {
				this._collection.selectOnly(item);
			}
		}
	}
}
