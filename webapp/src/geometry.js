
import { isUdf, isNumber, isType } from "./type";
import { toPrecision } from "./utility";

export { Vector2, Anchor, Box };

const Vector2 = (function(){
	const PRECISION = 12,
		  DEG_TO_RAD = Math.PI / 180,
		  ANGLE_OFFSET = Math.PI / 2;

	return class {
	    constructor(x, y) {
	    	if (!isNumber(x) || !isNumber(y)) {
	    		throw new Error("Invalid arguments.");
	    	}
	    	this.x = x;
	    	this.y = y;
	    	this._buffer = { x: 0, y: 0 };
	    }

	    static get zero() {
	    	return new Vector2(0, 0);
	    }

	    static get one() {
	    	return new Vector2(1, 1);
	    }

	    static get right() {
	    	return new Vector2(1, 0);
	    }

	    static get left() {
	    	return new Vector2(-1, 0);
	    }

	    static get down() {
	    	return new Vector2(0, 1);
	    }

	    static get up() {
	    	return new Vector2(0, -1);
	    }

	    static get degToRad() {
	    	return DEG_TO_RAD;
	    }

	    static get angleOffset() {
	    	return ANGLE_OFFSET;
	    }

	    equals(v) {
	    	if (!isType(v, Vector2)) {
	    		throw new Error("Invalid argument.");
	    	}
	    	return this.x === v.x && this.y === v.y;
	    }

	    _parseInput(v) {
	    	if (isType(v, Vector2)) {
	    		return v;
	    	} else if (isNumber(v)) {
	    		this._buffer.x = v;
	    		this._buffer.y = v;
	    		return this._buffer;
	    	} else {
	    		throw new Error("Invalid argument.");
	    	}
	    }

	    add(v) {
	    	v = this._parseInput(v);
	        return new Vector2(this.x + v.x, this.y + v.y);
	    }

	    subtract(v) {
	    	v = this._parseInput(v);
	        return new Vector2(this.x - v.x, this.y - v.y);
	    }

	    multiply(v) {
	    	v = this._parseInput(v);
	    	return new Vector2(this.x * v.x, this.y * v.y);
	    }

	    divide(v) {
	    	v = this._parseInput(v);

	    	if (v.x === 0 || v.y === 0) {
	    		throw new Error("Divide by Zero Exception");
	    	}

	    	// 0 / num evaluates to Infinity
	    	const x = this.x === 0 ? 0 : this.x / v.x,
	    		  y = this.y === 0 ? 0 : this.y / v.y;
	    	return new Vector2(x, y);
	    }

	    negate() {
	    	return new Vector2(-this.x, -this.y);
	    }

	    get sqrMagnitude() {
	    	return Math.pow(this.x, 2) + Math.pow(this.y, 2);
	    }

	    get magnitude() {
	    	return Math.sqrt(this.sqrMagnitude);	
	    }

	    normalize() {
	    	if (this.x === 0 && this.y === 0) {
	    		return this.copy();
	    	} else {
	    		return this.divide(this.magnitude);
	    	}
	    }

	    get angle() {
	    	return Math.atan2(this.y, this.x);
	    }

	    dot(v) {
	    	if (!isType(v, Vector2)) {
	    		throw new Error("Invalid argument.");
	    	}
	    	return (this.x * v.x) + (this.y * v.y);
	    }

	    project(u, v) {
	    	return new Vector2(this.dot(u), this.dot(v));
	    }

		// a should be in radians
	    rotate(a) {
	    	if (!isNumber(a)) {
	    		throw new Error("Invalid argument.");
	    	}

	    	const cs = Math.cos(a),
	    		  sn = Math.sin(a);
			let x = (this.x * cs) - (this.y * sn),
	    		y = (this.x * sn) + (this.y * cs);

	    	x = toPrecision(x, PRECISION);
	    	y = toPrecision(y, PRECISION);

	    	return new Vector2(x, y);
	    }

	    map(f) {
	    	return new Vector2(f(this.x), f(this.y));
	    }

	    copy() {
	    	return new Vector2(this.x, this.y);
	    }

	    toString() {
	    	return "(" + this.x + ", " + this.y + ")";
	    }
	};
})();

function createVectorProperty(
	obj, vectorName, xName, yName, get=true, set=true) {

	const info = {};

	if (get === true) {
		info.get = function() {
			return new Vector2(this[xName], this[yName]);
		};
	}
	if (set === true) {
		info.set = function(val) {
			if (!isType(val, Vector2)) {
				throw new Error("Invalid argument.");
			}
			this[xName] = val.x;
			this[yName] = val.y;
		};
	}

	Object.defineProperty(obj, vectorName, info);
}

function splitVectorProperty(
	obj, vectorName, xName, yName, get=true, set=true) {

	const xInfo = {},
		  yInfo = {};

	if (get === true) {
		xInfo.get = function() {
			return this[vectorName].x;
		};
		yInfo.get = function() {
			return this[vectorName].y;
		};
	}
	if (set === true) {
		xInfo.set = function(val) {
			this[vectorName] = new Vector2(val, this[vectorName].y);
		};
		yInfo.set = function(val) {
			this[vectorName] = new Vector2(this[vectorName].x, val);
		};
	}

	Object.defineProperty(obj, xName, xInfo);
	Object.defineProperty(obj, yName, yInfo);
}

const Anchor = (function(){
	class Inner {
		constructor(element) {
			if (!(element instanceof HTMLElement)) {
				throw new Error("Invalid argument.");
			}
			this._element = element;

			this._boundingBox = null;
			this._dirty = true;

			this._body = document.body;
			this._docEl = document.documentElement;
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

	const p = Inner.prototype;

	createVectorProperty(p, "position", "left", "top", true, false);
	createVectorProperty(p, "localPosition", "localLeft", "localTop", true, false);
	createVectorProperty(p, "dimensions", "width", "height", true, false);
	createVectorProperty(p, "localDimensions", "localWidth", "localHeight", true, false);

	return Inner;
})();

const Box = (function(){
	const TOPLEFT = 0,
		  CENTER = 1;

	class Inner {
		constructor(element, parent) {
			if (!(element instanceof Node)) {
				throw new Error("Invalid argument.");
			}

			this._element = element;
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
			this._element.style.transformOrigin = "top left";
			this._origin = TOPLEFT;
		}

		setOriginCenter() {
			this._element.style.transformOrigin = "center center";
			this._origin = CENTER;
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
			this._localScaleX = val;
			this._updateTransform();
		}

		get localScaleY() {
			return this._localScaleY;
		}

		set localScaleY(val) {
			this._localScaleY = val;
			this._updateTransform();
		}

		get scale() {
			return this.localScale.multiply(this._parent.scale);
		}

		set scale(val) {
			this.localScale = val.divide(this._parent.scale);
		}

		get rawWidth() {
			return this._parent ? this._element.offsetWidth : this._rawWidth;
		}

		set rawWidth(val) {
			this._element.style.width = val + "px";
			this._rawWidth = val;
		}

		get rawHeight() {
			return this._parent ? this._element.offsetHeight : this._rawHeight;
		}

		set rawHeight(val) {
			this._element.style.height = val + "px";
			this._rawHeight = val;
		}

		get localWidth() {
			return this.rawWidth * this._localScaleX;
		}

		set localWidth(val) {
			this.rawWidth = val / this._localScaleX;
		}

		get localHeight() {
			return this.rawHeight * this._localScaleY;
		}

		set localHeight(val) {
			this.rawHeight = val / this._localScaleY;
		}

		get width() {
			return this.localWidth * this._parent.scaleX;
		}

		set width(val) {
			this.localWidth = val / this._parent.scaleX;
		}

		get height() {
			return this.localHeight * this._parent.scaleY;
		}

		set height(val) {
			this.localHeight = val / this._parent.scaleY;
		}

		get degrees() {
			return this._degrees;
		}

		set degrees(val) {
			this._degrees = val;
			this._updateTransform();
		}

		get angle() {
			return this._degrees * Vector2.degToRad;
		}

		set angle(val) {
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
			this._element.style.top = val + "px";
			this._rawTop = val;
		}

		get rawLeft() {
			return this._parent ? this._element.offsetLeft : this._rawLeft;
		}

		set rawLeft(val) {
			this._element.style.left = val + "px";
			this._rawLeft = val;
		}

		get localPosition() {
			let v = this.rawPosition;
			if (this._origin === CENTER) {
				const s = this._centerScaleOffset(),
					  r = this._centerRotationOffset();
				v = v.add(s).add(r);
			}
			return v;
		}

		set localPosition(val) {
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
			this.localPosition = this._parent.toLocalPoint(val);
		}

		get rawCenter() {
			return this._getCenter();
		}

		get localCenter() {
			let v;
			if (this._origin === TOPLEFT) {
				v = this.localPosition;
			} else {
				const s = this._centerScaleOffset();
				v = this.rawPosition.add(s);
			}
			v = v.add(this._getCenter());
			return v;
		}

		set localCenter(val) {
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
			this.localCenter = this._parent.toLocalPoint(val);
		}
	}

	const p = Inner.prototype;

	createVectorProperty(p, "rawPosition", "rawLeft", "rawTop");
	createVectorProperty(p, "rawDimensions", "rawWidth", "rawHeight");
	createVectorProperty(p, "localDimensions", "localWidth", "localHeight");
	createVectorProperty(p, "dimensions", "width", "height");
	createVectorProperty(p, "localScale", "localScaleX", "localScaleY");

	splitVectorProperty(p, "localPosition", "localLeft", "localTop");
	splitVectorProperty(p, "position", "left", "top");
	splitVectorProperty(p, "scale", "scaleX", "scaleY");

	return Inner;
})();
