
import css from "./tabs.scss";

function Tab() {}

function Window() {
	return (
	<div className={css.window}>
	</div>);
}

export function WindowContainer({ containers, row }) {
	const cssDir = row ? css.containerRow : css.containerCol;

	return (
	<div className={css.container + " " + cssDir}>
	{containers.map((ctr, i) => (
		ctr.type === "window" ?
		<Window {...ctr} key={i}/> :
		<WindowContainer {...ctr} key={i}/>
	))}
	</div>);
}
