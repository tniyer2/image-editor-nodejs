
import { isUdf, isFunction,
		 isObjectLiteral, isArray } from "../util/type";
import { MultiCommand, CommandStack } from "../core/command";
import Box from "../vector/box";
import { UserActionHandler } from "../event/userActionUtil";

function isValidGroup(g) {
	return isObjectLiteral(g) &&
		(isFunction(g.boxes) || isValidBoxes(g.boxes)) &&
			(!("stack" in g) || g.stack instanceof CommandStack);
}

function isValidBoxes(boxes) {
	return isArray(boxes) && 
		boxes.every(b => b instanceof Box);
}

function getBoxes(group) {
	if (isFunction(group.boxes)) {
		const boxes = group.boxes();
		if (!isValidBoxes(boxes)) {
			throw new Error("Invalid argument.");
		}
		return boxes;
	} else {
		return group.boxes;
	}
}

function addCommandToStack(group, command) {
	const stack = group.stack;
	if (stack instanceof CommandStack) {
		stack.add(command);
	} else if (!isUdf(stack) && stack !== null) {
		throw new Error("Invalid State.");
	}
}

export default class extends UserActionHandler {
	constructor(groups) {
		super();

		if (isArray(groups) && groups.every(g => isValidGroup(g))) {
			this._groups = groups.map(a => Object.assign({}, a));
		} else if (isValidGroup(groups)) {
			this._groups = [groups];
		} else {
			throw new Error("Invalid argument.");
		}
	}

	_onStart(evt) {
		this._commands = this._groups.map((g) => {
			const boxes = getBoxes(g);
			if (!boxes.length) {
				return null;
			}

			let c = this._getCommand(boxes, evt);
			if (isArray(c)) {
				c = new MultiCommand(c);
			}

			addCommandToStack(g, c);

			return c;
		}).filter(Boolean);
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
	}
}
