
import { isFunction, isArray } from "./type";
import { MultiCommand } from "./command";
import { UserActionHandler } from "./action";

export default class extends UserActionHandler {
	constructor(infos) {
		super();

		if (typeof infos === "object") {
			this._boxInfos = [infos];
		} else if (isArray(infos) && infos.every(g => typeof g === "object")) {
			this._boxInfos = infos;
		} else {
			throw new Error("Invalid argument.");
		}
	}

	_onStart(evt) {
		this._commands = this._boxInfos.map((g) => {
			const boxes = isFunction(g.boxes) ? g.boxes() : g.boxes;

			let c = this._getCommand(boxes, evt);
			if (isArray(c)) {
				c = new MultiCommand(c);
			}

			const stack = isFunction(g.stack) ? g.stack() : g.stack;
			if (stack) {
				stack.add(c);
			}

			return c;
		});
	}

	_onMove(evt) {
		if (!this._commands) return;

		const args = this._getArguments(evt);
		this._commands.forEach((c) => {
			c.execute(...args);
		});
	}

	_onEnd(evt) {
		if (!this._commands) return;

		this._commands.forEach((c) => {
			c.close();
		});
		this._commands = null;
	}
}
