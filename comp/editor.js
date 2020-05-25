
import { useState } from "react";
import { createStore } from "redux";
import { Provider } from "react-redux";

import { MainReducer } from "lib/reducers/main-reducer.js";
import { MenuBar } from "./menubar/index.js";
import { WindowContainer } from "./tabs.js";

import css from "./editor.scss";

export function Editor() {
	const [store, setStore] = useState();
	if (!store) {
		const newStore = createStore(MainReducer);
		setStore(newStore);
	}

    return (
    <div className={css.editor}>
    	<Provider store={store}>
        	<MenuBar/>
        	<EditorContent/>
        </Provider>
    </div>);
}

const layout1 = [{
	type: "window"
}, {
	type: "window"
}];

function EditorContent() {
	return (
		<div className={css.editorContent}>
			<WindowContainer containers={layout1} row={true}/>
		</div>);
}
