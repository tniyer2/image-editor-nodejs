
import { isFunction } from "../util/type";
import Options from "../util/options";
import { mouseEventToPoint } from "../vector/util";
import { DragCommand,
		 ResizeDimensionsCommand,
		 RotateCommand } from "./boxCommands";
import BoxWidget from "./boxWidget";

export { DragWidget, ResizeWidget, RotateWidget };

class DragWidget extends BoxWidget {
	_getCommand(boxes, evt) {
		const p = mouseEventToPoint(evt);
		return new DragCommand(boxes, p);
	}

	_getArguments(evt) {
		return [mouseEventToPoint(evt), evt.shiftKey, evt.ctrlKey];
	}
}

const ResizeWidget = (function(){
	return class extends BoxWidget {
		constructor(groups, options) {
			super(groups);

			this.options = new Options();
			this.options.set(options);
		}

		_getCommand(boxes, evt) {
			const p = mouseEventToPoint(evt);

			const options = this.options.items;
			if (isFunction(options.angle)) {
				options.angle = options.angle();
			}
			if (isFunction(options.fixAspectRatio)) {
				options.fixAspectRatio = options.fixAspectRatio();
			}

			return new ResizeDimensionsCommand(boxes, p, options);
		}

		_getArguments(evt) {
			return [mouseEventToPoint(evt), evt.shiftKey, evt.ctrlKey];
		}
	};
})();

const RotateWidget = (function(){
	return class extends BoxWidget {
		constructor(groups, options) {
			super(groups);

			this.options = new Options();
			this.options.set(options);
		}

		_getCommand(boxes, evt) {
			let center = this.options.get("center");
			if (isFunction(center)) {
				center = center();
			}
			return new RotateCommand(boxes, center);
		}

		_getArguments(evt) {
			return [mouseEventToPoint(evt), evt.shiftKey];
		}
	};
})();
