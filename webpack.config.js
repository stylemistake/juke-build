/**
 * @file
 * @copyright 2020 Aleksej Komarov
 * @license MIT
 */

const path = require('path');

const createStats = verbose => ({
  assets: verbose,
  builtAt: verbose,
  cached: false,
  children: false,
  chunks: false,
  colors: true,
  hash: false,
  timings: verbose,
  version: verbose,
  modules: false,
});

module.exports = (env = {}, argv) => {
  /** @type {import('webpack').Configuration} */
  const config = {
    mode: argv.mode === 'production' ? 'production' : 'development',
    context: path.resolve(__dirname),
    target: 'node',
    entry: {
      juke: './src/index.ts',
    },
    output: {
      path: path.resolve(__dirname, './dist'),
      filename: 'index.js',
      library: 'juke',
      libraryTarget: 'umd',
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {},
    },
    module: {
      rules: [
        {
          test: /\.(ts|js)x?$/,
          use: [
            {
              loader: require.resolve('babel-loader'),
              options: {
                presets: [
                  [require.resolve('@babel/preset-env'), {
                    modules: 'commonjs',
                    spec: false,
                    loose: true,
                    targets: {
                      node: '12',
                    },
                  }],
                  require.resolve('@babel/preset-typescript'),
                ],
                plugins: [],
              },
            },
          ],
        },
      ],
    },
    optimization: {
      emitOnErrors: false,
    },
    performance: {
      hints: false,
    },
    devtool: false,
    // devtool: 'cheap-module-source-map',
    stats: createStats(true),
    plugins: [],
  };
  return config;
};
