
import { isNumber } from "../util/type";
import { createVectorProperty, splitVectorProperty } from "../vector/util";
import Vector2 from "../vector/vector2";
import Box from "../vector/box";
import Layer from "./layer";

export default (function(){
	class LayerBox {
		constructor(layer) {
			if (!(layer instanceof Layer)) {
				throw new Error("Invalid argument.");
			}
			this._layer = layer;

			this._top = 0;
			this._left = 0;
			this._width = 0;
			this._height = 0;
			this._scaleX = 1;
			this._scaleY = 1;
			this._angle = 0;
			this._pivot = Vector2.zero;
			this._pivotRelative = false;

			this._parent = null;
			this._children = [];
		}

		get layer() {
			return this._layer;
		}

		get parent() {
			return this._parent;
		}

		set parent(val) {
			if (val !== null &&
				!(val instanceof Box) &&
				!(val instanceof LayerBox)) {
				throw new Error("Invalid argument.");
			}
			this._parent = val;
		}

		get children() {
			return this._children.slice();
		}

		addChild(child) {
			if (!(child instanceof LayerBox)) {
				throw new Error("Invalid argument.");
			}
			child.parent = this;
			this._children.push(child);
		}

		removeChild(child) {
			const i = this._children.indexOf(child);
			if (i === -1) {
				throw new Error("Argument 'child' could not be found.");
			}
			child.parent = null;
			this._children.splice(i, 1);
		}

		clearChildren() {
			this._children.forEach((child) => {
				child.parent = null;
			});
			this._children = [];
		}

		_rotate(v, pos) {
			let a = this.angle;
			if (a) {
				a *= pos === true ? 1 : -1;
				const p = this.calcLocalPivot();
				if (!p.equals(Vector2.zero)) {
					v = v.subtract(p);
					v = v.rotate(a);
					v = v.add(p);
				} else {
					v = v.rotate(a);
				}
			}
			return v;
		}

		toLocalDir(v) {
			v = this._parent.toLocalDir(v);
			v = this._rotate(v, false);
			v = v.divide(this.localScale);
			return v;
		}

		toWorldDir(v) {
			v = v.multiply(this.localScale);
			v = this._rotate(v, true);
			v = this._parent.toWorldDir(v);
			return v;
		}

		toLocalPoint(v) {
			v = this._parent.toLocalPoint(v);
			v = v.subtract(this.localPosition);
			v = this._rotate(v, false);
			v = v.divide(this.localScale);
			return v;
		}

		toWorldPoint(v) {
			v = v.multiply(this.localScale);
			v = this._rotate(v, true);
			v = v.add(this.localPosition);
			v = this._parent.toWorldPoint(v);
			return v;
		}

		get localTop() {
			return this._top;
		}

		set localTop(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._top = val;
		}

		get localLeft() {
			return this._left;
		}

		set localLeft(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._left = val;
		}

		get position() {
			return this._parent.toWorldPoint(this.localPosition);
		}

		set position(val) {
			if (!(val instanceof Vector2)) {
				throw new Error("Invalid argument.");
			}
			this.localPosition = this._parent.toLocalPoint(val);
		}

		get localScaleX() {
			return this._scaleX;
		}

		set localScaleX(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._scaleX = val;
		}

		get localScaleY() {
			return this._scaleY;
		}

		set localScaleY(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._scaleY = val;
		}

		get scale() {
			return this.localScale.multiply(this._parent.scale);
		}

		set scale(val) {
			if (!(val instanceof Vector2)) {
				throw new Error("Invalid argument.");
			}
			this.localScale = val.divide(this._parent.scale);
		}

		get rawWidth() {
			return this._width;
		}

		set rawWidth(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._width = val;
		}

		get rawHeight() {
			return this._height;
		}

		set rawHeight(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._height = val;
		}

		get localDimensions() {
			return this.rawDimensions.multiply(this.localScale);
		}

		set localDimensions(val) {
			if (!(val instanceof Vector2)) {
				throw new Error("Invalid argument.");
			}
			this.rawDimensions = val.divide(this.localScale);
		}

		get dimensions() {
			return this.rawDimensions.multiply(this.scale);
		}

		set dimensions(val) {
			if (!(val instanceof Vector2)) {
				throw new Error("Invalid argument.");
			}
			this.rawDimensions = val.divide(this.scale);
		}

		get angle() {
			return this._angle;
		}

		set angle(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._angle = val;
		}

		get degrees() {
			return this._angle / Vector2.degToRad;
		}

		set degrees(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._angle = val * Vector2.degToRad;
		}

		getPivot() {
			return this._pivot.copy();
		}

		isPivotRelative() {
			return this._pivotRelative;
		}

		calcLocalPivot() {
			if (this._pivotRelative) {
				return this.rawDimensions.multiply(this._pivot);
			} else {
				return this._pivot.copy();
			}
		}

		setLocalPivot(val, relative=true) {
			if (!(val instanceof Vector2)) {
				throw new Error("Invalid argument.");
			} else if (typeof relative !== "boolean") {
				throw new Error("Invalid argument.");
			}

			this._pivot = val.copy();
			this._pivotRelative = relative;
		}

		calcPivot() {
			const val = this.calcLocalPivot();
			return this.toWorldPoint(val);
		}

		setPivot(val, relative=true) {
			if (!(val instanceof Vector2)) {
				throw new Error("Invalid argument.");
			} else if (typeof relative !== "boolean") {
				throw new Error("Invalid argument.");
			}

			val = this.toLocalPoint(val);
			this.setLocalPivot(val, relative);
		}

		copyPropertiesOf(box) {
			if (!(box instanceof LayerBox)) {
				throw new Error("Invalid argument.");
			}
			this.localPosition = box.localPosition;
			this.localScale = box.localScale;
			this.rawDimensions = box.rawDimensions;
			this.angle = box.angle;
			this._pivot = box.getPivot();
			this._pivotRelative = box.isPivotRelative();
		}

		copyChildren(box) {
			if (!(box instanceof LayerBox)) {
				throw new Error("Invalid argument.");
			}
			const children = box.children;
			box.clearChildren();
			children.forEach((child) => {
				this.addChild(child);
			});
		}
	}

	const p = LayerBox.prototype;

	createVectorProperty(p, "localPosition", "localLeft", "localTop");
	splitVectorProperty(p, "position", "left", "top");

	createVectorProperty(p, "localScale", "localScaleX", "localScaleY");
	splitVectorProperty(p, "scale", "scaleX", "scaleY");

	createVectorProperty(p, "rawDimensions", "rawWidth", "rawHeight");
	splitVectorProperty(p, "localDimensions", "localWidth", "localHeight");
	splitVectorProperty(p, "dimensions", "width", "height");

	return LayerBox;
})();
