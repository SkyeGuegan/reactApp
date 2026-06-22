// CRACO config to override Create React App's webpack without ejecting.
// webpack 5 (react-scripts 5) enforces "fullySpecified" resolution for ESM,
// which breaks aws-amplify v3's dependency on graphql@14 (extensionless
// internal imports). Disabling fullySpecified for .mjs/.js restores resolution.
// This override can be removed once aws-amplify is upgraded to v6.
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      });
      return webpackConfig;
    },
  },
};
