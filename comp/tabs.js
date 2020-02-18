
import css from "./tabs.scss";

function WindowContainer({ containers, row }) {


	return (
	<div className={css.container + " " +
		(row === true ? css.containerRow : css.containerCol)}>
	{containers.map((ctr, i) => ({
		ctr.isWindow === true ?
		<Window key={i}/> :
		<WindowContainer container={ctr.containers}/>
	}))}
	</div>);
}

function Window() {
	return (
	<div className={css.window}>
	</div>);
}

function Tab() {}
