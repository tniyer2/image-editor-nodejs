
import { addGetter, removeItem, extend, isUdf } from "./utility";

export { MyEvent, addEvent, PromiseListener, MouseAction, MouseActionManager };

class MyEventInterface {
	constructor(queue)
	{
		this._queue = queue;
	}

	addListener(listener)
	{
		this._queue.push(listener);
	}

	removeListener(listener)
	{
		removeItem(this._queue, listener);
	}
}

class MyEvent {
	constructor()
	{
		this._queue = [];
		this._interface = new MyEventInterface(this._queue);
		addGetter(this, "interface");
	}

	trigger()
	{
		let args = arguments;
		this._queue.forEach((f) => {
			f.apply(null, args);
		});
	}
}

function addEvent(obj, publicName, privateName)
{
	if (isUdf(privateName))
	{
		privateName = "_" + publicName;
	}

	obj[privateName] = new MyEvent();
	Object.defineProperty(obj, publicName, {
		get: () => {
			return obj[privateName].interface;
		}
	});
}

class PromiseListener {
	constructor(target, type, listener, options)
	{
		addGetter(this, "target", target);
		addGetter(this, "type", type);
		this._listener = listener;
		this._options = options;
		addGetter(this, "attached", false);
	}

	attach()
	{
		if (this._attached)
		{
			throw new Error("Cannot call attach again until you call remove.");
		}
		else
		{
			this._attached = true;
			return new Promise((resolve, reject) => {
				const resolveWrapper = (...args) => {
					this.remove();
					resolve(...args);
				};
				const rejectWrapper = (...args) => {
					this.remove();
					reject(...args);
				};
				this._wrapper = (evt) => {
					this._listener(evt, this, resolveWrapper, rejectWrapper);
				};
				this._target.addEventListener(this._type, this._wrapper, this._options);
			});
		}
	}

	remove()
	{
		if (this._attached)
		{
			this._attached = false;
			this._target.removeEventListener(this._type, this._wrapper, this._options);
		}
	}
}

const MouseAction = (function(){
	const DEFAULTS = { loop: true, exitOnMouseLeave: false };

	function isMouseOver(elm, mouseEvent)
	{
		let topMostElm = document.elementFromPoint(mouseEvent.clientX, mouseEvent.clientY);
		return elm === topMostElm || elm.contains(topMostElm);
	}

	return class {
		constructor(target, bounds, options)
		{
			this._target = target;
			this._bounds = bounds;
			this._options = extend(DEFAULTS, options);
			addEvent(this, "onClick");
			addEvent(this, "onStart");
			addEvent(this, "onMove");
			addEvent(this, "onExit");

			this._initListeners();
			this._start();
		}

		_initListeners()
		{
			let mouseUpTarget;
			let mouseMoveTarget;
			if (this._options.exitOnMouseLeave)
			{
				this._mouseLeave = new PromiseListener(this._bounds, "mouseleave", (evt, l, resolve) => {
					resolve(evt);
				});
				mouseUpTarget = this._target;
				mouseMoveTarget = this._target;
			}
			else
			{
				mouseUpTarget = document;
				mouseMoveTarget = this._bounds;
			}

			this._mouseDown = new PromiseListener(this._target, "mousedown", (evt, l, resolve) => {
				if (isMouseOver(l.target, evt)) {
					resolve(evt);
				}
			});
			this._mouseMove = new PromiseListener(mouseMoveTarget, "mousemove", (evt, l, resolve) => {
				if (isMouseOver(l.target, evt)) {
					resolve(evt);
				}
			});
			this._mouseMove2 = new PromiseListener(mouseMoveTarget, "mousemove", (evt, l) => {
				if (isMouseOver(l.target, evt)) {
					this._onMove.trigger(evt);
				}
			});

			this._mouseUp = new PromiseListener(mouseUpTarget, "mouseup", (evt, l, resolve) => {
				if (isMouseOver(l.target, evt)) {
					resolve(evt);	
				}
			});
		}

		_start()
		{
			this._mouseDown.attach().then((evt) => {
				this._decide(evt);
			});
		}

		_decide(mouseDownEvent)
		{
			Promise.race([this._mouseMove.attach(), this._mouseUp.attach()])
			.then((evt) => {
				this._mouseMove.remove();
				this._mouseUp.remove();

				if (evt.type === this._mouseMove.type) {
					this._onStart.trigger(mouseDownEvent);
					this._onMove.trigger(evt);
					this._attachListeners();
				} else {
					this._onClick.trigger(mouseDownEvent, evt);
					if (this._options.loop === true)
					{
						this._start();
					}
				}
			});
		}

		_attachListeners()
		{	
			this._mouseMove2.attach();

			let p;
			if (this._options.exitOnMouseLeave)
			{
				p = Promise.race([this._mouseUp.attach(), this._mouseLeave.attach()])
					.finally(() => {
						this._mouseMove2.remove();
						this._mouseUp.remove();
						this._mouseLeave.remove();
					});
			}
			else
			{
				p = this._mouseUp.attach().finally(() => {
					this._mouseMove2.remove();
				});
			}

			p.then((evt) => {
				this._onExit.trigger(evt);
				if (this._options.loop === true)
				{
					this._start();
				}
			}).catch((err) => {
				if (err) {
					console.warn(err);
				}
			});
		}
	};
})(); 

class MouseActionManager {
	constructor()
	{
		addEvent(this, "onClick");
		addEvent(this, "onStart");
		addEvent(this, "onMove");
		addEvent(this, "onExit");
	}

	add(action, data)
	{
		this._pipeEvent(action, data, "onClick");
		this._pipeEvent(action, data, "onStart");
		this._pipeEvent(action, data, "onMove");
		this._pipeEvent(action, data, "onExit");
	}

	_pipeEvent(action, data, event1, event2)
	{
		if (isUdf(event2))
		{
			event2 = "_" + event1;
		}

		action[event1].addListener((...args) => {
			this[event2].trigger(data, ...args);
		});
	}
}
