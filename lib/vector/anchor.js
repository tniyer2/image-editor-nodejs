
import { AddToEventLoop } from "../util/util";
import { createVectorProperty } from "../vector/util";
import Vector2 from "../vector/vector2";

export default (function(){
	class Anchor {
		constructor(element) {
			if (!(element instanceof HTMLElement)) {
				throw new Error("Invalid argument.");
			}
			this._element = element;

			this._boundingBox = null;
			this._dirty = true;

			this._body = document.body;
			this._docEl = document.documentElement;

			this._setDirtyTrue = new AddToEventLoop(() => {
				this._dirty = true;
			});
		}

		get element() {
			return this._element;
		}

		_calcBoundingBox() {
			return this._element.getBoundingClientRect();
		}

		_getBoundingBox() {
			if (this._dirty) {
				this._boundingBox = this._calcBoundingBox();
				this._dirty = false;
				this._setDirtyTrue.update();
			}
			return this._boundingBox;
		}

		toWorldDir(v) {
			return v;
		}

		toLocalDir(v) {
			return v;
		}

		toWorldPoint(v) {
			return v.add(this.position);
		}

		toLocalPoint(v) {
			return v.subtract(this.position);
		}

		_scrollOffsetTop() {
			return window.pageYOffset || this._docEl.scrollTop || this._body.scrollTop;
		}

		_clientOffsetTop() {
			return this._docEl.clientTop || this._body.clientTop || 0;
		}

		_scrollOffsetLeft() {
			return window.pageXOffset || this._docEl.scrollLeft || this._body.scrollLeft;
		}

		_clientOffsetLeft() {
			return this._docEl.clientLeft || this._body.clientLeft || 0;
		}

		get top() {
			return this._getBoundingBox().top +
				this._scrollOffsetTop() -
					this._clientOffsetTop();
		}

		get left() {
			return this._getBoundingBox().left +
				this._scrollOffsetLeft() -
					this._clientOffsetLeft();
		}

		get localTop() {
			return this.top;
		}

		get localLeft() {
			return this.left;
		}

		get width() {
			return this._getBoundingBox().width;
		}

		get height() {
			return this._getBoundingBox().height;
		}

		get localWidth() {
			return this.width;
		}

		get localHeight() {
			return this.height;
		}

		get scaleX() {
			return 1;
		}

		get scaleY() {
			return 1;
		}

		get scale() {
			return Vector2.one;
		}

		get localScaleX() {
			return 1;
		}

		get localScaleY() {
			return 1;
		}

		get localScale() {
			return Vector2.one;
		}

		get angle() {
			return 0;
		}

		get degrees() {
			return 0;
		}
	}

	const p = Anchor.prototype;

	createVectorProperty(p, "position", "left", "top", true, false);
	createVectorProperty(p, "localPosition", "localLeft", "localTop", true, false);
	createVectorProperty(p, "dimensions", "width", "height", true, false);
	createVectorProperty(p, "localDimensions", "localWidth", "localHeight", true, false);

	return Anchor;
})();
