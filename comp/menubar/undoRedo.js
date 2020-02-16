
import css from "./undoRedo.scss";
import { IconRedo, IconUndo } from "comp/icons";

export default function UndoRedo() {
	return (
		<div>
			<UndoButton/>
			<RedoButton/>
		</div>);
}

function makeUndoRedoButton(args) {
	return function UndoRedoButton() {
	    return (
	    <button className={css.undoRedoBtn} type="button">
		    <svg className={css.undoRedoSvg} viewBox="0 0 32 32">
		    	<title>{args.hint}</title>
		        <path d={args.code}></path>
		    </svg>
	    </button>);
	}
}

const UndoButton = makeUndoRedoButton({ hint: "Undo",
	code: "M23.808 32c3.554-6.439 4.153-16.26-9.808-15.932v7.932l-12-12 12-12v7.762c16.718-0.436 18.58 14.757 9.808 24.238z"
});

const RedoButton = makeUndoRedoButton({ hint: "Redo",
	code: "M18 7.762v-7.762l12 12-12 12v-7.932c-13.961-0.328-13.362 9.493-9.808 15.932-8.772-9.482-6.909-24.674 9.808-24.238z"
});
