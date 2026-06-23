// CRACO config to override Create React App's webpack without ejecting.
// webpack 5 (react-scripts 5) enforces "fullySpecified" resolution for ESM,
// which breaks extensionless internal imports in some deep dependencies
// (e.g. @aws-amplify/ui-react v6's @radix-ui packages, previously graphql@14).
// Disabling fullySpecified for .mjs/.js restores resolution. Still required.
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
