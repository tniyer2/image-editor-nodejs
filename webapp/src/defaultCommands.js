
import { Command } from "./command";
import { Vector2 } from "./utility";

export { CreateLayer, RemoveLayer, Move };

class LayerCommand extends Command {
	constructor(layerManager, add)
	{
		super(Command.immediate);
		this._layerManager = layerManager;
		this._add = add;
	}

	_doAction(b)
	{
		if (this._add === b)
		{
			this._layerManager.add(this._layer);
		}
		else
		{
			this._layerManager.remove(this._layer);
		}
	}

	_execute(layer)
	{
		this._layer = layer;
		this._doAction(true);
	}

	_undo()
	{
		this._doAction(false);
	}

	_redo()
	{
		this._doAction(true);
	}
}

class CreateLayer extends LayerCommand {
	constructor(layerManager)
	{
		super(layerManager, true);
	}
}

class RemoveLayer extends LayerCommand {
	constructor(layerManager)
	{
		super(layerManager, false);
	}
}

class Move extends Command {
	constructor(layers, mousePos)
	{
		super(Command.continuous);
		this._layers = layers;
		this._initialMousePos = mousePos;
		this._initialPosArray = [];
		this._layers.forEach((l) => {
			this._initialPosArray.push(l.pos);
		});
	}

	_execute(newMousePos)
	{
		let difference = Vector2.subtract(newMousePos, this._initialMousePos);
		this._finalPosArray = [];
		this._layers.forEach((l, i) => {
			l.pos = Vector2.add(this._initialPosArray[i], difference);
			this._finalPosArray.push(l.pos);
		});
	}

	_undo()
	{
		this._layers.forEach((l, i) => {
			l.pos = this._initialPosArray[i];
		});
	}

	_redo()
	{
		this._layers.forEach((l, i) => {
			l.pos = this._finalPosArray[i];
		});
	}
}
