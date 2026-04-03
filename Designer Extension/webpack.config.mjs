import path from "path";
import { fileURLToPath } from "url";
import Dotenv from "dotenv-webpack";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default {
  entry: "./src/main.tsx",
  output: {
    filename: "bundle.js",
    path: path.resolve(dirname, "public"),
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: { transpileOnly: true },
        },
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new Dotenv({ path: path.resolve(dirname, "../.env") }), // Add custom .env path here
  ],
  devServer: {
    static: [{ directory: path.join(dirname, "public") }],
    compress: true,
    port: process.env.PORT,
  },
};
