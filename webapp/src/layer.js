
import { extend } from "./utility";
import { commandQueue } from "./command";

function call(f)
{
	try {
		f();
	} catch (e) {
		console.warn(e);
	} 
}

const DEFAULTS = {};

export default class {
	constructor(image, options)
	{
		if (!(image instanceof HTMLImageElement))
		{
			throw new Error("image is not an HTMLImageElement");
		}

		this._options = extend(DEFAULTS, options);

		this._isReady = false;
		this._initQueue = [];
		this._image = image;

		this._addProperty(true, "canvas");
		this._addProperty(true, "width");
		this._addProperty(true, "height");

		this._onLoaded(() => {
			this._initialize();
			this._isReady = true;

			this._initQueue.forEach((args) => {
				if (args[0])
				{
					call(() => {
						args[0].call(this);
					});
				}
			});
		}, () => {
			this._initQueue.forEach((args) => {
				if (args[1])
				{
					call(args[1]);
				}
			});
		});
	}

	get canvasWidth()
	{
		return this._canvas ? this._canvas.width : null;
	}

	get canvasHeight()
	{
		return this._canvas ? this._canvas.height : null;
	}

	_addProperty(checkState, publicName, privateName)
	{
		if (!privateName)
		{
			privateName = "_" + publicName;	
		}

		Object.defineProperty(this, publicName, {
			get: () => {
				if (checkState)
				{
					this._checkState();
				}
				return this[privateName];
			}
		});
	}

	_checkState()
	{
		if (!this._isReady)
		{
			throw new Error("Cannot manipulate layer before it is initialized.");
		}
	}

	_onLoaded(cb, onErr)
	{
		if (this._image.complete)
		{
			cb();
		}
		else
		{
			this._image.addEventListener("load", () => {
				cb();
			}, {once: true});

			this._image.addEventListener("error", () => {
				onErr();
			}, {once: true});
		}
	}

	onInit(cb, onErr)
	{
		this._initQueue.push(arguments);
	}

	_initialize()
	{
		this._canvas = document.createElement("canvas");
		this._canvasContext = this._canvas.getContext("2d");

		let width  = this._options.width  ? this._options.width  : this._image.naturalWidth;
		let height = this._options.height ? this._options.height : this._image.naturalHeight;
		this._scale(width, height);
	}

	_scale(width, height)
	{
		this._resize(width, height);
		this._draw(width, height);
	}

	_resize(width, height)
	{
		this._canvas.width = width;
		this._canvas.height = height;
	}

	_draw(width, height)
	{
		this._canvasContext.drawImage(this._image, 0, 0, width, height);
		this._width = width;
		this._height = height;
	}
}
