
import { isNumber, isArray } from "../util/type";
import Lock from "../util/lock";
import { addEvent } from "../event/util";

export { Command, MultiCommand, CommandStack };

class Command {
	constructor(type) {
		if (type !== Command.IMMEDIATE &&
			type !== Command.CONTINUOUS) {
			throw new Error("Invalid argument.");
		}

		this._type = type;
		this._stack = null;
		this._open = true;
		this._done = false;
		this._firstTime = true;

		addEvent(this, "onDone");
		addEvent(this, "onUndo");
		addEvent(this, "onRedo");
	}

	static get IMMEDIATE() {
		return 0;
	}

	static get CONTINUOUS() {
		return 1;
	}

	get type() {
		return this._type;
	}

	get open() {
		return this._open;
	}

	get done() {
		return this._done;
	}

	get stack() {
		return this._stack;
	}

	set stack(val) {
		if (!(val instanceof CommandStack)) {
			throw new Error("Invalid argument.");
		} else if (this._stack) {
			throw new Error("Property already set.");
		}

		this._stack = val;
	}

	get locked() {
		return this._stack && this._stack.lock.locked;
	}

	get canUndo() {
		return !this.locked && !this._open && this._done;
	}

	get canRedo() {
		return !this.locked && !this._open && !this._done;
	}

	execute(...args) {
		if (this.locked) {
			return;
		} else if (!this._open) {
			throw new Error("Invalid state. Command is closed.");
		}

		this._execute(...args);
		this._firstTime = false;
		if (this._type === Command.IMMEDIATE) {
			this._open = false;
			this._done = true;
			this._onDone.trigger();
		}
	}

	close() {
		if (this.locked) {
			return;
		} else if (this._type === Command.IMMEDIATE) {
			throw new Error("Cannot call close on an immediate Command");
		} else if (!this._open) {
			throw new Error("Invalid state. Command is closed.");
		}

		this._close();
		this._open = false;
		this._done = true;
		this._onDone.trigger();
	}

	undo() {
		if (this.locked) {
			return;
		} else if (this._open) {
			throw new Error("Invalid state. Command is open.");
		} else if (!this._done) {
			throw new Error("Invalid state. Command is not done.");
		}

		this._undo();
		this._done = false;
		this._onUndo.trigger();
	}

	redo() {
		if (this.locked) {
			return;
		} else if (this._open) {
			throw new Error("Invalid state. Command is open.");
		} else if (this._done) {
			throw new Error("Invalid state. Command is done.");	
		}

		this._redo();
		this._done = true;
		this._onRedo.trigger();
	}
}

class MultiCommand extends Command {
	constructor(commands) {
		if (!isArray(commands) || !commands.length ||
			!commands.every(c => c instanceof Command)) {
			throw new Error("Invalid argument.");
		}

		const allImmediate = commands.every(c => c.type === Command.IMMEDIATE);
		const type = allImmediate ? Command.IMMEDIATE : Command.CONTINUOUS;
		super(type);

		this._commands = commands;
	}

	get canUndo() {
		return !this.locked && this._commands.every(
			c => !c.open && c.done);		
	}

	get canRedo() {
		return !this.locked && this._commands.every(
			c => !c.open && !c.done);		
	}

	_execute(...args) {
		if (this.locked) return;

		this._commands.forEach((c) => {
			if (c.open) {
				c.execute(...args);
			}
		});
	}

	_close() {
		if (this.locked) return;

		this._commands.forEach((c) => {
			if (c.open) {
				c.close();
			}
		});
	}

	_undo() {
		if (this.locked) return;

		this._commands.forEach((c) => {
			c.undo();
		});
	}

	_redo() {
		if (this.locked) return;

		this._commands.forEach((c) => {
			c.redo();
		});
	}
}

class CommandStack {
	constructor(limit) {
		this._limit = isNumber(limit) ? limit : Infinity;

		this._stack = [];
		this._currentIndex = -1;
		addEvent(this, "onChange");
		this.lock = new Lock();
	}

	get current() {
		return this._stack[this._currentIndex] || null;
	}

	get next() {
		return this._stack[this._currentIndex+1] || null;
	}

	get canUndo() {
		const c = this.current;
		return !this.lock.locked && c && c.canUndo;
	}

	get canRedo() {
		const n = this.next,
			  c = this.current;
		return !this.lock.locked && n && n.canRedo && !(c && c.open);
	}

	add(command) {
		if (this.lock.locked) {
			// temporary fix, this is a bug
			command.stack = this;
			return;
		} else if (this.current && this.current.open) {
			throw new Error("Invalid state. The current Command is open.");
		}

		command.stack = this;

		const start = this._stack.length >= this._limit ? 1 : 0;
		this._stack = this._stack.slice(start, this._currentIndex+1);
		this._stack.push(command);
		this._currentIndex += 1;

		command.onDone.addListener(() => {			
			this._onChange.trigger();
		});
		command.onUndo.addListener(() => {
			this._currentIndex -= 1;
			this._onChange.trigger();
		});
		command.onRedo.addListener(() => {
			this._currentIndex += 1;
			this._onChange.trigger();
		});
	}

	undo() {
		if (this.canUndo) {
			this.current.undo();
		}
	}

	redo () {
		if (this.canRedo) {
			this.next.redo();
		}
	}
}
