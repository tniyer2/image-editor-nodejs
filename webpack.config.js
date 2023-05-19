

const path = require("path");

const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const isProduction = process.env.NODE_ENV == "production";
const stylesHandler = MiniCssExtractPlugin.loader;


const OUTPUT_PATH = "./webapp/dist";

const resolvePath = (p) => path.resolve(__dirname, p);

COMMON_EXCLUDED_CHUNKS = ["content", "scanner"];

const config = {
    devtool: "source-map",
    entry: "./webapp/src/index.js",
	optimization: {
		splitChunks: {
			cacheGroups: {
				commons: {
					name: "commons",
					chunks: (chunk) =>
                        COMMON_EXCLUDED_CHUNKS.indexOf(chunk.name) === -1,
					minChunks: 2,
					minSize: 0
				}
			}
		},
		chunkIds: "deterministic"
	},
    output: {
        path: resolvePath(OUTPUT_PATH),
		filename: "bundle.js"
    },
    devServer: {
        open: true,
        host: "localhost"
    },
    plugins: [
        new MiniCssExtractPlugin(),
        new CopyPlugin({
            patterns: [
                { from: "./webapp/css", to: "./css" },
                { from: "./webapp/html/index.html", to: "./index.html" },
                { from: "./webapp/img", to: "./img" }
            ]
        })
    ],
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/i,
                loader: "babel-loader"
            },
            {
                test: /\.s[ac]ss$/i,
                use: [stylesHandler, "css-loader", "postcss-loader", "sass-loader"]
            },
            {
                test: /\.css$/i,
                use: [stylesHandler, "css-loader", "postcss-loader"]
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: "asset"
            },
            {
                test: /\.(png|jpe?g|gif)$/i,
                loader: "file-loader"
            }
        ]
    }
};

module.exports = () => {
    if (isProduction) {
        config.mode = "production";
    } else {
        config.mode = "development";
    }

    return config;
};
