
import { bindFunctions, forEach } from "./utility";
import { Vector2 } from "./geometry";
import { addOptions } from "./options";
import { addEvent } from "./event";
import { Listener, PromiseListener } from "./listener";

export { Action, ActionHandler, ActionPiper, 
		 MouseAction, MouseActionHandler, MouseActionPiper };

class Action {
	constructor() {}
	dispose() {}
}

class ActionHandler {
	constructor(en, ln) {
		this._eventNames = en;

		bindFunctions(this, ln, true);
		this._listenerNames = ln;
	}

	handle(action) {
		forEach(this._eventNames, this._listenerNames, (e, l) => {
			const f = this[l];
			if (f) {
				action[e].addListener(f);
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
	constructor(ien, oen) {
		super();

		this._inputEventNames = ien;
		this._outputEventNames = oen || ien;

		this._outputEventNames.forEach((n) => {
			addEvent(this, n);
		});

		this._cleanUpFunctions = [];
	}

	dispose() {
		this._cleanUpFunctions.forEach((dispose) => {
			dispose();
		});
		this._cleanUpFunctions = [];
	}

	pipe(action) {
		forEach(this._inputEventNames, 
				this._outputEventNames, 
				(i, o) => {
					const rl = this["_" + o].linkTo(action[i]);
					this._cleanUpFunctions.push(rl);
				});
	}
}

const MouseAction = (function(){
	const DEFAULTS =
	{ loop: true, exitOnMouseLeave: true, 
	  mouseMoveAlways: false, mouseLeaveAlways: false };

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

		dispose() {
			this._listeners.forEach((l) => {
				l.remove();
			});
		}

		_isMouseOver(elm, evt) {
			let topMostElm = document.elementFromPoint(evt.clientX, evt.clientY);
			return elm === topMostElm || elm.contains(topMostElm);
		}

		_initListeners() {
			this._listeners = [];

			let upTarget, moveTarget;
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

				upTarget = moveTarget = this._target;
			}
			else {
				upTarget = document;
				moveTarget = this._bounds;
			}

			const triggerOnMouseOver = (evt, l, resolve) => {
				if (this._isMouseOver(l.target, evt)) resolve(evt);
			};
			this._mouseDownPromise = new PromiseListener(this._target, "mousedown", triggerOnMouseOver);
			this._mouseMovePromise = new PromiseListener(moveTarget, "mousemove", triggerOnMouseOver, 
			{ minEvents: 3 });
			this._mouseUpPromise   = new PromiseListener(upTarget, "mouseup", triggerOnMouseOver);
			this._listeners.push(this._mouseDownPromise);
			this._listeners.push(this._mouseMovePromise);
			this._listeners.push(this._mouseUpPromise);

			this._mouseMoveListener = new Listener(moveTarget, "mousemove", (evt, l) => {
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
				this._chooseClickOrStart(evt);
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

class MouseActionHandler extends ActionHandler {
	constructor() {
		const names = MouseAction.eventNames;
		super(names, names.map(n => "_" + n));
	}

	_getMousePosition(evt) {
		return new Vector2(evt.clientX, evt.clientY);
	}
}

class MouseActionPiper extends ActionPiper {
	constructor() {
		super(MouseAction.eventNames);
	} 
}
