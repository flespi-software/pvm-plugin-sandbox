module.exports = {
  resolve: {
    fallback: { "url": require.resolve("url/") }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    }),
  ],
};
