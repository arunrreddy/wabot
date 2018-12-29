var webpack = require("webpack");
module.exports = {
	entry: "./app.js",
	output: {
		path: __dirname,
		filename: "background.js"
	},
	plugins: [new webpack.DefinePlugin({"process.env": {LATER_COV: false}})]
};
