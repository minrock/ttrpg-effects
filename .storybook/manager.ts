import { addons } from "storybook/manager-api";
import { themes } from "storybook/theming";

addons.setConfig({
  theme: {
    ...themes.dark,
    brandTitle: "TTRPG Effects UI",
    colorPrimary: "#8ed5b6",
    colorSecondary: "#8ed5b6",
    appBg: "#171c22",
    appContentBg: "#0b0e13",
    appBorderColor: "#2b3542",
    barBg: "#171c22",
    inputBg: "#0b0e13",
    textColor: "#e6ebf2"
  }
});
