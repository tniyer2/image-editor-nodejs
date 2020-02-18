
import css from "./tabs.scss";

function WindowContainer({ containers, row }) {
	return (
	<div className={css.container + " " +
		(row === true ? css.containerRow : css.containerCol)}>
	{containers.map((ctr, i) => ({
		ctr.type === "window" ?
		<Window {...ctr} key={i}/> :
		<WindowContainer {...ctr} key={i}/>
	}))}
	</div>);
}

function Window() {
	return (
	<div className={css.window}>
	</div>);
}

function Tab() {}
