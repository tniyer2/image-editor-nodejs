
import { LayerManager } from "./layer";
import { CommandFactory, CommandStack } from "./command";
import { CreateLayer, RemoveLayer, Move } from "./defaultCommands";
import { MoveTool } from "./tool";
import { removeChildren, addGetter, extend, isUdf } from "./utility";
import { ConstantDictionary, EventDictionary } from "./dictionary";

const DEFAULTS = { primaryColor: "#fff", 
				   secondaryColor: "#000",
				   stackLimit: null };

export default class {
	constructor(options)
	{
		this._options = extend(DEFAULTS, options);
		addGetter(this, "layerManager", new LayerManager());

		this._initStack();
		this._initGlobals();
		this._initTools();
	}

	_initStack()
	{
		this._factory = new CommandFactory();
		this._factory.register("create_layer", CreateLayer);
		this._factory.register("remove_layer", RemoveLayer);
		this._factory.register("move", Move);

		const stack = new CommandStack(this._factory, this._options.stackLimit);
		addGetter(this, "stack", stack);
	}

	_initGlobals()
	{
		const globals = new EventDictionary();
		addGetter(this, "globals", globals);

		globals.put("primary_color", this._options.primaryColor);
		globals.put("secondary_color", this._options.secondaryColor);
	}

	_initTools()
	{
		this._tools = new ConstantDictionary();
		let parent = document.createElement("div");
		addGetter(this, "toolOptionsParent", parent);

		let t = new MoveTool(this, { cursor: "all-scroll" });
		this._tools.put("move", t);
	}

	get tools()
	{
		return this._tools.keys;
	}

	selectTool(toolName)
	{
		let tool = this._tools.get(toolName);
		if (isUdf(tool))
		{
			throw new Error(`tool with name '${toolName}' does not exist.`);
		}

		if (this._selectedTool)
		{
			this._selectedTool.disable();
		}
		removeChildren(this._toolOptionsParent);
		this._toolOptionsParent.appendChild(tool.ui.parent);
		tool.enable();
		this._selectedTool = tool;
	}

	createLayer(layer)
	{
		this._stack.create("create_layer", this._layerManager);
		this._stack.execute(layer);
	}

	removeLayer(layer)
	{
		this._stack.create("remove_layer", this._layerManager);
		this._stack.execute(layer);
	}
}
