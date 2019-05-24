
import { addGetter } from "./utility";

export { CommandQueue, Command };

class Command {
	constructor(name, execute, undo)
	{
		addGetter(this, "name", "_name", name);
		addGetter(this, "execute", "_execute", execute);
		addGetter(this, "undo", "_undo", undo);
	}
}

class CommandQueue {
	constructor(limit)
	{
		this._limit = limit ? limit : infinity;
		this._queue = [];
		this._currentIndex = -1;
	}

	get names()
	{
		return this._queue.map(c => c.name);
	}

	execute(command)
	{
		if (!(command instanceof Command))
		{
			throw new Error("argument command is not of type Command");
		}

		let b = this._queue.length >= this._limit ? 1 : 0;
		this._queue.slice(b, this._currentIndex + 1);

		this._queue.push(command);
		this._currentIndex += 1;
		command.execute();
	}

	get canUndo()
	{
		return this._currentIndex > -1;
	}

	undo()
	{
		if (this.canUndo)
		{
			this._queue[this._currentIndex].undo();
			this._currentIndex -= 1;
		}
	}

	get canRedo()
	{
		return this._currentIndex + 1 < this._queue.length;
	}

	redo()
	{
		if (this.canRedo)
		{
			this._currentIndex += 1;
			this._queue[this._currentIndex].execute();
		}
	}
}
