
import { isFunction } from "./type";
import { extend } from "./utility";
import { Vector2 } from "./geometry";
import { addEvent } from "./event";
import { Listener, PromiseListener } from "./listener";

export { MouseAction, KeyAction, 
		 UserActionHandler, UserActionPiper,
		 ZoomAction, ZoomActionHandler };

class ActionHandler {
	constructor(en, ln) {
		this._eventNames = en;

		if (!ln) {
			ln = en.map(n => "_" + n);
		}
		ln.forEach((n) => {
			if (isFunction(this[n])) {
				this[n] = this[n].bind(this);
			}
		});
		this._listenerNames = ln;
	}

	handle(action) {
		this._eventNames.forEach((e, i) => {
			const l = this._listenerNames[i];
			const f = this[l];
			if (f) {
				const a = action[e];
				if (a) {
					a.addListener(f);
				}
			}
		});
	}

	stopHandling(action) {
		this._eventNames.forEach((e, i) => {
			const l = this._listenerNames[i];
			const f = this[l];
			if (f) {
				action[e].removeListener(f);
			}
		});
	}
}

class ActionPiper {
	constructor(en) {
		en.forEach((e) => {
			addEvent(this, e);
		});
		this._eventNames = en;

		this._actions = [];
		this._cleanUpFunctions = [];
	}

	pipe(action) {
		const arr = [];

		this._eventNames.forEach((n) => {
			const event = action[n];
			if (event) {
				const dispose = this["_" + n].linkTo(event);
				arr.push(dispose);
			}
		});

		this._actions.push(action);
		this._cleanUpFunctions.push(arr);
	}

	remove(action)  {
		const i = this._actions.findIndex(a => a === action);
		if (i === -1) {
			throw new Error("Could not find argument 'action' in this._actions");
		}

		this._cleanUpFunctions[i].forEach((f) => {
			f();
		});

		this._actions.splice(i, 1);
		this._cleanUpFunctions.splice(i, 1);
	}

	clear() {
		this._cleanUpFunctions.forEach((arr) => {
			arr.forEach((f) => {
				f();
			});
		});
		this._actions = [];
		this._cleanUpFunctions = [];
	}
}

const MouseAction = (function(){
	const DEFAULTS =
	{ loop: true,
	  exitOnMouseLeave: true, 
	  mouseMoveAlways: false,
	  mouseLeaveAlways: false,
	  condition: (evt) => evt.button === 0 };

	function isMouseOver(elm, evt) {
		const topMostElm = document.elementFromPoint(evt.clientX, evt.clientY);
		return elm === topMostElm || elm.contains(topMostElm);
	}

	return class {
		constructor(target, bounds, options) {
			if (!(target instanceof EventTarget)) {
				throw new Error("Invalid argument.");
			} else if (!(bounds instanceof EventTarget)) {
				throw new Error("Invalid argument.");
			}

			this._target = target;
			this._bounds = bounds;
			this._options = extend(DEFAULTS, options);

			this._listeners = [];
			this._open = false;

			MouseAction.eventNames.forEach((n) => {
				addEvent(this, n);
			});

			this._initListeners();
			this._start();
		}

		static get eventNames() {
			return ["onClick", "onStart", "onMove", "onEnd"];	
		}

		// calling this function results in undefined being thrown as an error
		dispose() {
			this._listeners.forEach((l) => {
				l.remove();
			});

			if (this._open) {
				this._onEnd.trigger(null, this._options.data);
				this._open = false;
			}
		}

		_initListeners() {
			let mouseUpTarget, mouseUpUseCapture;

			if (this._options.exitOnMouseLeave === true) {
				this._mouseLeavePromise = new PromiseListener(
					this._bounds, "mouseleave",
				(evt, resolve) => {
					resolve(evt);
				});

				this._listeners.push(this._mouseLeavePromise);

				if (this._options.mouseLeaveAlways) {
					this._mouseLeaveListener = new Listener(
						this._bounds, "mouseleave",
					(evt) => {
						this._onEnd.trigger(evt, this._options.data);
					});
					this._mouseLeaveListener.attach();

					this._listeners.push(this._mouseLeaveListener);
				}

				mouseUpTarget = this._bounds;
				mouseUpUseCapture = false;
			} else {
				mouseUpTarget = document;
				mouseUpUseCapture = true;
			}

			const triggerOnMouseOver = function(evt, resolve) {
				if (isMouseOver(this.target, evt)) resolve(evt);
			};

			this._mouseDownPromise = new PromiseListener(
				this._target, "mousedown", triggerOnMouseOver,
				{ condition: this._options.condition });

			this._mouseMovePromise = new PromiseListener(
				this._bounds, "mousemove", triggerOnMouseOver,
				{ minEvents: 3 });

			this._mouseUpPromise   = new PromiseListener(
				mouseUpTarget, "mouseup", triggerOnMouseOver,
				{ eventOptions: mouseUpUseCapture });

			const self = this;
			this._mouseMoveListener = new Listener(
				this._bounds, "mousemove",
			function(evt) {
				if (isMouseOver(this.target, evt)) {
					self._onMove.trigger(evt, self._options.data);
				}
			});
			if (this._options.mouseMoveAlways) {
				this._mouseMoveListener.attach();
			}

			this._listeners.push(
				this._mouseDownPromise, this._mouseMovePromise,
				this._mouseUpPromise, this._mouseMoveListener);
		}

		_start() {
			this._mouseDownPromise.attach().then((evt) => {
				this._chooseClickOrStart(evt);
			});
		}

		_chooseClickOrStart(mouseDownEvent) {
			Promise.race([
				this._mouseMovePromise.attach(),
				this._mouseUpPromise.attach() ])
			.then((evt) => {
				this._mouseMovePromise.remove();
				this._mouseUpPromise.remove();

				const data = this._options.data;
				if (evt.type === this._mouseMovePromise.type) {
					this._onStart.trigger(mouseDownEvent, data);
					this._onMove.trigger(evt, data);

					if (!this._options.mouseMoveAlways) {
						this._mouseMoveListener.attach();
					}
					this._addEndListeners();

					this._open = true;
				} else {
					this._onClick.trigger(mouseDownEvent, evt, data);
					if (this._options.loop === true) {
						this._start();
					}
				}
			});
		}

		_addEndListeners() {
			let p;
			if (this._options.exitOnMouseLeave) {
				p = Promise.race([
					this._mouseUpPromise.attach(),
					this._mouseLeavePromise.attach() ])
				.finally((evt) => {
					this._mouseUpPromise.remove();
					this._mouseLeavePromise.remove();
					return evt;
				});
			} else {
				p = this._mouseUpPromise.attach();
			}

			p.finally(() => {
				if (!this._options.mouseMoveAlways) {
					this._mouseMoveListener.remove();
				}
			}).then((evt) => {
				this._onEnd.trigger(evt, this._options.data);
				this._open = false;

				if (this._options.loop === true) {
					this._start();
				}
			});
		}
	};
})();

class KeyAction {
	constructor(target, options) {
		this._target = target;
		this._options = extend(options);

		this._listeners = [];

		KeyAction.eventNames.forEach((e) => {
			addEvent(this, e);
		});

		this._initListeners();
		this._start();
	}

	static get eventNames() {
		return ["onKeyDown", "onKeyUp"];
	}

	dispose() {
		this._listeners.forEach((l) => {
			l.remove();
		});
	}

	_initListeners() {
		const l1 = new Listener(this._target, "keydown", (evt) => {
			this._onKeyDown.trigger(evt, this._options.data);
		});
		const l2 = new Listener(this._target, "keyup", (evt) => {
			this._onKeyUp.trigger(evt, this._options.data);
		});

		this._listeners.push(l1, l2);
	}

	_start() {
		this._listeners.forEach((l) => {
			l.attach();
		});
	}
}

const UserEventNames = MouseAction.eventNames.concat(KeyAction.eventNames);

class UserActionHandler extends ActionHandler {
	constructor() {
		super(UserEventNames);
	}

	_getMousePosition(evt) {
		return new Vector2(evt.clientX, evt.clientY);
	}
}

class UserActionPiper extends ActionPiper {
	constructor() {
		super(UserEventNames);
	}
}

class ZoomAction {
	constructor(target) {
		this._target = target;

		addEvent(this, "onZoom");

		this._initWheelListener();
		this._start();
	}

	static get eventNames() {
		return ["onZoom"];
	}

	dispose() {
		this._wheelListener.remove();
	}

	_initWheelListener() {
		this._wheelListener = new Listener(this._target, "wheel",
		(evt) => {
			this._onZoom.trigger(evt);
		}, { eventOptions: { passive: true }});
	}

	_start() {
		this._wheelListener.attach();
	}
}

class ZoomActionHandler extends ActionHandler {
	constructor() {
		super(ZoomAction.eventNames);
	}

	_getMousePosition(evt) {
		return new Vector2(evt.clientX, evt.clientY);
	}
}
