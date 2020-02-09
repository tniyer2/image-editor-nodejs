
import { isUdf, isNumber, isType } from "../util/type";
import { createVectorProperty, splitVectorProperty } from "../vector/util";
import Vector2 from "../vector/vector2";
import Anchor from "../vector/anchor";

export default (function(){
	const
		TOPLEFT = 0,
		CENTER = 1;

	class Box {
		constructor(element, parent) {
			if (!(element instanceof Node)) {
				throw new Error("Invalid argument.");
			}

			this._element = element;
			this._element.style.transformOrigin = "top left";
			if (!isUdf(parent)) {
				this.parent = parent;
			}

			this._rawTop = 0;
			this._rawLeft = 0;
			this._rawWidth = 0;
			this._rawHeight = 0;
			this._localScaleX = 1;
			this._localScaleY = 1;
			this._degrees = 0;

			this.setOriginTopLeft();
		}

		_updateTransform() {
			const rot = "rotate(" + this._degrees + "deg)";
			const scale = "scale(" + this._localScaleX + "," + this._localScaleY + ")";
			this._element.style.transform = rot + " " + scale;
		}

		get rect() {
			const r = {},
				  top = this.top, 
				  left = this.left,
				  w = this.width, 
				  h = this.height;

			r.top = top;
			r.bottom = top + h;
			r.left = left;
			r.right = left + w;
			r.width = w;
			r.height = h;

			return r;
		}

		static getBoundingBox(boxes) {
			const b = {};
			boxes.forEach((box) => {
				["top", "left", "bottom", "right"].forEach((p, i) => {
					const n = box.rect[p],
						  m = b[p];
					if (isUdf(m) || 
						(i < 2 && n < m) || 
						(i >= 2 && n > m)) {
						b[p] = n;
					}
				});
			});

			b.width = b.right - b.left;
			b.height = b.bottom - b.top;

			return b;
		}

		get element() {
			return this._element;
		}

		get parent() {
			return this._parent;
		}

		set parent(val) {
			if (val !== null &&
				!(val instanceof Box) &&
				!isType(val, Anchor)) {
				throw new Error("Invalid argument.");
			}
			this._parent = val;
		}

		appendElement() {
			this._parent.element.appendChild(this._element);			
		}

		removeElement() {
			this._parent.element.removeChild(this._element);			
		}

		setOriginTopLeft() {
			this._origin = TOPLEFT;
			this._element.style.transformOrigin = "top left";
		}

		setOriginCenter() {
			this._origin = CENTER;
			this._element.style.transformOrigin = "center center";
		}

		toLocalDir(v) {
			v = this._parent.toLocalDir(v);
			const a = this.angle;
			if (a) {
				v = v.rotate(-a);
			}
			v = v.divide(this.localScale);
			return v;
		}

		toWorldDir(v) {
			v = v.multiply(this.localScale);
			const a = this.angle;
			if (a) {
				v = v.rotate(a);
			}
			v = this._parent.toWorldDir(v);
			return v;
		}

		toLocalPoint(v) {
			v = this._parent.toLocalPoint(v);
			v = v.subtract(this.localPosition);
			const a = this.angle;
			if (a) {
				v = v.rotate(-a);
			}
			v = v.divide(this.localScale);
			return v;
		}

		toWorldPoint(v) {
			v = v.multiply(this.localScale);
			const a = this.angle;
			if (a) {
				v = v.rotate(a);
			}
			v = v.add(this.localPosition);
			v = this._parent.toWorldPoint(v);
			return v;
		}

		get localScaleX() {
			return this._localScaleX;
		}

		set localScaleX(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._localScaleX = val;
			this._updateTransform();
		}

		get localScaleY() {
			return this._localScaleY;
		}

		set localScaleY(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._localScaleY = val;
			this._updateTransform();
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
			return this._parent ? this._element.offsetWidth : this._rawWidth;
		}

		set rawWidth(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._element.style.width = val + "px";
			this._rawWidth = val;
		}

		get rawHeight() {
			return this._parent ? this._element.offsetHeight : this._rawHeight;
		}

		set rawHeight(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._element.style.height = val + "px";
			this._rawHeight = val;
		}

		get localWidth() {
			return this.rawWidth * this._localScaleX;
		}

		set localWidth(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this.rawWidth = val / this._localScaleX;
		}

		get localHeight() {
			return this.rawHeight * this._localScaleY;
		}

		set localHeight(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this.rawHeight = val / this._localScaleY;
		}

		get width() {
			return this.localWidth * this._parent.scaleX;
		}

		set width(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this.localWidth = val / this._parent.scaleX;
		}

		get height() {
			return this.localHeight * this._parent.scaleY;
		}

		set height(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this.localHeight = val / this._parent.scaleY;
		}

		get degrees() {
			return this._degrees;
		}

		set degrees(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._degrees = val;
			this._updateTransform();
		}

		get angle() {
			return this._degrees * Vector2.degToRad;
		}

		set angle(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._degrees = val / Vector2.degToRad;
			this._updateTransform();
		}

		_getCenter() {
			let v = this.rawDimensions.divide(2);
			v = v.multiply(this.localScale);
			if (this._origin === TOPLEFT) {
				const a = this.angle;
				if (a) {
					v = v.rotate(a);
				}
			}
			return v;
		}

		_centerScaleOffset() {
			const s = Vector2.one.subtract(this.localScale);
			return this.rawDimensions.multiply(s).divide(2);
		}

		_centerRotationOffset() {
			const c = this._getCenter();
			let d = c.negate();
			const a = this.angle;
			if (a) {
				d = d.rotate(a);
			}
			d = d.add(c);
			return d;
		}

		get rawTop() {
			return this._parent ? this._element.offsetTop : this._rawTop;
		}

		set rawTop(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._element.style.top = val + "px";
			this._rawTop = val;
		}

		get rawLeft() {
			return this._parent ? this._element.offsetLeft : this._rawLeft;
		}

		set rawLeft(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this._element.style.left = val + "px";
			this._rawLeft = val;
		}

		get localPosition() {
			let val = this.rawPosition;
			if (this._origin === CENTER) {
				const s = this._centerScaleOffset(),
					  r = this._centerRotationOffset();
				val = val.add(s).add(r);
			}
			return val;
		}

		set localPosition(val) {
			if (!(val instanceof Vector2)) {
				throw new Error("Invalid argument.");
			}

			if (this._origin === CENTER) {
				const s = this._centerScaleOffset(),
					  r = this._centerRotationOffset();
				val = val.subtract(s).subtract(r);
			}
			this.rawPosition = val;
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

		get localCenter() {
			let val;
			if (this._origin === TOPLEFT) {
				val = this.localPosition;
			} else {
				const s = this._centerScaleOffset();
				val = this.rawPosition.add(s);
			}
			val = val.add(this._getCenter());
			return val;
		}

		set localCenter(val) {
			if (!(val instanceof Vector2)) {
				throw new Error("Invalid argument.");
			}

			val = val.subtract(this._getCenter());
			if (this._origin === TOPLEFT) {
				this.localPosition = val;
			} else {
				const s = this._centerScaleOffset();
				this.rawPosition = val.subtract(s);
			}
		}

		get center() {
			return this._parent.toWorldPoint(this.localCenter);
		}

		set center(val) {
			if (!(val instanceof Vector2)) {
				throw new Error("Invalid argument.");
			}
			this.localCenter = this._parent.toLocalPoint(val);
		}
	}

	const p = Box.prototype;

	createVectorProperty(p, "localScale", "localScaleX", "localScaleY");
	splitVectorProperty(p, "scale", "scaleX", "scaleY");

	createVectorProperty(p, "rawDimensions", "rawWidth", "rawHeight");
	createVectorProperty(p, "localDimensions", "localWidth", "localHeight");
	createVectorProperty(p, "dimensions", "width", "height");

	createVectorProperty(p, "rawPosition", "rawLeft", "rawTop");
	splitVectorProperty(p, "localPosition", "localLeft", "localTop");
	splitVectorProperty(p, "position", "left", "top");

	return Box;
})();
