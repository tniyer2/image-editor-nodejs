
import { isType } from "./type";
import { extend } from "./utility";
import { Vector2, Box } from "./geometry";
import { Command } from "./command";

export { DragCommand, ResizeDimensionsCommand,
		 ResizeScaleCommand, RotateCommand };

class BoxCommand extends Command {
	constructor(boxes, pos) {
		super(Command.CONTINUOUS);

		if (!isType(boxes, Array) &&
			boxes.length &&
			boxes.every(b => b instanceof Box)) {
			throw new Error("Invalid argument.");
		} else if (!isType(pos, Vector2)) {
			throw new Error("Invalid argument.");
		}

		this._boxes = boxes;
		this._referencePosition = pos;

		this.localPositionDifference = null;
		this._initialLocalPositions =
			this._boxes.map(b => b.localPosition);
	}

	_calcFinalPositions() {
		this._finalLocalPositions =
			this._boxes.map(b => b.localPosition);

		this.localPositionDifference =
			this._finalLocalPositions[0]
				.subtract(this._initialLocalPositions[0]);
	}

	_close() {
		this._calcFinalPositions();
	}

	_undo() {
		if (this._finalLocalPositions) {		
			this._boxes.forEach((b, i) => {
				b.localPosition = this._initialLocalPositions[i];
			});
		}
	}

	_redo() {
		if (this._finalLocalPositions) {		
			this._boxes.forEach((b, i) => {
				b.localPosition = this._finalLocalPositions[i];
			});
		}
	}

	_applyLock(v, lock) {
		if (lock && !this._locked) {
			this._locked = true;
			this._lockX = Math.abs(v.x) < Math.abs(v.y);
		} else if (!lock && this._locked) {				
			this._locked = false;
		}
		if (this._locked) {
			if (this._lockX) {
				v.x = 0;
			} else {
				v.y = 0;
			}
		}
	}
}

const DragCommand = (function(){
	const DEFAULTS = { snapOffset: 10 };
	
	return class extends BoxCommand {
		constructor(boxes, pos, options) {
			super(boxes, pos);

			this._options = extend(DEFAULTS, options);
		}

		_execute(mousePosition, snap, lock) {
			let diff = mousePosition.subtract(this._referencePosition);

			if (snap) {
				diff = diff.map(a => a - (a % this._options.snapOffset));
			}

			this._applyLock(diff, lock);

			this._boxes.forEach((b, i) => {
				const localDiff = b.parent.toLocalDir(diff);
				const initial = this._initialLocalPositions[i];
				b.localPosition = initial.add(localDiff);
			});
		}
	};
})();

const ResizeCommand = (function(){
	const INVERTED_TOP  = [true,  true,  true,  null,  false, false, false, null], 
		  INVERTED_LEFT = [true,  null,  false, false, false, null,  true,  true],
		  FREEZE_Y  = [false, false, false, true,  false, false, false, true],
		  FREEZE_X  = [false, true,  false, false, false, true,  false, false];

	const DEFAULTS = {
		angle: 0,
		direction: 0,
		minWidth: 10,
		minHeight: 10,
		snapOffset: 25,
		fixAspectRatio: false };

	return class extends BoxCommand {
		constructor(boxes, pos, options) {
			super(boxes, pos);

			this._options = extend(DEFAULTS, options);

			const d = this._options.direction;

			this._invertedTop = INVERTED_TOP[d]; 
			this._invertedLeft = INVERTED_LEFT[d]; 

			const freezeX = FREEZE_X[d],
				  freezeY = FREEZE_Y[d];
			this._fix = this._options.fixAspectRatio === true;

			this._setX = !(freezeX || (freezeY && this._fix));
			this._setY = !(freezeY || (freezeX && this._fix));

			const angle = this._options.angle;
			this._xBasis = Vector2.right.rotate(angle);
			this._yBasis = Vector2.down.rotate(angle);
			this._inverseXBasis = Vector2.right.rotate(-angle);
			this._inverseYBasis = Vector2.down.rotate(-angle);

			this._aspectRatios =
				this._boxes.map(b => b.localHeight / b.localWidth);
		}

		_execute(mousePosition, snap, lock) {
			let diff = mousePosition
				.subtract(this._referencePosition)
				.project(this._xBasis, this._yBasis);

			if (snap === true) {
				const offset = this._options.snapOffset;
				diff = diff.map(a => a - (a % offset));
			}

			if (!this._fix) {
				this._applyLock(diff, lock === true);
			}

			this._boxes.forEach((box, i) => {
				const ratio = this._aspectRatios[i];
				if (this._fix) {
					const neg = this._invertedLeft !== this._invertedTop;
					diff = this._applyAspectRatio(diff, ratio, neg);
				}
				this._callApplyResize(box, i, diff);
			});
		}

		_applyAspectRatio(v, ratio, negSlope) {
			if (negSlope) {
				ratio *= -1;
			}
			return new Vector2(v.x, ratio * v.x);
		}
	};
})();

class ResizeDimensionsCommand extends ResizeCommand {
	constructor(boxes, pos, options) {
		super(boxes, pos, options);

		this.localDimensionsDifference = null;
		this._initialLocalDimensions =
			this._boxes.map(b => b.localDimensions);
	}

	_callApplyResize(box, i, diff) {
		const pos = this._initialLocalPositions[i],
			  dim = this._initialLocalDimensions[i];
		this._applyResize(box, diff, pos, dim);
	}

	_applyResize(box, diff, pos, dim) {
		diff = box.parent.toLocalDir(diff);

		let x;
		if (this._setX) {
			const result =
				this._calcAxis(
					diff.x,
					dim.x,
					this._invertedLeft,
					this._options.minWidth);
			x = result[0];
			box.localWidth = result[1];
		} else {
			x = 0;
		}

		let y;
		if (this._setY) {
			const result =
				this._calcAxis(
					diff.y,
					dim.y,
					this._invertedTop,
					this._options.minHeight);
			y = result[0];
			box.localHeight = result[1];
		} else {
			y = 0;
		}

		const newPos = new Vector2(x, y)
			.project(this._inverseXBasis, this._inverseYBasis)
				.add(pos);
		box.localPosition = newPos;
	}

	_calcAxis(diff, dim, inverted, min) {
		const m = inverted ? -1 : 1;
		let newDim = dim + (diff * m);
		const isMin = newDim < min;
		if (isMin) {
			newDim = min;
		}

		let pos;
		if (inverted) {
			if (isMin) {
				pos = dim - min;
			} else {
				pos = diff;
			}
		} else {
			pos = 0;
		}

		return [pos, newDim];
	}

	_close() {
		this._calcFinalPositions();

		this._finalLocalDimensions =
			this._boxes.map(b => b.localDimensions);

		this.localDimensionsDifference =
			this._finalLocalDimensions[0]
				.subtract(this._initialLocalDimensions[0]);
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
}

class ResizeScaleCommand extends ResizeCommand {
	constructor(boxes, pos, options) {
		super(boxes, pos, options);

		this.localScaleDifference = null;
		this._initialLocalScale =
			this._boxes.map(b => b.localScale);
	}

	_callApplyResize(box, i, diff) {
		const pos = this._initialLocalPositions[i],
			  scale = this._initialLocalScale[i];
		this._applyResize(box, diff, pos, scale);
	}

	_applyResize(box, diff, pos, scale) {
		diff = box.parent.toLocalDir(diff);

		let x;
		if (this._setX) {
			const result =
				this._calcAxis(
					diff.x,
					box.rawWidth,
					scale.x,
					this._invertedLeft,
					this._options.minWidth);
			x = result[0];
			box.localScaleX = result[1];
		} else {
			x = 0;
		}

		let y;
		if (this._setY) {
			const result =
				this._calcAxis(
					diff.y,
					box.rawHeight,
					scale.y,
					this._invertedTop,
					this._options.minHeight);
			y = result[0];
			box.localScaleY = result[1];
		} else {
			y = 0;
		}

		const newPos = new Vector2(x, y)
			.project(this._inverseXBasis, this._inverseYBasis)
				.add(pos);
		box.localPosition = newPos;
	}

	_fixAspect() {}

	_calcAxis(diff, dim, scale, inverted, min) {
		const m = inverted ? -1 : 1;
		let newScale = scale + (diff / dim * m);
		const isMin = newScale * dim < min;
		if (isMin) {
			newScale = min / dim;
		}

		let pos;
		if (inverted) {
			if (isMin) {
				pos = (scale * dim) - min;
			} else {
				pos = diff;
			}
		} else {
			pos = 0;
		}

		return [pos, newScale];
	}

	_close() {
		if (this._invertedLeft || this._invertedTop) {
			this._calcFinalPositions();
		} else {
			this._finalLocalPositions = this._initialLocalPositions.slice();
			this.localPositionDifference = Vector2.zero;
		}

		this._finalLocalScale = this._boxes.map(b => b.localScale);

		this.localScaleDifference =
			this._finalLocalScale[0]
				.divide(this._initialLocalScale[0]);
	}

	_undo() {
		super._undo();
		this._boxes.forEach((b, i) => {
			b.localScale = this._initialLocalScale[i];
		});
	}

	_redo() {
		super._redo();
		this._boxes.forEach((b, i) => {
			b.localScale = this._finalLocalScale[i];
		});
	}
}

const RotateCommand = (function(){
	const DEFAULTS = { snapOffset: 10 };

	return class extends BoxCommand {
		constructor(boxes, pos, options) {
			super(boxes, pos);
			
			this._options = extend(DEFAULTS, options);
			this._snapOffset = this._options.snapOffset * Vector2.degToRad;

			this.angleDifference = null;
			this._initialAngles = this._boxes.map(b => b.angle);
			this._initialCenters = this._boxes.map(b => b.rawCenter);
		}

		_execute(mousePosition, snapMovement) {
			const dir = mousePosition.subtract(this._referencePosition);

			let a = dir.angle + Vector2.angleOffset;
			if (snapMovement) {
				a -= (a % this._options.snapOffset);
			}

			this._boxes.forEach((box, i) => {
				box.angle = a;
				const c = this._initialCenters[i],
					  pos = this._initialLocalPositions[i],
					  diff = a - this._initialAngles[i];
				box.localPosition =
					c.negate()
					.rotate(diff)
					.add(c)
					.add(pos);
			});
		}

		_close() {
			this._calcFinalPositions();

			this._finalAngles = this._boxes.map(b => b.angle);

			this.angleDifference =
				this._finalAngles[0] - this._initialAngles[0];
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
