
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
		const posDiff = command.localPositionDifference,
			  s = transform.settings;

		let initPosX, initPosY;
		if (this._usingLocked === true) {
			initPosX = s.get("tx");
			initPosY = s.get("ty");
			posDiff.x += initPosX;
			posDiff.y += initPosY;
		} else {
			initPosX = initPosY = 0;
		}

		const c1 = this._node.createSettingCommand(
			s, "tx", initPosX, posDiff.x),
			  c2 = this._node.createSettingCommand(
			s, "ty", initPosY, posDiff.y);

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
			const posDiff = command.localPositionDifference,
				  scaleDiff = command.localScaleDifference,
				  s = transform.settings;

			let initScaleX, initScaleY;
			if (this._usingLocked === true) {
				initScaleX = s.get("sx");
				initScaleY = s.get("sy");
				scaleDiff.x *= initScaleX;
				scaleDiff.y *= initScaleY;
			} else {
				initScaleX = initScaleY = 1;
			}

			const c1 = this._node.createSettingCommand(
				s, "sx", initScaleX, scaleDiff.x),
				  c2 = this._node.createSettingCommand(
				s, "sy", initScaleY, scaleDiff.y);
			const arr = [c1, c2];

			if (!posDiff.equals(Vector2.zero)) {
				let initPosX, initPosY;
				if (this._usingLocked === true) {
					initPosX = s.get("tx");
					initPosY = s.get("ty");
					posDiff.x += initPosX;
					posDiff.y += initPosY;
				} else {
					initPosX = initPosY = 0;
				}

				const c3 = this._node.createSettingCommand(
					s, "tx", initPosX, posDiff.x),
					  c4 = this._node.createSettingCommand(
					s, "ty", initPosY, posDiff.y);
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
		let angleDiff = command.angleDifference / Vector2.degToRad,
			posDiff = command.localPositionDifference,
			s = transform.settings;

		let initAngle;
		if (this._usingLocked === true) {
			initAngle = s.get("angle");
			angleDiff += initAngle;
		} else {
			initAngle = 0;
		}

		const c1 = this._node.createSettingCommand(s, "angle", initAngle, angleDiff);

		let initPosX, initPosY;
		if (this._usingLocked === true) {
			initPosX = s.get("pretx");
			initPosY = s.get("prety");
			posDiff.x += initPosX;
			posDiff.y += initPosY;
		} else {
			initPosX = initPosY = 0;
		}

		const c2 = this._node.createSettingCommand(s, "pretx", initPosX, posDiff.x),
			  c3 = this._node.createSettingCommand(s, "prety", initPosY, posDiff.y);

		return [c1, c2, c3];
	}
}
