
import { toPrecision, addGetter, addGetterRaw, extend, isUdf } from "./utility";

export { Vector2, Box };

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
    	return this.multiply(-1);
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

class Box {
	constructor(element, bounds) {
		this._element = element;
		this._bounds = bounds;
		this._angle = 0;
	}

	get element() {
		return this._element;
	}

	get bounds() {
		return this._bounds;
	}

	set bounds(value) {
		this._bounds = value;
	}

	static getOrigin(elm) {
		const b = elm.getBoundingClientRect();
		return new Vector2(b.left, b.top);
	}

	get origin() {
		if (this._bounds) {
			return Box.getOrigin(this._bounds);
		} else {
			return Vector2.zero;
		}
	}

	get rect() {
		const e = this._element.getBoundingClientRect(),
			  origin = this.origin,
			  r = {};

		r.top 	 = e.top 	- origin.y;
		r.bottom = e.bottom - origin.y;
		r.left 	 = e.left 	- origin.x;
		r.right  = e.right 	- origin.x;
		r.width  = e.width;
		r.height = e.height;

		return r;
	}

	get top() {
		return this._element.offsetTop;
	}

	set top(value) {
		this._element.style.top = value + "px";	
	}

	get left() {
		return this._element.offsetLeft;
	}

	set left(value) {
		this._element.style.left = value + "px";	
	}

	get position() {
		return new Vector2(this.left, this.top);
	}

	set position(value) {
		this.left = value.x;
		this.top = value.y;
	}

	get width() {
		return this._element.offsetWidth;
	}

	set width(value) {
		this._element.style.width = value + "px";
	}

	get height() {
		return this._element.offsetHeight;
	}

	set height(value) {
		this._element.style.height = value + "px";
	}

	get dimensions() {
		return new Vector2(this.width, this.height);
	}

	set dimensions(value) {
		this.width = value.x;
		this.height = value.y;
	}

	get center() {
		return new Vector2(this.left + (this.width / 2), this.top + (this.height / 2));
	}

	set center(value) {
		this.left = value.x - (this.width / 2);
		this.top  = value.y - (this.height / 2);
	}

	get angle() {
		return this._angle;
	}

	set angle(value) {
		this._angle = value;
		this._setRotate(value / DEG_TO_RAD);
	}

	get degrees() {
		return this._angle / DEG_TO_RAD;
	}

	set degrees(value) {
		this._angle = value * DEG_TO_RAD;
		this._setRotate(value);
	}

	_setRotate(degrees) {
		this._element.style.transform = "rotate(" + degrees + "deg)";
	}
}
