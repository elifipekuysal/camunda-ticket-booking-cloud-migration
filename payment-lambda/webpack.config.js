const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './lib/handler/index.js',
  target: 'node',
  mode: 'production',
  externals: [nodeExternals()],
  output: {
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
  },
};
