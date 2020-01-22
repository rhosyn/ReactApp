const path = require("path");
const webpack = require("webpack");
const player = require('node-wav-player');
const CopyWebpackPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

class TruthCubePlugin {
    apply(compiler) {
        compiler.hooks.done.tapPromise('Truth Cube Plugin', stats => {
            let path = "../../build-success.wav";
            if (stats.hasErrors()) {
                path = "../../build-failure.wav";
            }
            return player.play({
                path: path,
                sync: true,
            }).catch((error) => {
                console.error(error);
            });
        });
    }
}

let cssClassName = '[local]__[path][name]'; // We may choose to switch this to [contenthash:16] in production. Or not.
let context = path.resolve(__dirname, 'src');

module.exports = {
    entry: ['babel-polyfill', "./index.jsx"],
    mode: "development",
    context: context,
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /(node_modules)/,
                use: [{
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/env", "@babel/preset-react"],
                        plugins: ["@babel/plugin-proposal-optional-chaining",
                            // This parses the imported css/scss for classes, mangles the names, then adds the appropriate class names to the generated react components. Even at runtime.
                            // It does *not* do any actual transformation of the imported file, we rely on the css-loader to do that, as usual. Note that this and the css-loader must be configured
                            // to mangle the class names in exactly the same way, or nothing will work. That's why cssClassName and context are factored out here.
                            ["react-css-modules", {
                                context: context,
                                generateScopedName: cssClassName,
                                filetypes: {
                                    '.scss': {syntax: 'postcss-scss'}
                                }
                            }]],
                    },
                }],
            },
            {
                test: /\.s?css$/,
                use: [
                    "style-loader",
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: {
                            sourceMap: true,
                            importLoaders: 1, // Process css imports as sass.
                            modules: { // Mangle class names to match the names we expect in React.
                                context: context,
                                localIdentName: cssClassName,
                            }
                        }
                    },
                    {
                        loader: "sass-loader",
                        options: {
                            sourceMap: true
                        }
                    }
                ]
            }
        ]
    },
    resolve: {
        extensions: ["*", ".js", ".jsx", ".scss", ".css"],
        alias: {
            'angular-ide': path.resolve(__dirname, '../app/js/app/'),
        },
        modules: ["../app/js/app", "node_modules"],
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "anvil.js"
    },
    devServer: {
        contentBase: path.join(__dirname, "static/"),
        port: 5000,
    },
    devtool: false, // We'll configure source maps ourselves, thanks very much.
    plugins: [
        // Produce a full source-map for CSS, because for some reason the eval-source-map doesn't work with inline sources. And we want inline sources, because they're much faster to build during development.
        new webpack.SourceMapDevToolPlugin({
            test: /\.s?css$/
        }),
        // Just build eval-source-map for JS, which is much faster than source-map, but only gives us line-level precision. That'll do for now.
        new webpack.EvalSourceMapDevToolPlugin({
            test: /\.jsx?$/
        }),
        new TruthCubePlugin(),
        new MiniCssExtractPlugin({
            filename: 'anvil.css',
        }),
        //new BundleAnalyzerPlugin(),
    ],
    optimization: {
        splitChunks: {
            chunks: 'all',
        },
    }
};