
import { useEffect } from "react";
import { createStore } from "redux";
import reducer from "lib/reducer";

import css from "./editor.scss";
import MenuBar from "./menubar/index";

export default function Editor() {
	useEffect(() => {
		createStore(reducer, {});
	}, [])

    return (
    <div className={css.editor}>
        <MenuBar/>
        <EditorContent/>
    </div>);
}

function EditorContent() {
	return (
		<div className={css.editorContent}>
		</div>);
}
