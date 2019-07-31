
import { bindFunctions, forEach } from "./utility";
import { Vector2 } from "./geometry";
import { addOptions } from "./options";
import { addEvent } from "./event";
import { Listener, PromiseListener } from "./listener";

export { MouseAction, KeyAction, 
		 UserActionHandler, UserActionPiper,
		 ZoomAction, ZoomActionHandler };

class Action {
	constructor() {
		this._listeners = [];
	}

	dispose() {
		this._listeners.forEach((l) => {
			l.remove();
		});
	}
}

class ActionHandler {
	constructor(en, ln) {
		this._eventNames = en;

		if (!ln) {
			ln = en.map(n => "_" + n);
		}
		bindFunctions(this, ln, true);
		this._listenerNames = ln;
	}

	handle(action) {
		forEach(this._eventNames, this._listenerNames, (e, l) => {
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
		forEach(this._eventNames, this._listenerNames, (e, l) => {
			const f = this[l];
			if (f) {
				action[e].removeListener(f);
			}
		});
	}
}

class ActionPiper extends Action {
	constructor(en) {
		super();

		en.forEach((e) => {
			addEvent(this, e);
		});
		this._eventNames = en;

		this._cleanUpFunctions = [];
	}

	dispose() {
		this._cleanUpFunctions.forEach((dispose) => {
			dispose();
		});
		this._cleanUpFunctions = [];
	}

	pipe(action) {
		this._eventNames.forEach((n) => {
			const event = action[n];
			if (event) {
				const dispose = this["_" + n].linkTo(event);
				this._cleanUpFunctions.push(dispose);
			}
		});
	}
}

const MouseAction = (function(){
	const DEFAULTS =
	{ loop: true, exitOnMouseLeave: true, 
	  mouseMoveAlways: false, mouseLeaveAlways: false,
	  condition: (evt) => evt.button === 0 };

	return class extends Action {
		constructor(target, bounds, options) {
			super();

			this._target = target;
			this._bounds = bounds;
			addOptions(this, DEFAULTS, options);
			this._mouseMoveAlways = this._options.get("mouseMoveAlways");

			MouseAction.eventNames.forEach((n) => {
				addEvent(this, n);
			});

			this._initListeners();
			this._start();
		}

		static get eventNames() {
			return ["onClick", "onStart", "onMove", "onEnd"];	
		}

		_isMouseOver(elm, evt) {
			let topMostElm = document.elementFromPoint(evt.clientX, evt.clientY);
			return elm === topMostElm || elm.contains(topMostElm);
		}

		_initListeners() {
			let upTarget;
			let upCapture;
			if (this._options.get("exitOnMouseLeave")) {
				this._mouseLeavePromise = new PromiseListener(this._bounds, "mouseleave", (evt, l, resolve) => {
					resolve(evt);
				});
				this._listeners.push(this._mouseLeavePromise);

				if (this._options.get("mouseLeaveAlways")) {
					this._mouseLeaveListener = new Listener(this._bounds, "mouseleave", (evt, l) => {
						this._onEnd.trigger(evt, this._options.get("data"));
					});
					this._mouseLeaveListener.attach();
					this._listeners.push(this._mouseLeaveListener);
				}

				upTarget = this._bounds;
				upCapture = false;
			} else {
				upTarget = document;
				upCapture = true;
			}

			const triggerOnMouseOver = (evt, l, resolve) => {
				if (this._isMouseOver(l.target, evt)) resolve(evt);
			};
			this._mouseDownPromise = new PromiseListener(
				this._target, "mousedown", triggerOnMouseOver);
			this._mouseMovePromise = new PromiseListener(
				this._bounds, "mousemove", triggerOnMouseOver, 
				{ minEvents: 3 });
			this._mouseUpPromise   = new PromiseListener(
				upTarget, "mouseup", triggerOnMouseOver,
				{ eventOptions: upCapture });
			this._listeners.push(this._mouseDownPromise);
			this._listeners.push(this._mouseMovePromise);
			this._listeners.push(this._mouseUpPromise);

			this._mouseMoveListener = new Listener(this._bounds, "mousemove", (evt, l) => {
				if (this._isMouseOver(l.target, evt)) {
					this._onMove.trigger(evt, this._options.get("data"));
				}
			});
			this._listeners.push(this._mouseMoveListener);
		}

		_start() {
			if (this._mouseMoveAlways && !this._mouseMoveListener.attached) {
				this._mouseMoveListener.attach();
			}

			this._mouseDownPromise.attach().then((evt) => {
				const f = this._options.get("condition", false);
				if (!f || f(evt)) {
					this._chooseClickOrStart(evt);
				} else {
					this._start();
				}
			}).catch(console.warn);
		}

		_chooseClickOrStart(mouseDownEvent) {
			Promise.race([this._mouseMovePromise.attach(), this._mouseUpPromise.attach()])
			.then((evt) => {
				this._mouseMovePromise.remove();
				this._mouseUpPromise.remove();

				if (evt.type === this._mouseMovePromise.type) {
					this._onStart.trigger(mouseDownEvent, this._options.get("data"));
					this._onMove.trigger(evt, this._options.get("data"));
					if (!this._mouseMoveAlways) {
						this._mouseMoveListener.attach();
					}
					this._attachEndListeners();
				} else {
					this._onClick.trigger(mouseDownEvent, evt, this._options.get("data"));
					if (this._options.get("loop") === true) {
						this._start();
					}
				}
			}).catch(console.warn);
		}

		_attachEndListeners() {
			let p;
			if (this._options.get("exitOnMouseLeave")) {
				p = Promise.race([this._mouseUpPromise.attach(), this._mouseLeavePromise.attach()])
					.finally(() => {
						this._mouseUpPromise.remove();
						this._mouseLeavePromise.remove();
					});
			}
			else {
				p = this._mouseUpPromise.attach();
			}

			p.finally(() => {
				if (!this._mouseMoveAlways) {
					this._mouseMoveListener.remove();
				}
			}).then((evt) => {
				this._onEnd.trigger(evt, this._options.get("data"));
				if (this._options.get("loop") === true) {
					this._start();
				}
			}).catch(console.warn);
		}
	};
})();

class KeyAction extends Action {
	constructor(target, options) {
		super();

		this._target = target;
		addOptions(this, options);

		KeyAction.eventNames.forEach((e) => {
			addEvent(this, e);
		});

		this._initListeners();
		this._start();
	}

	static get eventNames() {
		return ["onKeyDown", "onKeyUp"];
	}

	_initListeners() {
		this._keyDownListener = new Listener(this._target, "keydown", (e) => {
			this._onKeyDown.trigger(e, this._options.get("data"));
		});
		this._keyUpListener = new Listener(this._target, "keyup", (e) => {
			this._onKeyUp.trigger(e, this._options.get("data"));
		});

		this._listeners.push(this._keyDownListener, this._keyUpListener);
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

class ZoomAction extends Action {
	constructor(target) {
		super();

		this._target = target;

		addEvent(this, "onZoom");

		this._initListeners();
		this._start();
	}

	static get eventNames() {
		return ["onZoom"];
	}

	_initListeners() {
		this._wheelListener = new Listener(this._target, "wheel",
		(evt) => {
			this._onZoom.trigger(evt);
		}, { eventOptions: { passive: true }});
		this._listeners.push(this._wheelListener);
	}

	_start() {
		this._wheelListener.attach();
	}
}

class ZoomActionHandler extends ActionHandler {
	constructor() {
		super(ZoomAction.eventNames);
	}
}
