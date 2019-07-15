
import { addOptions, addNamedOptions } from "./options";
import { Vector2 } from "./geometry";
import { DragCommand, ResizeCommand, RotateCommand } from "./boxCommands";
import { BoxWidget } from "./widget";

export { DragWidget, ResizeWidget, RotateWidget };

class DragWidget extends BoxWidget {
	constructor(groups) {
		super(groups);
	}

	_getCommand(boxes, evt) {
		const mp = this._getMousePosition(evt);
		return new DragCommand(boxes, mp);
	}

	_getArguments(evt) {
		return [ this._getMousePosition(evt), 
				 evt.shiftKey, 
				 evt.ctrlKey ];
	}
}

const ResizeWidget = (function(){
	const DEFAULTS = { angle: 0 };

	return class extends BoxWidget {
		constructor(groups, options, resizeOptions) {
			super(groups);

			addOptions(this, DEFAULTS, options);
			addNamedOptions(this, "resizeOptions", resizeOptions);
		}

		_getCommand(boxes, evt) {
			const mp = this._getMousePosition(evt),
				  a  = this._options.get("angle");
			return new ResizeCommand(boxes, mp, a, this._resizeOptions);
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

			addOptions(this, DEFAULTS, options);
		}

		_getCommand(boxes, evt) {
			return new RotateCommand(boxes, this._options.get("center"));
		}

		_getArguments(evt) {
			return [ this._getMousePosition(evt), evt.shiftKey ];
		}
	};
})();
