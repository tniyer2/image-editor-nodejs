
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

    toString() {
    	return "( " + this.x + ", " + this.y + ")";
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

const Anchor = (function(){
	class Inner {
		constructor(element) {
			this._element = element;
			this._innerBoundingBox = null;
			this._boundingBoxChanged = true;
		}

		get element() {
			return this._element;
		}

		get _boundingBox() {
			this._updateBoundingBox();
			return this._innerBoundingBox;
		}

		_updateBoundingBox() {
			if (this._boundingBoxChanged) {
				this._innerBoundingBox = this._element.getBoundingClientRect();
				this._boundingBoxChanged = false;
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
	}

	const p = Inner.prototype;
	createVectorProperty(p, "position", "left", "top", true, false);
	createVectorProperty(p, "dimensions", "width", "height", true, false);
	createVectorProperty(p, "scale", "scaleX", "scaleY", true, false);

	return Inner;
})();

const Box = (function(){
	class Inner {
		constructor(element, parent) {
			this._element = element;
			if (!isUdf(parent)) {
				this.parent = parent;
			}

			this._angle = 0;
			this._localScaleX = 1;
			this._localScaleY = 1;

			this._updateCssTransform = new AddToEventLoop(() => {
				const cssRot = "rotate(" + this.degrees + "deg)";
				const cssScale = "scale(" + this._localScaleX + ", " + this._localScaleY + ")";
				this._element.style.transform = cssRot + " " + cssScale;
			});
		}

		get element() {
			return this._element;
		}

		get parent() {
			return this._parent;
		}

		set parent(val) {
			if (!(val instanceof Anchor) &&
				!(val instanceof Box) &&
				val !== null) {
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

		toLocalDir(v) {
			return v.divide(this._parent.scale);
		}

		toWorldDir(v) {
			return v.multiply(this._parent.scale);
		}

		toLocalPoint(v) {
			return v.subtract(this._parent.position).divide(this._parent.scale);
		}

		toWorldPoint(v) {
			return v.multiply(this._parent.scale).add(this._parent.position);
		}

		get localScaleX() {
			return this._localScaleX;
		}

		set localScaleX(val) {
			this._localScaleX = val;
			this._updateCssTransform.invoke();
		}

		get localScaleY() {
			return this._localScaleY;
		}

		set localScaleY(val) {
			this._localScaleY = val;
			this._updateCssTransform.invoke();
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

		get _topDiff() {
			const h = this._element.offsetHeight;
			return (h * (1 - this._localScaleY) * 0.5);
		}

		get _leftDiff() {
			const w = this._element.offsetWidth;
			return (w * (1 - this._localScaleX) * 0.5);
		}

		get localTop() {
			return this._element.offsetTop + this._topDiff;
		}

		set localTop(val) {
			val -= this._topDiff;
			this._element.style.top = val + "px";
		}

		get top() {
			return (this.localTop * this._parent.scaleY) + this._parent.top;
		}

		set top(val) {
			this.localTop = (val - this._parent.top) / this._parent.scaleY;
		}

		get localLeft() {
			return this._element.offsetLeft + this._leftDiff;
		}

		set localLeft(val) {
			val -= this._leftDiff;
			this._element.style.left = val + "px";
		}

		get left() {
			return (this.localLeft * this._parent.scaleX) + this._parent.left;
		}

		set left(val) {
			val = (val - this._parent.left) / this._parent.scaleX;
			this.localLeft = val;
		}

		get localWidth() {
			return this._element.offsetWidth * this._localScaleX;
		}

		set localWidth(val) {
			val /= this._localScaleX;
			this._element.style.width = val + "px";
		}

		get localHeight() {
			return this._element.offsetHeight * this._localScaleY;
		}

		set localHeight(val) {
			val /= this._localScaleY;
			this._element.style.height = val + "px";
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

		get localCenterX() {
			return this.localLeft + (this.localWidth / 2);
		}

		set localCenterX(val) {
			this.localLeft = val - (this.localWidth / 2);
		}

		get localCenterY() {
			return this.localTop + (this.localHeight / 2);
		}

		set localCenterY(val) {
			this.localTop  = val - (this.localHeight / 2);
		}

		get centerX() {
			return this.left + (this.width / 2);
		}

		set centerX(val) {
			this.left = val - (this.width / 2);
		}

		get centerY() {
			return this.top + (this.height / 2);
		}

		set centerY(val) {
			this.top = val - (this.height / 2);
		}

		get angle() {
			return this._angle;
		}

		set angle(val) {
			this._angle = val;
			this._updateCssTransform.invoke();
		}

		get degrees() {
			return this._angle / DEG_TO_RAD;
		}

		set degrees(val) {
			this._angle = val * DEG_TO_RAD;
			this._updateCssTransform.invoke();
		}
	}

	const p = Inner.prototype;
	createVectorProperty(p, "localPosition", "localLeft", "localTop");
	createVectorProperty(p, "position", "left", "top");
	createVectorProperty(p, "localDimensions", "localWidth", "localHeight");
	createVectorProperty(p, "dimensions", "width", "height");
	createVectorProperty(p, "localScale", "localScaleX", "localScaleY");
	createVectorProperty(p, "scale", "scaleX", "scaleY");
	createVectorProperty(p, "localCenter", "localCenterX", "localCenterY");
	createVectorProperty(p, "center", "centerX", "centerY");

	return Inner;
})();
