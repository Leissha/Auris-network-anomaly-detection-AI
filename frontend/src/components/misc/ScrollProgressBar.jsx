import React, { useEffect, useState, useRef } from "react";
import { Box, useTheme } from "@mui/material";
export default function SectionScrollProgressBar() {
  const theme = useTheme();
  const [isFilled, setIsFilled] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsFilled(true);
          observer.unobserve(sectionRef.current);
        }
      },
      { threshold: 0 }
    );

    const currentSectionRef = sectionRef.current;
    if (currentSectionRef) {
      observer.observe(currentSectionRef);
    }

    return () => {
      if (currentSectionRef) observer.unobserve(currentSectionRef);
    };
  }, []);

  return (
    <Box ref={sectionRef} sx={{ position: "relative" }}>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          left: 0,
          width: "100%",
          height: "3px",
          px: { xs: 3, md: 8 },
          zIndex: 1300,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            backgroundColor:
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            borderRadius: "2px",
          }}
        >
        <Box
          sx={{
            height: "100%",
            width: isFilled ? "100%" : "0%",
            background: "linear-gradient(90deg, #ff4b1f, #ff9068, #4286f4)", 
            borderRadius: "2px",
            transition: "width 1.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 1s",
            opacity: isFilled ? 1 : 0.3,
            backgroundSize: "100% 100%",
          }}
        />
        </Box>
      </Box>
    </Box>
  );
}
