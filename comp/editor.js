
import { useState } from "react";
import { createStore } from "redux";
import reducer from "lib/reducer";
import {
	PUSH_COMMAND,
	START_TEMP_COMMAND,
	PUSH_TEMP_COMMAND,
	CLEAR_TEMP_COMMAND,
	FLUSH_TEMP_COMMAND,
	MOVE_FORWARD,
	MOVE_BACKWARD
} from "lib/actions";
import { Provider } from "react-redux";
import css from "./editor.scss";
import MenuBar from "./menubar/index";

export default function Editor() {
	const [store, setStore] = useState();
	if (!store) {
		const newStore = createStore(reducer);
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

function EditorContent() {
	return (
		<div className={css.editorContent}>
		</div>);
}
