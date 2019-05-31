
import { Vector2, addGetter, extend } from "./utility";
import { EventDictionary } from "./dictionary";
import { MouseAction } from "./event";

export { MoveTool };

class ToolUI {
	constructor(options)
	{
		this._options = new EventDictionary(options);
		addGetter(this, "options");
		this._parent = document.createElement("div");
		addGetter(this, "parent");
		addGetter(this, "initialized", false);
	}

	_createUI(){}

	createUI()
	{
		if (this._initialized)
		{
			throw new Error("Cannot call initialize more than once.");
		}
		this._createUI();
		this._initialized = true;
	}
}

const Tool = (function(){
	const DEFAULTS = { cursor: "default" };
	return class {
		constructor(editor, options, ui)
		{
			this._editor = editor;
			this._options = extend(DEFAULTS, options);
			addGetter(this, "ui", ui);

			this._onClick = this._onClick.bind(this);
			this._onStart = this._onStart.bind(this);
			this._onMove = this._onMove.bind(this);
			this._onExit = this._onExit.bind(this);
		}

		get _lm()
		{
			return this._editor._layerManager;
		}

		enable()
		{
			this._lm.cursor = this._options.cursor;
			if (!this._ui.initialized)
			{
				this._ui.createUI();
			}

			this._lm.mouseActionManager.onClick.addListener(this._onClick);
			this._lm.mouseActionManager.onStart.addListener(this._onStart);
			this._lm.mouseActionManager.onMove.addListener(this._onMove);
			this._lm.mouseActionManager.onExit.addListener(this._onExit);
		}

		disable()
		{
			this._lm.resetCursor();

			this._lm.mouseActionManager.onClick.removeListener(this._onClick);
			this._lm.mouseActionManager.onStart.removeListener(this._onStart);
			this._lm.mouseActionManager.onMove.removeListener(this._onMove);
			this._lm.mouseActionManager.onExit.removeListener(this._onExit);
		}

		_onClick(){}
		_onStart(){}
		_onMove(){}
		_onExit(){}
	};
})();

const MoveTool = (function(){
	const DEFAULTS = {};

	return class extends Tool {
		constructor(editor, options, toolOptions)
		{
			let ui = new ToolUI(toolOptions);
			options = extend(DEFAULTS, options);
			super(editor, options, ui);
		}

		enable()
		{
			super.enable();
		}

		disable()
		{
			super.disable();
		}

		_getMousePos(evt)
		{
			return new Vector2(evt.clientX, evt.clientY);
		}

		_onClick(layer, mdEvt, muEvt)
		{
			let selected = Boolean(this._lm.selected.find(l => l === layer));
			if (mdEvt.ctrlKey)
			{
				if (selected)
				{
					this._lm.deselect(layer);
				}
				else
				{
					this._lm.select(layer);
				}
			}
			else
			{
				this._lm.deselectAll();
				this._lm.select(layer);
			}		
		}

		_onStart(layer, evt)
		{
			let selected = Boolean(this._lm.selected.find(l => l === layer));
			if (!selected)
			{
				if (evt.ctrlKey)
				{
					this._lm.select(layer);
				}
				else
				{
					this._lm.deselectAll();
					this._lm.select(layer);
				}
			}

			this._editor.stack.create("move", this._lm.selected, this._getMousePos(evt));
		}

		_onMove(layer, evt)
		{
			if (this._editor.stack.open)
			{
				this._editor.stack.execute(this._getMousePos(evt));
			}
		}

		_onExit(layer, evt, exitCode)
		{
			if (this._editor.stack.open)
			{
				this._editor.stack.close();	
			}
		}
	};
})();
