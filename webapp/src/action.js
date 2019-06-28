
import Enforcer from "./enforcer";
import { warnIfError, forEach } from "./utility";
import { Vector2 } from "./geometry";
import { addOptions } from "./options";
import { addEvent } from "./event";
import { Listener, PromiseListener } from "./listener";

export { Action, ActionHandler, ActionPiper, 
		 MouseAction, MouseActionHandler, MouseActionPiper };

class Action {
	constructor() {
		const ef = new Enforcer(Action, this, "Action");
		ef.enforceAbstract();
		ef.enforceFunctions(["dispose"]);
	}
}

class ActionHandler {
	constructor(eventNames, functionNames) {
		let ef = new Enforcer(ActionHandler, this, "ActionHandler");
		ef.enforceAbstract();
		ef.enforceFunctions(functionNames);

		this._eventNames = eventNames;
		functionNames.forEach((f) => {
			this[f] = this[f].bind(this);
		});
		this._functionNames = functionNames;
	}

	handle(action) {
		forEach(this._eventNames, this._functionNames, (e, n) => {
			action[e].addListener(this[n]);
		});
	}

	stopHandling(action) {
		forEach(this._eventNames, this._functionNames, (e, n) => {
			action[e].removeListener(this[n]);
		});	
	}
}

class ActionPiper extends Action {
	constructor(inputNames, outputNames) {
		super();

		new Enforcer(ActionPiper, this, "ActionPiper").enforceAbstract();

		this._inputNames = inputNames;
		this._outputNames = outputNames || inputNames;

		this._outputNames.forEach((n) => {
			addEvent(this, n, "_" + n);
		});

		this._removeFunctions = [];
	}

	dispose() {
		this._removeFunctions.forEach((f) => {
			f();
		});
		this._removeFunctions = [];
	}

	pipe(action) {
		forEach(this._inputNames, this._outputNames, (i, o) => {
			let a = action[i];
			let l = this._getListener("_" + o);
			a.addListener(l);
			this._removeFunctions.push(() => {
				a.removeListener(l);
			});
		});
	}

	_getListener(eventName) {
		return (...a) => { 
			this[eventName].trigger(...a);
		};
	}
}

const MouseAction = (function(){
	const DEFAULTS = { loop: true, exitOnMouseLeave: false };

	return class extends Action {
		constructor(target, bounds, options) {
			super();

			this._target = target;
			this._bounds = bounds;
			addOptions(this, DEFAULTS, options);

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
			this._mouseMovePromise = new PromiseListener(moveTarget, "mousemove", triggerOnMouseOver);
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
			this._mouseDownPromise.attach().then((evt) => {
				this._chooseClickOrStart(evt);
			}).catch(warnIfError);
		}

		_chooseClickOrStart(mouseDownEvent) {
			Promise.race([this._mouseMovePromise.attach(), this._mouseUpPromise.attach()])
			.then((evt) => {
				this._mouseMovePromise.remove();
				this._mouseUpPromise.remove();

				if (evt.type === this._mouseMovePromise.type) {
					this._onStart.trigger(mouseDownEvent, this._options.get("data"));
					this._onMove.trigger(evt, this._options.get("data"));
					this._mouseMoveListener.attach();
					this._attachEndListeners();
				} else {
					this._onClick.trigger(mouseDownEvent, evt, this._options.get("data"));
					if (this._options.get("loop") === true) {
						this._start();
					}
				}
			}).catch(warnIfError);
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
				this._mouseMoveListener.remove();
			}).then((evt) => {
				this._onEnd.trigger(evt, this._options.get("data"));
				if (this._options.get("loop") === true) {
					this._start();
				}
			}).catch(warnIfError);
		}
	};
})();

class MouseActionHandler extends ActionHandler {
	constructor() {
		let names = MouseAction.eventNames;
		super(names, names.map(n => "_" + n));
		new Enforcer(MouseActionHandler, this, "MouseActionHandler").enforceAbstract();
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
