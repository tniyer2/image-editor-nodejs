
const path = require("path");
const withSass = require("@zeit/next-sass");

const StaticRoutes = {
	"/": { page: "/" },
	"/about": { page: "/about" }
};

const MarkdownRule = {
    test: /\.md$/,
    loader: "frontmatter-markdown-loader",
    options: { mode: ["react-component"] }
};

const dirAlias = [ "lib", "components", "css", "content" ];
const aliasObj = {
	"make": "node_modules/@tniyer2/particles/css/make.scss"
};

module.exports = withSass({
	cssModules: true,
	exportTrailingSlash: true,
	exportPathMap: () => StaticRoutes,
	webpack: (config) => {
		config.module.rules.push(MarkdownRule);
		dirAlias.forEach((dir) => {
			config.resolve.alias[dir] = path.resolve(dir);
		});
		Object.keys(aliasObj).forEach((key) => {
			config.resolve.alias[key] = aliasObj[key];
		});
		return config;
	}
});
