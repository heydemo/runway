var path = require("path");
var webpack = require('webpack');

module.exports = {
  entry: [ 
    'webpack-dev-server/client?http://localhost:3000',
    'webpack/hot/only-dev-server',
    './src/index.js'
  ],
  output: {
    path: path.resolve(__dirname, "build"),
    publicPath: "/assets/",
    filename: "bundle.js"
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        plugins: ['transform-runtime'],
        presets: ['es2015', 'stage-0']

      }
    ]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ]
};
