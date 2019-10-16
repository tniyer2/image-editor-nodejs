
import { extend } from "../util/util";
import { addEvent } from "./util";
import Listener from "./listener";
import EventPromise from "./eventPromise";

const DEFAULTS = {
	loop: true,
	exitOnMouseLeave: true, 
	mouseMoveAlways: false,
	mouseLeaveAlways: false,
	mouseMoveMinEvents: 3,
	condition: (evt) => evt.button === 0
};

function isMouseOver(elm, evt) {
	const topMostElm = document.elementFromPoint(evt.clientX, evt.clientY);
	return elm === topMostElm || elm.contains(topMostElm);
}

export default class MouseAction {
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
			this._mouseLeavePromise = new EventPromise(
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

		this._mouseDownPromise = new EventPromise(
			this._target, "mousedown", triggerOnMouseOver,
			{ condition: this._options.condition });

		this._mouseMovePromise = new EventPromise(
			this._bounds, "mousemove", triggerOnMouseOver,
			{ minEvents: this._options.mouseMoveMinEvents });

		this._mouseUpPromise   = new EventPromise(
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
}
