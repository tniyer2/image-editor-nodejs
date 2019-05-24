
const path = require("path");

module.exports = {
	entry: "./webapp/src/index.js",
	output: {
		path: path.resolve("./webapp/dist"),
		filename: "bundle.js"
	},
	mode: 'development'
}
