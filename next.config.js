
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

module.exports = withSass({
	cssModules: true,
	exportTrailingSlash: true,
	exportPathMap: () => StaticRoutes,
	webpack: (config) => {
		config.module.rules.push(MarkdownRule);
		return config;
	}
});
