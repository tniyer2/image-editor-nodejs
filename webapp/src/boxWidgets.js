
import { isFunction } from "./type";
import Options from "./options";
import { Vector2 } from "./geometry";
import { DragCommand, ResizeCommand, RotateCommand } from "./boxCommands";
import BoxWidget from "./boxWidget";

export { DragWidget, ResizeWidget, RotateWidget };

class DragWidget extends BoxWidget {
	_getCommand(boxes, evt) {
		const mp = this._getMousePosition(evt);
		return new DragCommand(boxes, mp);
	}

	_getArguments(evt) {
		return [this._getMousePosition(evt), evt.shiftKey, evt.ctrlKey];
	}
}

const ResizeWidget = (function(){
	const DEFAULTS = { angle: 0 };

	return class extends BoxWidget {
		constructor(groups, op, rop) {
			super(groups);

			this.options = new Options();
			this.options.set(DEFAULTS, op);
			this.resizeOptions = new Options();
			this.resizeOptions.set(rop);
		}

		_getCommand(boxes, evt) {
			const mp = this._getMousePosition(evt);
			let a = this.options.get("angle");
			a = isFunction(a) ? a() : a;
			return new ResizeCommand(boxes, mp, a, this.resizeOptions);
		}

		_getArguments(evt) {
			return [this._getMousePosition(evt), evt.shiftKey, evt.ctrlKey];
		}
	};
})();

const RotateWidget = (function(){
	const DEFAULTS = { center: Vector2.zero };

	return class extends BoxWidget {
		constructor(groups, options) {
			super(groups);

			this.options = new Options();
			this.options.set(DEFAULTS, options);
		}

		_getCommand(boxes, evt) {
			let center = this.options.get("center");
			center = isFunction(center) ? center() : center;
			return new RotateCommand(boxes, center);
		}

		_getArguments(evt) {
			return [this._getMousePosition(evt), evt.shiftKey];
		}
	};
})();
