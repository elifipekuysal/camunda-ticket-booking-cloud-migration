const path = require('path');

module.exports = {
  entry: './lib/handler/index.js',
  target: 'node',
  mode: 'production',
  output: {
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, './lib/dist'),
    filename: 'index.js',
  }
};
