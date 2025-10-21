import React from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SupervisedHero from "../components/supervised/SupervisedHero";


const Supervised = () => {
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
      <SupervisedHero />
    </Box>
  );
};

export default Supervised;
