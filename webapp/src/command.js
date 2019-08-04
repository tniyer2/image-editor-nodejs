
import { isNumber } from "./type";
import { addEvent } from "./event";
import Lock from "./lock";

export { Command, MultiCommand, CommandStack };

const Command = (function(){
	const invalidStateMessage = "Cannot invoke this operation when another operation is executing.",
		  notClosed = n => "Cannot call " + n + " if this Command is not closed.",
		  invalidDone = (n, d) => "Cannot call " + n + " if this Command is " + (d ? "" : "not ") + "done.";

	return class {
		constructor(type) {
			if (type === Command.IMMEDIATE) {/*ignore*/}
			else if (type === Command.CONTINUOUS) {/*ignore*/}
			else {
				throw new Error("Invalid argument.");
			}

			this.type = type;
			this._stack = null;
			this.open = true;
			this.executing = false;
			this.done = false;
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

		execute(...args) {
			if (this.locked) {
				return;
			} else if (this.executing) {
				throw new Error(invalidStateMessage);
			} else if (!this.open) {
				throw new Error("Cannot call execute, this Command is closed.");
			}

			this.executing = true;
			this._execute(...args);
			this.executing = false;
			this._firstTime = false;
			if (this.type === Command.IMMEDIATE) {
				this.open = false;
				this.done = true;
				this._onDone.trigger();
			}
		}

		close() {
			if (this.locked) {
				return;
			} else if (this.type === Command.IMMEDIATE) {
				throw new Error("Cannot call close on an immediate Command");
			} else if (this.executing) {
				throw new Error(invalidStateMessage);
			} else if (!this.open) {
				throw new Error("Cannot call close, this Command is already closed.");
			}

			this.executing = true;
			this._close();
			this.executing = false;
			this.open = false;
			this.done = true;
			this._onDone.trigger();
		}

		get canUndo() {
			return !this.locked && !this.executing
				&& !this.open && this.done;
		}

		undo() {
			if (this.locked) {
				return;
			} else if (this.executing) {
				throw new Error(invalidStateMessage);
			} else if (this.open) {
				throw new Error(notClosed("undo"));
			} else if (!this.done) {
				throw new Error(invalidDone("undo", false));	
			}

			this.executing = true;
			this._undo();
			this.executing = false;
			this.done = false;
			this._onUndo.trigger();
		}

		get canRedo() {
			return !this.locked && !this.executing
				&& !this.open && !this.done;
		}

		redo() {
			if (this.locked) {
				return;
			} else if (this.executing) {
				throw new Error(invalidStateMessage);
			} else if (this.open) {
				throw new Error(notClosed("redo"));
			} else if (this.done) {
				throw new Error(invalidDone("redo", true));	
			}

			this.executing = true;
			this._redo();
			this.executing = false;
			this.done = true;
			this._onRedo.trigger();
		}
	};
})();

class MultiCommand extends Command {
	constructor(commands) {
		if (!commands.constructor === Array || !commands.length) {
			console.log("invalid commands:", commands);
		}

		const allImmediate = commands.every(c => c.type === Command.IMMEDIATE);
		const type = allImmediate ? Command.IMMEDIATE : Command.CONTINUOUS;
		super(type);

		this._commands = commands;
	}

	get canUndo() {
		return !this.locked && this._commands.every(
			c => !c.executing && !c.open && c.done);		
	}

	get canRedo() {
		return !this.locked && this._commands.every(
			c => !c.executing && !c.open && !c.done);		
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
	
	add(command) {
		if (this.lock.locked) {
			command.stack = this;
			return;
		} else if (this.current) {
			if (this.current.open) {
				throw new Error("Cannot add Command, current Command is not closed.");
			} else if (this.current.executing) {
				throw new Error("Cannot add Command, current Command is executing.");
			}
		}

		// console.log("adding command:", command.constructor.name);
		command.stack = this;

		let start = this._stack.length >= this._limit ? 1 : 0;
		this._stack = this._stack.slice(start, this._currentIndex + 1);
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

	get current() {
		return this._stack[this._currentIndex] || null;
	}

	get next() {
		return this._stack[this._currentIndex + 1] || null;
	}

	get canUndo() {
		const c = this.current;
		return !this.lock.locked && c && c.canUndo;
	}

	get canRedo() {
		const n = this.next,
			  c = this.current;
		return !this.lock.locked && n && n.canRedo && !(c && (c.open || c.executing));
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
