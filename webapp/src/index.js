
import Editor from "./editor";

const fileInput = document.getElementById("file-upload");
const container = document.getElementById("main-container");

let g_editor;

function main()
{
	g_editor = new Editor();
	attachInputListeners();
}

function attachInputListeners()
{
	fileInput.addEventListener("change", (evt) => {
		let image = new Image();
		image.src = URL.createObjectURL(evt.target.files[0]);

		g_editor.createLayer(image, function() {
			this.canvas.classList.add("editor__canvas");
			container.appendChild(this.canvas);
		}, () => {
			console.warn("Layer could not be created");
		});
	});
}

main();
