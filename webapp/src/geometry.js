
import { isUdf, isType, addGetterRaw, 
		 addGetter, toPrecision, AddToEventLoop } from "./utility";

export { Vector2, Anchor, Box };

const PRECISION = 12,
	  DEG_TO_RAD = Math.PI / 180,
	  ANGLE_OFFSET = Math.PI / 2;

class Vector2 {
    constructor(x, y) {
        addGetter(this, "x", x);
        addGetter(this, "y", y);
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

    add(v) {
        return new Vector2(this._x + v.x, this._y + v.y);
    }

    subtract(v) {
        return new Vector2(this._x - v.x, this._y - v.y);
    }

    _parseFactor(a) {
    	return a instanceof Vector2 ? [a.x, a.y] : [a, a];
    }

    multiply(a) {
    	const [x, y] = this._parseFactor(a);
    	return new Vector2(this._x * x, this._y * y);
    }

    divide(a) {
    	const [x, y] = this._parseFactor(a);
    	return new Vector2(this._x / x, this._y / y);
    }

    negate() {
    	return new Vector2(-this._x, -this._y);
    }

    get sqrMagnitude() {
    	return Math.pow(this._x, 2) + Math.pow(this._y, 2);
    }

    get magnitude() {
    	return Math.sqrt(this.sqrMagnitude);	
    }

    normalize() {
    	const m = this.magnitude;
    	return new Vector2(this._x / m, this._y / m);
    }

    static get degToRad() {
    	return DEG_TO_RAD;
    }

    static get angleOffset() {
    	return ANGLE_OFFSET;
    }

    get angle() {
    	return Math.atan2(this._y, this._x);
    }

    dot(v) {
    	return (this._x * v.x) + (this._y * v.y);
    }

	// a should be in radians
    rotate(a) {
    	const cs = Math.cos(a),
    		  sn = Math.sin(a);
		let px = (this._x * cs) - (this._y * sn),
    		py = (this._x * sn) + (this._y * cs);
    	px = toPrecision(px, PRECISION);
    	py = toPrecision(py, PRECISION);
    	return new Vector2(px, py);
    }

    map(f) {
    	return new Vector2(f(this._x), f(this._y));
    }
}

function createVectorProperty(obj, publicName, xName, yName, get=true, set=true) {
	const info = {};
	if (get) {
		info.get = () => {
			return new Vector2(obj[xName], obj[yName]);
		};
	}
	if (set) {
		info.set = (val) => {
			obj[xName] = val.x;
			obj[yName] = val.y;
		};
	}
	Object.defineProperty(obj, publicName, info);
}

class Anchor {
	constructor(element) {
		this._element = element;
		this._innerBoundingBox = null;
		this._boundingBoxChanged = true;

		createVectorProperty(this, "position", "left", "top", true, false);
		createVectorProperty(this, "dimensions", "width", "height", true, false);
		addGetterRaw(this, "scaleX", 1);
		addGetterRaw(this, "scaleY", 1);
		createVectorProperty(this, "scale", "scaleX", "scaleY", true, false);
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
}

class Box {
	constructor(element, parent) {
		this._element = element;
		if (!isUdf(parent)) {
			this.parent = parent;
		}

		this._angle = 0;
		this._scaleX = 1;
		this._scaleY = 1;

		createVectorProperty(this, "scale", "scaleX", "scaleY");
		createVectorProperty(this, "localPosition", "localLeft", "localTop");
		createVectorProperty(this, "position", "left", "top");
		createVectorProperty(this, "localDimensions", "localWidth", "localHeight");
		createVectorProperty(this, "dimensions", "width", "height");

		this._updateCssTransform = new AddToEventLoop(() => {
			const cssRot = "rotate(" + this.degrees + "deg)";
			const cssScale = "scale(" + this._scaleX + ", " + this._scaleY + ")";
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
		if (!isUdf(this._parent)) {
			throw new Error("parent has already been set");
		} else if (!isType(val, Anchor) && !isType(val, Box)) {
			throw new Error("invalid value for parent: " + val);
		}
		this._parent = val;
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

	toWorldDir(b) {
		return v.multiply(this._parent.scale);
	}

	toLocalPoint(v) {
		return v.subtract(this._parent.position).divide(this._parent.scale);
	}

	toWorldPoint(v) {
		return v.multiply(this._parent.scale).add(this._parent.position);
	}

	get scaleX() {
		return this._scaleX;
	}

	set scaleX(val) {
		this._scaleX = val;
		this._updateCssTransform.invoke();
	}

	get scaleY() {
		return this._scaleY;
	}

	set scaleY(val) {
		this._scaleY = val;
		this._updateCssTransform.invoke();
	}

	get _topDiff() {
		const h = this._element.offsetHeight;
		return (h * (1 - this._scaleY) * 0.5);
	}

	get _leftDiff() {
		const w = this._element.offsetWidth;
		return (w * (1 - this._scaleX) * 0.5);
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
		return this._element.offsetWidth * this._scaleX;
	}

	set localWidth(val) {
		val /= this._scaleX;
		this._element.style.width = val + "px";
	}

	get localHeight() {
		return this._element.offsetHeight * this._scaleY;
	}

	set localHeight(val) {
		val /= this._scaleY;
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

	get localCenter() {
		return new Vector2(this.localLeft + (this.localWidth / 2), 
						   this.localTop + (this.localHeight / 2));
	}

	set localCenter(val) {
		this.localLeft = val.x - (this.localWidth / 2);
		this.localTop  = val.y - (this.localHeight / 2);
	}

	get center() {
		return new Vector2(this.left + (this.width / 2), 
						   this.top + (this.height / 2));
	}

	set center(val) {
		this.left = val.x - (this.width / 2);
		this.top  = val.y - (this.height / 2);
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
