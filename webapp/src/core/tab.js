
import Container from "./container";

export default class Tab extends Container {
	constructor() {
		super();
		this._root.classList.add("tab-wrapper");
	}
}
