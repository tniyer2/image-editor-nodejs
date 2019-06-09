
import Enforcer from "./enforcer";
import { addGetter } from "./utility";
import { addEvent } from "./event";

export { Command, MultiCommand, ToggleLayerCommand, CommandStack };

const Command = (function(){
	const invalidStateMessage = "Cannot invoke this operation when another operation is executing.",
		  notClosed = n => "Cannot call " + n + " if this Command is not closed.",
		  invalidDone = (n, d) => "Cannot call " + n + " if this Command is " + (d ? "" : "not ") + "done.";

	return class {
		constructor(type) {
			let ef = new Enforcer(Command, this, "Command");
			ef.enforceAbstract();
			ef.enforceFunctions(["_execute", "_undo", "_redo"]);
			ef.preventOverride(["execute", "close", "undo", "redo"]);

			if (type === Command.immediate) {/*ignore*/}
			else if (type === Command.continuous) {
				ef.enforceFunctions(["_close"]);
			} else {
				throw new Error("type is not valid.");
			}
			addGetter(this, "type", type);

			addGetter(this, "open", true);
			addGetter(this, "executing", false);
			addGetter(this, "done", false);
			this._firstTime = true;

			addEvent(this, "onDone");
			addEvent(this, "onUndo");
			addEvent(this, "onRedo");
		}

		static get immediate() {
			return 0;
		}

		static get continuous() {
			return 1;
		}

		execute(...args) {
			if (this._executing) {
				throw new Error(invalidStateMessage);
			} else if (!this._open) {
				throw new Error("Cannot call execute, this Command is closed.");
			}

			this._executing = true;
			this._execute(...args);
			this._executing = false;
			this._firstTime = false;
			if (this._type === Command.immediate) {
				this._open = false;
				this._done = true;
				this._onDone.trigger();
			}
		}

		close() {
			if (this._type === Command.continuous) {
				if (this._executing) {
					throw new Error(invalidStateMessage);
				} else if (!this._open) {
					throw new Error("Cannot call close, this Command is already closed.");
				}

				this._executing = true;
				this._close();
				this._executing = false;
				this._open = false;
				this._done = true;
				this._onDone.trigger();
			} else {
				throw new Error("Cannot call close on an immediate Command");
			}
		}

		get canUndo() {
			return !this._executing && !this._open && this._done;
		}

		undo() {
			if (this._executing) {
				throw new Error(invalidStateMessage);
			} else if (this._open) {
				throw new Error(notClosed("undo"));
			} else if (!this._done) {
				throw new Error(invalidDone("undo", false));	
			}

			this._executing = true;
			this._undo();
			this._executing = false;
			this._done = false;
			this._onUndo.trigger();
		}

		get canRedo() {
			return !this._executing && !this._open && !this._done;
		}

		redo() {
			if (this._executing) {
				throw new Error(invalidStateMessage);
			} else if (this._open) {
				throw new Error(notClosed("redo"));
			} else if (this._done) {
				throw new Error(invalidDone("redo", true));	
			}

			this._executing = true;
			this._redo();
			this._executing = false;
			this._done = true;
			this._onRedo.trigger();
		}
	};
})();

class MultiCommand extends Command {
	constructor(commands) {
		const allImmediate = commands.every(c => c.type === Command.immediate);
		const type = allImmediate ? Command.immediate : Command.continuous;
		super(type);

		this._commands = commands;
	}

	_execute(...args) {
		this._commands.forEach((c) => {
			c.execute(...args);
		});
	}

	_close() {
		this._commands.forEach((c) => {
			c.close();
		});
	}

	_undo() {
		this._commands.forEach((c) => {
			c.undo();
		});
	}

	_redo() {
		this._commands.forEach((c) => {
			c.redo();
		});
	}
}

class ToggleLayerCommand extends Command {
	constructor(layerManager, layer, add) {
		super(Command.immediate);

		this._layerManager = layerManager;
		this._layer = layer;
		this._add = add;
	}

	_doAction(b) {
		if (this._add === b) {
			this._layerManager.add(this._layer);
		} else {
			this._layerManager.remove(this._layer);
		}
	}

	_execute() {
		this._doAction(true);
	}

	_undo() {
		this._doAction(false);
	}

	_redo() {
		this._doAction(true);
	}
}

class CommandStack {
	constructor(limit) {
		this._limit = typeof limit === "number" ? limit : Infinity;

		this._stack = [];
		this._currentIndex = -1;
		addEvent(this, "onChange");
	}
	
	add(command) {
		if (this.current) {
			if (this.current.open) {
				throw new Error("Cannot add Command, current Command is not closed.");
			} else if (this.current.executing) {
				throw new Error("Cannot add Command, current Command is executing.");
			}
		}

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
		return c && c.canUndo;
	}

	get canRedo() {
		const n = this.next,
			  c = this.current;
		return n && n.canRedo && (!c || (!c.open && !c.executing));
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
