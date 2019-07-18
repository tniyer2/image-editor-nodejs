
import { addGetter, forEach } from "./utility";
import { addEvent } from "./event";
import { Collection, BASE, SELECT } from "./collection";

export { Node, NodeManager, NodeInput, NodeOutput };

class Connection {

}

class NodePoint {
	constructor(node) {
		addGetter(this, "node", node);
	}
}

class NodeOutput extends NodePoint {
	constructor(node) {
		super(node);
		this._value = null;
		this._inputs = [];
		addEvent(this, "onChange");
	}

	get value() {
		return this._value;
	}

	set value(val) {
		this._value = val;
		this._onChange.trigger();
	}

	addInput(input) {
		this._inputs.push(input);
	}

	removeInput(input) {
		const removed = removeItem(this._inputs, input);
		if (!removed) {
			console.warn("Could not remove input from this._inputs:", removed);
		}
	}
}

class NodeInput extends NodePoint {
	constructor(node) {
		super(node);
		this._output = null;
		addEvent(this, "onChange");
	}

	get output() {
		return this._output;
	}

	set output(val) {
		const old = this._output;
		this._output = val;

		if (old !== val) {
			if (this._unlink) {
				this._unlink();
			}
			this._onChange.trigger();
			this._unlink = this._onChange.linkTo(this._output.onChange);
		}
	}

	get value() {
		return this._output ? this._output.value : null;
	}
}

class Node {
	constructor(inputs, outputs) {
		addGetter(this, "inputs", inputs);
		addGetter(this, "outputs", outputs);

		addGetter(this, "dirty", true);
		this._inputs.forEach((input) => {
			input.onChange.addListener(() => {
				this._dirty = true;
			});
		});

		this.selected = false;
		this.locked = false;
		this.perm = false;
		this.temp = false;
	}

	get references() {
		return this._inputs.filter(i => i.output).map(i => i.output.node);
	}

	cook() {
		if (this.locked || !this._dirty) {
			return Promise.resolve(false);
		} else {
			return new Promise((resolve) => {
				const inputs = this._inputs.map(i => i.value);
				const p = this._cook(...inputs);
				if (p instanceof Promise) {
					p.then(resolve);
				} else {
					resolve(p);
				}
			}).then((results) => {
				this._outputs.forEach((o, i) => {
					o.value = results[i];
				});
				this._dirty = false;
				return true;
			});
		}
	}
}

class NodeManager extends Collection {
	constructor (ns, ins) {
		const base = Object.assign({}, BASE);
		base.varName = "nodes";
		super(base, SELECT);

		addGetter(this, "nodeSpace", ns);
		addGetter(this, "innerNodeSpace", ins);
	}

	_cook(graph) {
		return graph.reduce((chain, node) => chain.then((arr) => {
			const d = Date.now();
			return node.cook().then((cooked) => {
				const time = cooked ? Date.now() - d : 0;
				arr.push(time);
				return arr;
			});
		}), Promise.resolve([]));
	}

	_getSubGraph(start) {
		let graph = [];

		function unmark(node) {
			node.perm = node.temp = false;
		}

		function visit(node, first=false) {
			if (node.perm) {
				return true;
			}
			if (node.temp) {
				graph.forEach(unmark);
				graph = [];
				return false;
			}
			node.temp = true;
			for (const ref of node.references) {
				const cyclic = visit(ref);
				if (!cyclic) {
					unmark(ref);
					graph.push(ref);
					return false;
				}
			}
			graph.push(node);
			if (first) {
				graph.forEach(unmark);
			} else {
				node.temp = false;
				node.perm = true;
			}
			return true;
		}

		const cyclic = visit(start, true);
		return { graph: graph, cyclic: cyclic };
	}
}
