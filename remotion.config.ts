import { Config } from "remotion";

const config = {
  overrideWebpackConfig: (currentConfiguration: any) => {
    return {
      ...currentConfiguration,
      module: {
        ...currentConfiguration.module,
        rules: [
          ...(currentConfiguration.module?.rules || []),
          {
            test: /\.css$/i,
            use: ["style-loader", "css-loader"],
          },
        ],
      },
    };
  },
};

export default config;
