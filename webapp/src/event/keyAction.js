
import { extend } from "../util/util";
import { addEvent } from "./util";
import Listener from "./listener";

export default class KeyAction {
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
