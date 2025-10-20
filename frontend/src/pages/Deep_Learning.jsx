import React from "react";
import { useTheme, Box, Typography } from "@mui/material";
import DeepHero from "../components/deep_learning/DeepHero";
import DeepLearningDiagram from "../components/deep_learning/DeepLearningDiagram";
import ScrollProgressBar from "../components/misc/ScrollProgressBar";

const DeepLearningPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box sx={{ backgroundColor: isDark ? "#1A1414" : "#EAE6DE", transition: "background-color 0.5s ease", py: 4, overflowX: 'hidden' }}>
      <Box sx={{ px: 4, textAlign: 'center' }}>
          <Box sx={{ pt: 2, position: 'relative', zIndex: 1 }}>
              <Typography 
                sx={{ 
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: isDark ? '#EF9B7D' : '#D95C39',
                }}
              >
                  MLP Model Architecture
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  color: isDark ? 'grey.400' : 'grey.700',
                  mt: 0.5,
                  fontSize: '1rem'
                }}
              >
                An interactive visualisation of the MLP neural pathways for each network type classification.
              </Typography>
          </Box>
          <Box sx={{ marginTop: '-85px' }}>
            <DeepLearningDiagram modelName="mlp" isDark={isDark} />
          </Box>
      </Box>
      <Box sx={{ my: 10 }}>
        <ScrollProgressBar />
      </Box>
      <DeepHero />
    </Box>
  );
};
export default DeepLearningPage;