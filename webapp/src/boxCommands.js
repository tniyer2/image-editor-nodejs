
import { isType } from "./type";
import { Vector2 } from "./geometry";
import { Command } from "./command";
import Options from "./options";

export { DragCommand, ResizeCommand, RotateCommand };

class BoxCommand extends Command {
	constructor(boxes, pos) {
		super(Command.CONTINUOUS);

		if (!isType(boxes, Array)) {
			throw new Error("Invalid argument.");
		} else if (!isType(pos, Vector2)) {
			throw new Error("Invalid argument.");
		}

		this._boxes = boxes;
		this._referencePosition = pos;

		this._initialPositions = this._boxes.map(b => b.position);
		this._initialLocalPositions = this._boxes.map(b => b.localPosition);
	}

	_close() {
		this._finalLocalPositions = this._boxes.map(b => b.localPosition);
	}

	_undo() {
		this._boxes.forEach((b, i) => {
			b.localPosition = this._initialLocalPositions[i];
		});
	}

	_redo() {
		this._boxes.forEach((b, i) => {
			b.localPosition = this._finalLocalPositions[i];
		});
	}
}

const DragCommand = (function(){
	const DEFAULTS = { snapOffset: 10 };
	
	return class extends BoxCommand {
		constructor(box, pos, options) {
			super(box, pos);
			this.options = new Options();
			this.options.set(DEFAULTS, options);
		}

		_execute(mousePosition, snapMovement, lock) {
			let diff = mousePosition.subtract(this._referencePosition);

			if (snapMovement) {
				const offset = this.options.get("snapOffset");
				diff = diff.map(a => a - (a % offset));
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

			this._boxes.forEach((b, i) => {
				let p = this._initialPositions[i];
				p = p.add(diff);
				b.position = p;
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
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			this._right = Vector2.right.rotate(angle);
			this._down = Vector2.down.rotate(angle);
			this._initialLocalDimensions = this._boxes.map(b => b.localDimensions);

			const d = this.options.get("direction");
			this._moveTop = MOVE_TOP[d]; 
			this._moveLeft = MOVE_LEFT[d]; 
			this._freezeX = FREEZE_X[d];
			this._freezeY = FREEZE_Y[d];
		}

		_execute(mousePosition, snapMovement, lock) {
			const fixAspectRatio = this.options.get("fixAspectRatio"),
				  setX = !(this._freezeX || (this._freezeY && fixAspectRatio)),
				  setY = !(this._freezeY || (this._freezeX && fixAspectRatio)),
				  setAspectRatio = fixAspectRatio && (setX || setY),
				  snapOffset = snapMovement ? this.options.get("snapOffset") : 
				  							  this.options.get("defaultSnapOffset");

			const diff = mousePosition.subtract(this._referencePosition);
			let diffX = diff.dot(this._right),
				diffY = diff.dot(this._down);
			diffX = diffX - (diffX % snapOffset);
			diffY = diffY - (diffY % snapOffset);

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
				const worldDiff = box.toLocalDir(new Vector2(diffX, diffY));
				diffX = worldDiff.x;
				diffY = worldDiff.y;
				if (setAspectRatio) {
					[diffX, diffY] = this._fixAspect(diffX, diffY, dim, this._moveLeft, this._moveTop);
				}

				if (setX) {
					const x = this._calcAxis(pos.x, dim.x, diffX, this._moveLeft, this.options.get("minWidth"));
					box.localLeft = x[0];
					box.localWidth = x[1];
				} else {
					box.localLeft = pos.x;
					box.localWidth = dim.x;
				}
				if (setY) {
					const y = this._calcAxis(pos.y, dim.y, diffY, this._moveTop, this.options.get("minHeight"));
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
			this._finalLocalDimensions = this._boxes.map(b => b.localDimensions);
		}

		_undo() {
			super._undo();
			this._boxes.forEach((b, i) => {
				b.localDimensions = this._initialLocalDimensions[i];
			});
		}

		_redo() {
			super._redo();
			this._boxes.forEach((b, i) => {
				b.localDimensions = this._finalLocalDimensions[i];
			});
		}
	};
})();

const RotateCommand = (function(){
	const DEFAULTS = { snapOffset: 10 };

	return class extends BoxCommand {
		constructor(boxes, pos, options) {
			super(boxes, pos);
			
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			this._snapOffset = this.options.get("snapOffset") * Vector2.degToRad;
			this._initialAngles = this._boxes.map(b => b.angle);
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
			this._finalAngles = this._boxes.map(b => b.angle);
		}

		_undo() {
			super._undo();
			this._boxes.forEach((b, i) => {
				b.angle = this._initialAngles[i];
			});
		}

		_redo() {
			super._redo();
			this._boxes.forEach((b, i) => {
				b.angle = this._finalAngles[i];
			});
		}
	};
})();
