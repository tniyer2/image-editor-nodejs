
import Enforcer from "./enforcer";
import { addGetter, forEach, removeItem, extend, warnIfError, isUdf } from "./utility";
import { Vector2 } from "./geometry";

export { MyEvent, addEvent, Listener, MouseAction, MouseActionPiper, MouseActionHandler };

const MyEvent = (function(){
	class MyEventInterface {
		constructor(queue) {
			this._queue = queue;
		}

		addListener(l) {
			this._queue.push(l);
		}

		removeListener(l) {
			removeItem(this._queue, l);
		}
	}
	
	return class {
		constructor() {
			this._queue = [];
			let int = new MyEventInterface(this._queue);
			addGetter(this, "interface", int);
		}

		trigger() {
			this._queue.forEach((f) => {
				f.apply(null, arguments);
			});
		}

		triggerWithParams(getParams) {
			this._queue.forEach((f) => {
				const p = getParams();
				if (typeof p !== "object" || p.constructor !== Array) {
					throw new Error("Callback return value must be an array:", p);
				}
				f.apply(null, p);
			});
		}

		clear() {
			this._queue.splice(0, this._queue.length);
		}

		linkTo(a) {
			let n, invalidArgument = false;
			if (!a || typeof a !== "object") {
				invalidArgument = true;
			} else if (a.constructor === MyEventInterface) {
				n = a;
			} else if (a.constructor === MyEvent) {
				n = a.interface;
			} else {
				invalidArgument = true;
			}

			if (invalidArgument) {
				throw new Error("Invalid argument:", a);
			}

			n.addListener((...args) => {
				this.trigger(...args);
			});
		}
	};
})();

function addEvent(obj, publicName, privateName) {
	if (isUdf(privateName)) {
		privateName = "_" + publicName;
	}

	obj[privateName] = new MyEvent();
	Object.defineProperty(obj, publicName, {
		get: () => obj[privateName].interface
	});
}

const Listener = (function(){
	const invalidAttachMessage = "Cannot attach eventListener again until Promise is resolved or eventListener is removed.";

	return class {
		constructor(target, type, listener, options) {
			addGetter(this, "target", target);
			addGetter(this, "type", type);
			this._listener = listener;
			this._options = options;
			addGetter(this, "attached", false);
		}

		attach() {
			if (this._attached) {
				throw new Error(invalidAttachMessage);
			} else {
				let ret = this._attach.apply(this, arguments);
				this._attached = true;
				return ret;
			}
		}

		_attach() {
			this._wrapper = (evt) => {
				this._listener(evt, this);
			};
			this._target.addEventListener(this._type, this._wrapper, this._options);
		}

		remove() {
			if (this._attached) {
				this._remove();
				this._attached = false;
			}
		}

		_remove() {
			this._target.removeEventListener(this._type, this._wrapper, this._options);
		}
	};
})();

class PromiseListener extends Listener {
	_attach() {
		return new Promise((resolve, reject) => {
			const resolveWrapper = (value) => {
				this._reject = null;
				this.remove();
				resolve(value);
			};
			const rejectWrapper = (reason) => {
				this._reject = null;
				this.remove();
				reject(reason);
			};
			this._reject = reject;
			this._wrapper = (evt) => {
				this._listener(evt, this, resolveWrapper, rejectWrapper);
			};
			this._target.addEventListener(this._type, this._wrapper, this._options);
		});
	}

	_remove() {
		this._target.removeEventListener(this._type, this._wrapper, this._options);
		if (this._reject) {
			this._reject();
		}
	}
}

class Action {
	constructor() {
		const ef = new Enforcer(Action, this, "Action");
		ef.enforceAbstract();
		ef.enforceFunctions(["dispose"]);
	}
}

const MouseAction = (function(){
	const DEFAULTS = { loop: true, exitOnMouseLeave: false };

	return class extends Action {
		constructor(target, bounds, options) {
			super();

			this._target = target;
			this._bounds = bounds;
			this._options = extend(DEFAULTS, options);

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
			if (this._options.exitOnMouseLeave) {
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
					this._onMove.trigger(evt, this._options.data);
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
					this._onStart.trigger(mouseDownEvent, this._options.data);
					this._onMove.trigger(evt, this._options.data);
					this._mouseMoveListener.attach();
					this._attachEndListeners();
				} else {
					this._onClick.trigger(mouseDownEvent, evt, this._options.data);
					if (this._options.loop === true) {
						this._start();
					}
				}
			}).catch(warnIfError);
		}

		_attachEndListeners() {
			let p;
			if (this._options.exitOnMouseLeave) {
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
				this._onEnd.trigger(evt, this._options.data);
				if (this._options.loop === true) {
					this._start();
				}
			}).catch(warnIfError);
		}
	};
})();

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

class MouseActionPiper extends ActionPiper {
	constructor() {
		super(MouseAction.eventNames);
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
