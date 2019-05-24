
import Layer from "./layer";
import Globals from "./globals";
import { extend } from "./utility";

const DEFAULTS = { primaryColor: "#fff", 
				   secondaryColor: "#000" };

export default class {
	constructor(canvas, options)
	{
		this._options = extend(DEFAULTS, options);

		this._selectedLayer = null;
		this._layers = [];
		this._initGlobals();
	}

	get selectedLayer()
	{
		return this._selectedLayer;
	}

	get globals()
	{
		return this._globals;
	}

	_initGlobals()
	{
		this._globals = new Globals();
		this._globals.set("primary_color", this._options.primaryColor);
		this._globals.set("secondary_color", this._options.secondaryColor);
	}

	createLayer(image, cb, onErr)
	{
		let layer = new Layer(image);
		layer.onInit(function() {
			this._layers.push(layer);
			this._selectLayer(layer)
			cb.apply(this, arguments);
		}, onErr);
	}

	_selectLayer(layer)
	{
		this._selectedLayer = layer;
	}
}
