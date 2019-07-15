
import { snap, forEach } from "./utility";
import { Vector2 } from "./geometry";
import { Command } from "./command";
import { addOptions } from "./options";

export { DragCommand, ResizeCommand, RotateCommand };

class BoxCommand extends Command {
	constructor(boxes, pos) {
		super(Command.CONTINUOUS);

		this._boxes = boxes;
		this._initialPositions = this._boxes.map(b => b.position);
		this._initialLocalPositions = this._getBoxPositions();
		this._referencePosition = pos;
	}

	_getBoxPositions() {
		return this._boxes.map(b => b.localPosition);
	}

	_close() {
		this._finalLocalPositions = this._getBoxPositions();
	}

	_undo() {
		forEach(this._boxes, this._initialLocalPositions, (b, initial) => {
			b.localPosition = initial;
		});
	}

	_redo() {
		forEach(this._boxes, this._finalLocalPositions, (b, final) => {
			b.localPosition = final;
		});
	}
}

const DragCommand = (function(){
	const DEFAULTS = { snapOffset: 10 };
	
	return class extends BoxCommand {
		constructor(box, pos, options) {
			super(box, pos);
			addOptions(this, DEFAULTS, options);
		}

		_execute(mousePosition, snapMovement, lock) {
			let diff = mousePosition.subtract(this._referencePosition);

			if (snapMovement) {
				diff = diff.map(a => snap(a, this._options.get("snapOffset")));
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
			addOptions(this, DEFAULTS, options);

			this._right = Vector2.right.rotate(angle);
			this._down = Vector2.down.rotate(angle);
			this._initialLocalDimensions = this._getBoxDimensions();

			const d = this._options.get("direction");
			this._moveTop = MOVE_TOP[d]; 
			this._moveLeft = MOVE_LEFT[d]; 
			this._freezeX = FREEZE_X[d];
			this._freezeY = FREEZE_Y[d];
		}

		_getBoxDimensions() {
			return this._boxes.map(b => b.localDimensions);
		}

		_execute(mousePosition, snapMovement, lock) {
			const fixAspectRatio = this._options.get("fixAspectRatio"),
				  setX = !(this._freezeX || (this._freezeY && fixAspectRatio)),
				  setY = !(this._freezeY || (this._freezeX && fixAspectRatio)),
				  setAspectRatio = fixAspectRatio && (setX || setY),
				  snapOffset = snapMovement ? this._options.get("snapOffset") : 
				  							  this._options.get("defaultSnapOffset");

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
				const pos = this._initialLocalPositions[i],
					  dim = this._initialLocalDimensions[i];
				const worldDiff = box.toLocal(new Vector2(diffX, diffY));
				diffX = worldDiff.x;
				diffY = worldDiff.y;
				if (setAspectRatio) {
					[diffX, diffY] = this._fixAspect(diffX, diffY, dim, this._moveLeft, this._moveTop);
				}

				if (setX) {
					const x = this._calcAxis(pos.x, dim.x, diffX, this._moveLeft, this._options.get("minWidth"));
					box.localLeft = x[0];
					box.localWidth = x[1];
				} else {
					box.localLeft = pos.x;
					box.localWidth = dim.x;
				}
				if (setY) {
					const y = this._calcAxis(pos.y, dim.y, diffY, this._moveTop, this._options.get("minHeight"));
					box.localTop = y[0];
					box.localHeight = y[1];
				} else {
					box.localTop = pos.y;
					box.localHeight = dim.y;
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
			this._finalLocalDimensions = this._getBoxDimensions();
		}

		_undo() {
			super._undo();
			forEach(this._boxes, this._initialLocalDimensions, (b, d) => {
				b.localDimensions = d;
			});
		}

		_redo() {
			super._redo();
			forEach(this._boxes, this._finalLocalDimensions, (b, d) => {
				b.localDimensions = d;
			});
		}
	};
})();

const RotateCommand = (function(){
	const DEFAULTS = { snapOffset: 10 };

	return class extends BoxCommand {
		constructor(boxes, pos, options) {
			super(boxes, pos);
			
			addOptions(this, DEFAULTS, options);

			this._snapOffset = this._options.get("snapOffset") * Vector2.degToRad;
			this._initialAngles = this._getBoxAngles();
		}

		_getBoxAngles() {
			return this._boxes.map(b => b.angle);
		}

		_execute(mousePosition, snapMovement) {
			const dir = mousePosition.subtract(this._referencePosition);
			let a = dir.angle + Vector2.angleOffset;
			if (snapMovement) {
				a -= (a % this._snapOffset);
			}
			this._boxes.forEach((box) => {
				box.angle = a;
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
