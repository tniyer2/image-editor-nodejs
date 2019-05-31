
import { addGetter, extend, noop } from "./utility";
import { ConstantDictionary } from "./dictionary";
import { addEvent } from "./event";

export { Command, CommandStack, CommandFactory };

const Command = (function(){
	const invalidStateMessage = "Cannot invoke this operation when another operation is executing.";

	return class {
		// execute and undo should be called with a layer argument.
		constructor(type)
		{
			if (type !== Command.immediate && type !== Command.continuous)
			{
				throw new Error("type is not valid.");
			}
			addGetter(this, "type", type);

			addGetter(this, "open", true);
			addGetter(this, "executing", false);
			addGetter(this, "done", false);
		}

		static get immediate()
		{
			return 0;
		}

		static get continuous()
		{
			return 1;
		}

		_execute(){}
		_close(){}
		_undo(){}
		_redo(){}

		execute()
		{
			if (this._executing)
			{
				throw new Error(invalidStateMessage);
			}
			if (!this._open)
			{
				throw new Error("Cannot call execute after Command is closed.");
			}

			this._executing = true;
			this._execute.apply(this, arguments);
			this._executing = false;
			if (this._type === Command.immediate)
			{
				this._open = false;
				this._done = true;
			}
		}

		close()
		{
			if (this._type === Command.continuous)
			{
				if (this._executing)
				{
					throw new Error(invalidStateMessage);
				}
				if (!this._open)
				{
					throw new Error("this Command is already closed.");
				}

				this._executing = true;
				this._close();
				this._executing = false;
				this._open = false;
				this._done = true;
			}
			else
			{
				throw new Error("Cannot call close on a command that is not continuous.");
			}
		}

		undo()
		{
			if (this._executing)
			{
				throw new Error(invalidStateMessage);
			}
			if (this._open)
			{
				throw new Error("Cannot call undo if Command is not closed.");
			}
			if (!this._done)
			{
				throw new Error("Cannot call undo if Command is not done.");	
			}

			this._executing = true;
			this._undo();
			this._executing = false;
			this._done = false;
		}

		redo()
		{
			if (this._executing)
			{
				throw new Error(invalidStateMessage);
			}
			if (this._open)
			{
				throw new Error("Cannot call redo if Command is not closed.");
			}
			if (this._done)
			{
				throw new Error("Cannot call redo if Command is done.");	
			}

			this._executing = true;
			this._redo();
			this._executing = false;
			this._done = true;
		}
	};
})();

class CommandFactory {
	constructor()
	{
		this._builders = new ConstantDictionary();
	}

	register()
	{
		let b = this._builders;
		b.put.apply(b, arguments);
	}

	create(name, ...args)
	{
		try {
			let builder = this._builders.get(name);
			if (!builder)
			{
				throw new Error(`No builder with name '${name}' is registered.`);
			}

			let command = new builder(...args);
			if (!(command instanceof Command))
			{
				throw new Error("builder did not return an object of type Command");
			}

			return command;
		} catch (e) {
			console.warn(e);
			return null;
		}
	}
}

const CommandStack = (function(){
	const emptyStackMessage = "Cannot call execute, there are no current commands in the stack.";

	return class {
		constructor(factory, limit)
		{
			this._factory = factory;
			this._limit = typeof limit === "number" ? limit : Infinity;

			this._stack = [];
			this._currentIndex = -1;
			addEvent(this, "onChange");
		}
		
		get open()
		{
			return this._current ? this._current.open : false;
		}

		get _current()
		{
			return this._stack[this._currentIndex];
		}

		create()
		{
			let command = this._factory.create.apply(this._factory, arguments);
			if (!command)
			{
				return;
			}

			let b = this._stack.length >= this._limit ? 1 : 0;
			this._stack = this._stack.slice(b, this._currentIndex + 1);
			this._stack.push(command);
			this._currentIndex += 1;
		}

		execute()
		{
			if (this._current)
			{
				this._current.execute.apply(this._current, arguments);
				this._onChange.trigger();
			}
			else
			{
				throw new Error(emptyStackMessage);
			}
		}

		close()
		{
			if (this._current)
			{
				this._current.close();
			}
			else
			{
				throw new Error(emptyStackMessage);
			}
		}

		get canUndo()
		{
			return this._currentIndex !== -1;
		}

		undo(n)
		{
			n = n || 1;
			for (let i = 0; i < n && this.canUndo; i+=1)
			{	
				this._current.undo();
				this._currentIndex -= 1;
			}
			this._onChange.trigger();
		}

		get canRedo()
		{
			return this._currentIndex + 1 < this._stack.length;
		}

		redo(n)
		{
			n = n || 1;
			for (let i = 0; i < n && this.canRedo; i+=1)
			{
				this._currentIndex += 1;
				this._current.redo();
			}
			this._onChange.trigger();
		}
	};
})();
