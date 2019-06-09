
import Enforcer from "./enforcer";
import { forEach, extend, snap } from "./utility";
import { Vector2 } from "./geometry";
import { Command } from "./command";

export { DragCommand, ResizeCommand, RotateCommand };

class BoxCommand extends Command {
	constructor(boxes, pos) {
		super(Command.continuous);

		new Enforcer(BoxCommand, this, "BoxCommand").enforceAbstract();

		this._boxes = boxes;
		this._initialPositions = this._getBoxPositions();
		this._referencePosition = pos;
	}

	_getBoxPositions() {
		return this._boxes.map(b => b.position);
	}

	_close() {
		this._finalPositions = this._getBoxPositions();
	}

	_undo() {
		forEach(this._boxes, this._initialPositions, (b, initial) => {
			b.position = initial;
		});
	}

	_redo() {
		forEach(this._boxes, this._finalPositions, (b, final) => {
			b.position = final;
		});
	}
}

const DragCommand = (function(){
	const DEFAULTS = { snapOffset: 10 };
	
	return class extends BoxCommand {
		constructor(box, pos, options) {
			super(box, pos);
			this._options = extend(DEFAULTS, options);
		}

		_execute(mousePosition, snapMovement, lock) {
			let diff = mousePosition.subtract(this._referencePosition);

			if (snapMovement) {
				diff = diff.map(a => snap(a, this._options.snapOffset));
			}

			if (lock && !this._ignore) {
				this._ignore = true;
				this._ignoreX = Math.abs(diff.x) < Math.abs(diff.y);
			} else if (!lock && this._ignore) {				
				this._ignore = false;
			}
			if (this._ignore) {
				if (this._ignoreX) {
					diff = new Vector2(0, diff.y);
				} else {
					diff = new Vector2(diff.x, 0);
				}
			}

			forEach(this._boxes, this._initialPositions, (b, initial) => {
				b.position = initial.add(diff);
			});
		}
	};
})();

const ResizeCommand = (function(){
	const MOVE_TOP  = [true,  true,  true,  null,  false, false, false, null], 
		  MOVE_LEFT = [true,  null,  false, false, false, null,  true,  true],
		  FREEZE_Y  = [false, false, false, true,  false, false, false, true],
		  FREEZE_X  = [false, true,  false, false, false, true,  false, false];

	const DEFAULTS = { minWidth: 10,
					   minHeight: 10,
					   defaultSnapOffset: 1,
					   snapOffset: 25,
					   fixAspectRatio: false };

	return class extends BoxCommand {
		constructor(boxes, pos, angle, options) {
			super(boxes, pos);

			this._right = Vector2.right.rotate(angle);
			this._down = Vector2.down.rotate(angle);
			this._options = extend(DEFAULTS, options);
			this._initialDimensions = this._getBoxDimensions();

			const d = this._options.direction;
			this._moveTop = MOVE_TOP[d]; 
			this._moveLeft = MOVE_LEFT[d]; 
			this._freezeX = FREEZE_X[d];
			this._freezeY = FREEZE_Y[d];
		}

		_getBoxDimensions() {
			return this._boxes.map(b => b.dimensions);
		}

		_execute(mousePosition, snapMovement, lock) {
			const fixAspectRatio = this._options.fixAspectRatio,
				  setX = !(this._freezeX || (this._freezeY && fixAspectRatio)),
				  setY = !(this._freezeY || (this._freezeX && fixAspectRatio)),
				  setAspectRatio = fixAspectRatio && (setX || setY),
				  snapOffset = snapMovement ? this._options.snapOffset : this._options.defaultSnapOffset;

			const diff = mousePosition.subtract(this._referencePosition);
			let diffX = snap(diff.dot(this._right), snapOffset),
				diffY = snap(diff.dot(this._down), snapOffset);

			if (!fixAspectRatio) {
				if (lock && !this._ignore) {
					this._ignore = true;
					this._ignoreX = Math.abs(diffX) < Math.abs(diffY);
				} else if (!lock && this._ignore) {				
					this._ignore = false;
				}
				if (this._ignore) {
					if (this._ignoreX) {
						diffX = 0;
					} else {
						diffY = 0;
					}
				}
			}

			this._boxes.forEach((box, i) => {
				const pos = this._initialPositions[i],
					  dim = this._initialDimensions[i];
				if (setAspectRatio) {
					[diffX, diffY] = this._fixAspect(diffX, diffY, dim, this._moveLeft, this._moveTop);
				}

				if (setX) {
					const x = this._calcAxis(pos.x, dim.x, diffX, this._moveLeft, this._options.minWidth);
					box.left = x[0];
					box.width = x[1];
				} else {
					box.left = pos.x;
					box.width = dim.x;
				}
				if (setY) {
					const y = this._calcAxis(pos.y, dim.y, diffY, this._moveTop, this._options.minHeight);
					box.top = y[0];
					box.height = y[1];
				} else {
					box.top = pos.y;
					box.height = dim.y;
				}
			});
		}

		_fixAspect(x, y, dim, offsetLeft, offsetTop) {
			const f = offsetLeft === offsetTop ? 1 : -1;
			y = Math.round(dim.y / dim.x * x * f);
			return [x, y];
		}

		_calcAxis(coord, dim, diff, move, min) {
			const m = move ? -1 : 1;
			const newCoord = move ? Math.min(coord + diff, coord + dim - min) : coord;
			const newDim   = Math.max(dim + (diff * m), min);
			return [newCoord, newDim];
		}

		_close() {
			super._close();
			this._finalDimensions = this._getBoxDimensions();
		}

		_undo() {
			super._undo();
			forEach(this._boxes, this._initialDimensions, (b, d) => {
				b.dimensions = d;
			});
		}

		_redo() {
			super._redo();
			forEach(this._boxes, this._finalDimensions, (b, d) => {
				b.dimensions = d;
			});
		}
	};
})();

const RotateCommand = (function(){
	const DEFAULTS = { snapOffset: 10 };

	return class extends BoxCommand {
		constructor(boxes, pos, options) {
			super(boxes, pos);
			
			this._options = extend(DEFAULTS, options);
			this._snapOffset = this._options.snapOffset * Vector2.degToRad;

			this._initialAngles = this._getBoxAngles();
		}

		_getBoxAngles() {
			return this._boxes.map(b => b.angle);
		}

		_execute(mousePosition, snapMovement) {
			const dir = mousePosition.subtract(this._referencePosition);
			let d = dir.angle + Vector2.angleOffset;
			if (snapMovement) {
				d = d - (d % this._snapOffset);
			}
			this._boxes.forEach((box) => {
				box.angle = d;
			});
		}

		_close() {
			super._close();
			this._finalAngles = this._getBoxAngles();
		}

		_undo() {
			super._undo();
			forEach(this._boxes, this._initialAngles, (b, a) => {
				b.angle = a;
			});
		}

		_redo() {
			super._redo();
			forEach(this._boxes, this._finalAngles, (b, a) => {
				b.angle = a;
			});
		}
	};
})();
