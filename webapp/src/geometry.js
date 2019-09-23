
import { isUdf } from "./type";
import { toPrecision, AddToEventLoop } from "./utility";

export { Vector2, Anchor, Box };

const PRECISION = 12,
	  DEG_TO_RAD = Math.PI / 180,
	  ANGLE_OFFSET = Math.PI / 2;

class Vector2 {
    constructor(x, y) {
    	this.x = x;
    	this.y = y;
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

    _parseFactor(a) {
    	return a instanceof Vector2 ? [a.x, a.y] : [a, a];
    }

    add(a) {
    	const [x, y] = this._parseFactor(a);
        return new Vector2(this.x + x, this.y + y);
    }

    subtract(a) {
    	const [x, y] = this._parseFactor(a);
        return new Vector2(this.x - x, this.y - y);
    }

    multiply(a) {
    	const [x, y] = this._parseFactor(a);
    	return new Vector2(this.x * x, this.y * y);
    }

    divide(a) {
    	const [x, y] = this._parseFactor(a);
    	return new Vector2(this.x / x, this.y / y);
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
    	const m = this.magnitude;
    	return new Vector2(this.x / m, this.y / m);
    }

    static get degToRad() {
    	return DEG_TO_RAD;
    }

    static get angleOffset() {
    	return ANGLE_OFFSET;
    }

    get angle() {
    	return Math.atan2(this.y, this.x);
    }

    dot(v) {
    	return (this.x * v.x) + (this.y * v.y);
    }

    project(u, v) {
    	return new Vector2(this.dot(u), this.dot(v));
    }

	// a should be in radians
    rotate(a) {
    	const cs = Math.cos(a),
    		  sn = Math.sin(a);
		let px = (this.x * cs) - (this.y * sn),
    		py = (this.x * sn) + (this.y * cs);
    	px = toPrecision(px, PRECISION);
    	py = toPrecision(py, PRECISION);
    	return new Vector2(px, py);
    }

    map(f) {
    	return new Vector2(f(this.x), f(this.y));
    }

    copy() {
    	return new Vector2(this.x, this.y);
    }

    equals(v) {
    	return this.x === v.x && this.y === v.y;
    }

    toString() {
    	return "(" + this.x + ", " + this.y + ")";
    }
}

function createVectorProperty(obj, vectorName, xName, yName, get=true, set=true) {
	const info = {};
	if (get === true) {
		info.get = function() {
			return new Vector2(this[xName], this[yName]);
		};
	}
	if (set === true) {
		info.set = function(val) {
			this[xName] = val.x;
			this[yName] = val.y;
		};
	}
	Object.defineProperty(obj, vectorName, info);
}

function createNumberProperties(obj, vectorName, xName, yName, get=true, set=true) {
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

// @todo: listen to scroll and other events
const Anchor = (function(){
	class Inner {
		constructor(element) {
			this._element = element;
			this._innerBoundingBox = null;
			this._dirty = true;
		}

		get element() {
			return this._element;
		}

		get _boundingBox() {
			this._updateBoundingBox();
			return this._innerBoundingBox;
		}

		_updateBoundingBox() {
			if (this._dirty) {
				this._innerBoundingBox = this._element.getBoundingClientRect();
				this._dirty = false;
			}
		}

		get top() {
			return this._boundingBox.top;
		}

		get left() {
			return this._boundingBox.left;
		}

		get localTop() {
			return this._boundingBox.top;
		}

		get localLeft() {
			return this._boundingBox.left;
		}

		get width() {
			return this._boundingBox.width;
		}

		get height() {
			return this._boundingBox.height;
		}

		get localWidth() {
			return this._boundingBox.width;
		}

		get localHeight() {
			return this._boundingBox.height;
		}

		get scaleX() {
			return 1;
		}

		get scaleY() {
			return 1;
		}

		get localScaleX() {
			return 1;
		}

		get localScaleY() {
			return 1;
		}

		get angle() {
			return 0;
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
	}

	const p = Inner.prototype;
	createVectorProperty(p, "position", "left", "top", true, false);
	createVectorProperty(p, "localPosition", "localLeft", "localTop", true, false);
	createVectorProperty(p, "dimensions", "width", "height", true, false);
	createVectorProperty(p, "localDimensions", "localWidth", "localHeight", true, false);
	createVectorProperty(p, "scale", "scaleX", "scaleY", true, false);
	createVectorProperty(p, "localScale", "localScaleX", "localScaleY", true, false);

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
			this._angle = 0;

			this.setOriginTopLeft();
			this._initTransformUpdater();
		}

		_initTransformUpdater() {
			this._transformUpdater = new AddToEventLoop(() => {
				const degrees = this._angle / DEG_TO_RAD;
				const rot = "rotate(" + degrees + "deg)";
				const scale = "scale(" + this._localScaleX + ", " + this._localScaleY + ")";
				this._element.style.transform = rot + " " + scale;
			});
		}

		get element() {
			return this._element;
		}

		get parent() {
			return this._parent;
		}

		set parent(val) {
			if (val !== null &&
				!(val instanceof Anchor) &&
				!(val instanceof Box)) {
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

		get rect() {
			const r = {};
			const top = this.top, 
				  left = this.left,
				  w = this.width, 
				  h = this.height;

			r.top 	 = top;
			r.bottom = top + h;
			r.left 	 = left;
			r.right  = left + w;
			r.width  = w;
			r.height = h;

			return r;
		}

		static getBoundingBox(boxes) {
			const b = {};
			boxes.forEach((box) => {
				["top", "left", "bottom", "right"].forEach((p, i) => {
					const n = box.rect[p],
						  m = b[p];
					if ( isUdf(m) || 
						 (i < 2 && n < m) || 
						 (i >= 2 && n > m) ) {
						b[p] = n;
					}
				});
			});

			b.width  = b.right  - b.left;
			b.height = b.bottom - b.top;

			return b;
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
			if (this._angle) {
				v = v.rotate(-this._angle);
			}
			v = v.divide(this.localScale);
			return v;
		}

		toWorldDir(v) {
			v = v.multiply(this.localScale);
			if (this._angle) {
				v = v.rotate(this._angle);
			}
			v = this._parent.toWorldDir(v);
			return v;
		}

		toLocalPoint(v) {
			v = this._parent.toLocalPoint(v);
			v = v.subtract(this.localPosition);
			if (this._angle) {
				v = v.rotate(-this._angle);
			}
			v = v.divide(this.localScale);
			return v;
		}

		toWorldPoint(v) {
			v = v.multiply(this.localScale);
			if (this._angle) {
				v = v.rotate(this._angle);
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
			this._transformUpdater.invoke();
		}

		get localScaleY() {
			return this._localScaleY;
		}

		set localScaleY(val) {
			this._localScaleY = val;
			this._transformUpdater.invoke();
		}

		get scale() {
			return this.localScale.multiply(this._parent.scale);
		}

		set scale(val) {
			this.localScale = val.divide(this._parent.scale);
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

		_getCenter() {
			let v = this.rawDimensions.divide(2);
			v = v.multiply(this.localScale);
			if (this._origin === TOPLEFT) {
				v = v.rotate(this._angle);
			}
			return v;
		}

		_centerScaleOffset() {
			const s = Vector2.one.subtract(this.localScale);
			return this.rawDimensions.multiply(s).divide(2);
		}

		_centerRotationOffset() {
			const c = this._getCenter();
			const d = c.negate().rotate(this._angle).add(c);
			return d;
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

		get staticLocalPosition() {
			let v = this.rawPosition;
			if (this._origin === CENTER) {
				const s = this._centerScaleOffset();
				v = v.add(s);
			}
			return v;
		}

		set staticLocalPosition(val) {
			if (this._origin === CENTER) {
				const s = this._centerScaleOffset();
				val = val.subtract(s);
			}
			this.rawPosition = val;
		}

		get position() {
			return this._parent.toWorldPoint(this.localPosition);
		}

		set position(val) {
			this.localPosition = this._parent.toLocalPoint(val);
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

		get angle() {
			return this._angle;
		}

		set angle(val) {
			this._angle = val;
			this._transformUpdater.invoke();
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
	createVectorProperty(p, "localScale", "localScaleX", "localScaleY");
	createVectorProperty(p, "rawDimensions", "rawWidth", "rawHeight");
	createVectorProperty(p, "localDimensions", "localWidth", "localHeight");
	createVectorProperty(p, "dimensions", "width", "height");

	createNumberProperties(p, "localPosition", "localLeft", "localTop");
	createNumberProperties(p, "position", "left", "top");
	createNumberProperties(p, "scale", "scaleX", "scaleY");

	return Inner;
})();
