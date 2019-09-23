
import { isFunction, isArray } from "./type";
import Options from "./options";
import { Vector2 } from "./geometry";
import { MultiCommand } from "./command";
import { Node } from "./node";
import { DragCommand,
		 ResizeScaleCommand,
		 RotateCommand } from "./boxCommands";
import { UserActionHandler } from "./action";

export { TransformDragWidget,
		 TransformScaleWidget,
		 TransformRotateWidget };

const TransformWidget = (function(){
	function computeRangeString(indices) {
		const len = indices.length;
		if (len === 0) {
			return "";
		} else if (len === 1) {
			return String(indices[0]);
		}

		indices.sort((a, b) => a - b);

		let prev = indices[0];
		let acc = String(prev);
		let last = null;

		for (let i=1; i<len; i+=1) {
			const cur = indices[i];
			const continues = prev === cur-1;

			if (continues) {
				if (i === len-1) {
					acc += "-" + cur;
				} else {
					last = cur;
				}
			} else {
				if (last !== null) {
					acc += "-" + last;
					last = null;
				}
				acc += ", " + cur;
			}
			
			prev = cur;
		}

		return acc;
	}

	return class extends UserActionHandler {
		constructor(collection, stack) {
			super();

			this._collection = collection;
			this._stack = stack;

			this._node = null;
			this._transform = null;
		}

		get node() {
			return this._node;
		}

		set node(val) {
			if (val !== null && !(val instanceof Node)) {
				throw new Error("Invalid argument.");
			}
			this._node = val;
		}

		_initTransformCommands() {
			this._initialCommands = [];

			let transform = this._node.settings.get("lockedTransform");
			if (transform) {
				this._usingLocked = true;
			} else {
				this._usingLocked = false;

				transform = this._node.settings.new("transforms");
				const c =
					this._node.createArraySettingCommand(
						this._node.settings, "transforms", transform, true);
				this._initialCommands.push(c);
			}
			this._transform = transform;

			let initialRange;
			if (this._usingLocked === true) {
				initialRange = transform.settings.get("range");
			} else {
				initialRange = "";
			}

			const c =
				this._node.createSettingCommand(
					transform.settings, "range", initialRange, this._rangeString);
			this._initialCommands.push(c);
		}

		_onStart(evt) {
			const boxes = [];
			const indices = [];
			this._collection.items.forEach((item, i) => {
				if (item.selected === true) {
					boxes.push(item.box);
					indices.push(i);
				}
			});

			this._rangeString = computeRangeString(indices);
			this._initTransformCommands();

			this._command = this._getCommand(boxes, evt, this._transform);
		}

		_onMove(evt) {
			if (!this._command) return;

			const args = this._getArguments(evt);
			this._command.execute(...args);
		}

		_onEnd(evt) {
			if (!this._command) return;

			this._command.close();

			let commands =
				this._getSettingCommands(
					this._command, this._transform);

			if (!isArray(commands)) {
				throw new Error("Invalid State.");
			}

			commands = commands.concat(this._initialCommands);

			const final = new MultiCommand(commands);

			if (this._stack) {
				this._stack.add(final);
			}
			final.execute();
		}
	};
})();

class TransformDragWidget extends TransformWidget {
	_getCommand(boxes, evt) {
		const p = this._getMousePosition(evt);
		return new DragCommand(boxes, p);
	}

	_getArguments(evt) {
		return [this._getMousePosition(evt), evt.shiftKey, evt.ctrlKey];
	}

	_getSettingCommands(command, transform) {
		const diff = command.localPositionDifference,
			  s = transform.settings;

		let dxi, dyi;
		if (this._usingLocked === true) {
			dxi = s.get("tx");
			dyi = s.get("ty");
			diff.x += dxi;
			diff.y += dyi;
		} else {
			dxi = dyi = 0;
		}

		const c1 = this._node.createSettingCommand(s, "tx", dxi, diff.x),
			  c2 = this._node.createSettingCommand(s, "ty", dyi, diff.y);

		return [c1, c2];
	}
}

class TransformScaleWidget extends TransformWidget {
	constructor(collection, stack, options) {
			super(collection, stack);

			this.options = new Options();
			this.options.set(options);

			this.fixAspectRatio = false;
		}

		_getCommand(boxes, evt, transform) {
			const p = this._getMousePosition(evt);

			const options = this.options.items;
			if (isFunction(options.angle)) {
				options.angle = options.angle();
			}

			this.fixAspectRatio =
				options.fixAspectRatio =
					transform.settings.get("fixAspectRatio");

			return new ResizeScaleCommand(boxes, p, options);
		}

		_getArguments(evt) {
			return [this._getMousePosition(evt), evt.shiftKey, evt.ctrlKey];
		}

		_getSettingCommands(command, transform) {
			const pdiff = command.localPositionDifference,
				  sdiff = command.localScaleDifference,
				  s = transform.settings;

			let sxi, syi;
			if (this._usingLocked === true) {
				sxi = s.get("sx");
				syi = s.get("sy");
				sdiff.x *= sxi;
				sdiff.y *= syi;
			} else {
				sxi = syi = 1;
			}

			const c1 = this._node.createSettingCommand(s, "sx", sxi, sdiff.x),
				  c2 = this._node.createSettingCommand(s, "sy", syi, sdiff.y);
			const arr = [c1, c2];

			if (!pdiff.equals(Vector2.zero)) {
				let pxi, pyi;
				if (this._usingLocked === true) {
					pxi = s.get("px");
					pyi = s.get("py");
					pdiff.x += pxi;
					pdiff.y += pyi;
				} else {
					pxi = pyi = 0;
				}

				const c3 = this._node.createSettingCommand(s, "tx", pxi, pdiff.x),
					  c4 = this._node.createSettingCommand(s, "ty", pyi, pdiff.y);
				arr.push(c3, c4);
			}

			return arr;
		}
}

class TransformRotateWidget extends TransformWidget {
	constructor(collection, stack, options) {
		super(collection, stack);

		this.options = new Options();
		this.options.set(options);
	}

	_getCommand(boxes, evt) {
		let center = this.options.get("center");
		if (isFunction(center)) {
			center = center();
		}
		return new RotateCommand(boxes, center);
	}

	_getArguments(evt) {
		return [this._getMousePosition(evt), evt.shiftKey];
	}

	_getSettingCommands(command, transform) {
		let diff = command.angleDifference,
			s = transform.settings;

		let init;
		if (this._usingLocked === true) {
			init = s.get("angle");
			diff += init;
		} else {
			init = 0;
		}

		const c = this._node.createSettingCommand(s, "angle", init, diff);

		return [c];
	}
}
