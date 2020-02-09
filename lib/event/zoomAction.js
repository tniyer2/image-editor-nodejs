
import { addEvent } from "./util";
import Listener from "./listener";

export default class ZoomAction {
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
