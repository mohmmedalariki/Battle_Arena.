const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  devtool: "eval-source-map",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: [/\.vert$/, /\.frag$/],
        use: "raw-loader"
      },
      {
        test: /\.(gif|png|jpe?g|svg|xml|cur|mp3)$/i,
        use: "file-loader"
      }
    ]
  },
  entry: {
    app: ["./client/src/index.js"]
  },
  plugins: [
    new CleanWebpackPlugin(["public"], {
      root: path.resolve(__dirname, "client/public")
    }),
    new CopyWebpackPlugin([
      // Original assets
      {
        from: './client/src/assets/Empty_hands.png',
        to: './assets/Empty_hands.png'
      },
      // Blue team assets (added during development)
      {
        from: './client/src/assets/Blue_Empty_hands.png',
        to: './assets/Blue_Empty_hands.png'
      },
      {
        from: './client/src/assets/Blue_Klakin.png',
        to: './assets/Blue_Klakin.png'
      },
      {
        from: './client/src/assets/Blue_ShootGun.png',
        to: './assets/Blue_ShootGun.png'
      },
      {
        from: './client/src/assets/Blue_Grinad.png',
        to: './assets/Blue_Grinad.png'
      },
      // Copy all assets directory (fallback for any missed assets)
      {
        from: './client/src/assets',
        to: './assets'
      }
    ]),
    new webpack.DefinePlugin({
      CANVAS_RENDERER: JSON.stringify(true),
      WEBGL_RENDERER: JSON.stringify(true)
    }),
    new HtmlWebpackPlugin({
      template: "./client/src/index.html"
    })
  ]
};