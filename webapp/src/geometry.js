
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

    toString() {
    	return "(" + this.x + ", " + this.y + ")";
    }
}

function createVectorProperty(obj, publicName, xName, yName, get=true, set=true) {
	const info = {};
	if (get) {
		info.get = function() {
			return new Vector2(this[xName], this[yName]);
		};
	}
	if (set) {
		info.set = function(val) {
			this[xName] = val.x;
			this[yName] = val.y;
		};
	}
	Object.defineProperty(obj, publicName, info);
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

		get width() {
			return this._boundingBox.width;
		}

		get height() {
			return this._boundingBox.height;
		}

		get scaleX() {
			return 1;
		}

		get scaleY() {
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
			return v;
		}

		toLocalPoint(v) {
			return v;
		}
	}

	const p = Inner.prototype;
	createVectorProperty(p, "position", "left", "top", true, false);
	createVectorProperty(p, "dimensions", "width", "height", true, false);
	createVectorProperty(p, "scale", "scaleX", "scaleY", true, false);

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

			this._localTop = 0;
			this._localLeft = 0;
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
				this._element.style.transform = scale + " " + rot;
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
			v = v.rotate(-this.angle);
			v = v.divide(this.scale);
			return v;
		}

		toWorldDir(v) {
			v = v.multiply(this.scale);
			v = v.rotate(this.angle);
			return v;
		}

		toLocalPoint(v) {
			v = v.subtract(this.position);
			v = this.toLocalDir(v);
			return v;
		}

		toWorldPoint(v) {
			v = this.toWorldDir(v);
			v = v.add(this.position);
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

		get scaleX() {
			return this._localScaleX * this._parent.scaleX;
		}

		set scaleX(val) {
			this._localScaleX = val / this._parent.scaleX;
		}

		get scaleY() {
			return this._localScaleY * this._parent.scaleY;
		}

		set scaleY(val) {
			this._localScaleY = val / this._parent.scaleY;
		}

		_getTopDiff() {
			const h = this._element.offsetHeight;
			return (h * (1 - this._localScaleY) * 0.5);
		}

		_getLeftDiff() {
			const w = this._element.offsetWidth;
			return (w * (1 - this._localScaleX) * 0.5);
		}

		get localTop() {
			let v = this._parent ? this._element.offsetTop : this._localTop;
			if (this._origin === CENTER) {
				v += this._getTopDiff();
			}
			return v;
		}

		set localTop(val) {
			if (this._origin === CENTER) {
				val -= this._getTopDiff();
			}
			this._element.style.top = val + "px";
			this._localTop = val;
		}

		get localLeft() {
			let v = this._parent ? this._element.offsetLeft : this._localLeft;
			if (this._origin === CENTER) {
				v += this._getLeftDiff();
			}
			return v;
		}

		set localLeft(val) {
			if (this._origin === CENTER) {
				val -= this._getLeftDiff();
			}
			this._element.style.left = val + "px";
			this._localLeft = val;
		}

		get top() {
			const v = new Vector2(0, this.localTop);
			return this._parent.toWorldPoint(v).y;
		}

		set top(val) {
			const v = new Vector2(0, val);
			this.localTop = this._parent.toLocalPoint(v).y;
		}

		get left() {
			const v = new Vector2(this.localLeft, 0);
			return this._parent.toWorldPoint(v).x;
		}

		set left(val) {
			const v = new Vector2(val, 0);
			this.localLeft = this._parent.toLocalPoint(v).x;
		}

		get rawWidth() {
			if (this._parent) {
				return this._element.offsetWidth;
			} else {
				return this._rawWidth;
			}
		}

		set rawWidth(val) {
			this._element.style.width = val + "px";
			this._rawWidth = val;
		}

		get rawHeight() {
			if (this._parent) {
				return this._element.offsetHeight;
			} else {
				return this._rawHeight;
			}
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

		_getCenter() {
			const x = this.localWidth / 2;
			const y = this.localHeight / 2;
			let v = new Vector2(x, y);
			if (this._angle) {
				v = v.rotate(this._angle);
			}
			return v;
		}

		get localCenter() {
			return this.localPosition.add(this._getCenter());
		}

		set localCenter(val) {
			this.localPosition = val.subtract(this._getCenter());
		}

		get center() {
			return this._parent.toWorldPoint(this.localCenter);
		}

		set center(val) {
			this.localCenter = this._parent.toLocalPoint(val);
		}

		get localAngle() {
			return this._angle;
		}

		set localAngle(val) {
			this._angle = val;
			this._transformUpdater.invoke();
		}

		get angle() {
			return this.localAngle + this._parent.angle;
		}

		set angle(val) {
			this.localAngle = val - this._parent.angle;
		}
	}

	const p = Inner.prototype;
	createVectorProperty(p, "localPosition", "localLeft", "localTop");
	createVectorProperty(p, "position", "left", "top");
	createVectorProperty(p, "rawDimensions", "rawWidth", "rawHeight");
	createVectorProperty(p, "localDimensions", "localWidth", "localHeight");
	createVectorProperty(p, "dimensions", "width", "height");
	createVectorProperty(p, "localScale", "localScaleX", "localScaleY");
	createVectorProperty(p, "scale", "scaleX", "scaleY");

	return Inner;
})();
