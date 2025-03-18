const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './lib/handler/index.js',
  target: 'node',
  mode: 'production',
  externals: [nodeExternals(
    {
      allowlist: ['mongodb', 'bson']
    }
  )],
  output: {
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, './lib/dist'),
    filename: 'index.js',
  },
  resolve: {
    fallback: {
      crypto: false,
      kerberos: false,
      '@mongodb-js/zstd': false,
      'aws4': false,
      'snappy': false,
      'socks': false,
      'gcp-metadata': false,
      'mongodb-client-encryption': false
    }
  }
};
