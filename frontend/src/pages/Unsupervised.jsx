import React from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import UnsupervisedHero from "../components/unsupervised/UnsupervisedHero";

const UnsupervisedPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        backgroundColor: isDark ? "#1A1414" : "#EAE6DE",
        minHeight: "100vh",
        transition: "background-color 0.4s ease",
      }}
    >
      <UnsupervisedHero />
    </Box>
  );
};

export default UnsupervisedPage;