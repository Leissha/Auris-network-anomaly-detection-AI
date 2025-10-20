import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Box, Typography, Button, Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const PREDICTION_LABELS = ["Normal", "Bruteforce", "DoS", "Mirai"];
const PieChart = ({ isDark = false }) => {
  const svgRef = useRef();
  const theme = useTheme();
  const piePresets = {
    "Normal Business Day": [
      { label: "Normal", value: 0.9 },
      { label: "Bruteforce", value: 0.04 },
      { label: "DoS", value: 0.05 },
      { label: "Mirai", value: 0.01 },
    ],
    "Stealth Intrusion": [
      { label: "Normal", value: 0.6 },
      { label: "Bruteforce", value: 0.3 },
      { label: "DoS", value: 0.05 },
      { label: "Mirai", value: 0.05 },
    ],
    "DDoS Flood": [
      { label: "Normal", value: 0.05 },
      { label: "Bruteforce", value: 0.1 },
      { label: "DoS", value: 0.8 },
      { label: "Mirai", value: 0.05 },
    ],
  };

  const [activePreset, setActivePreset] = useState("Normal Business Day");
  const [chartData, setChartData] = useState(piePresets["Normal Business Day"]);
  const handlePresetClick = (presetName) => {
    setActivePreset(presetName);
    setChartData(piePresets[presetName]);
  };

  useEffect(() => {
    const width = 500;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 60;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg
      .selectAll("g.chart-content")
      .data([null])
      .join("g")
      .attr("class", "chart-content")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const color = d3
      .scaleOrdinal()
      .domain(PREDICTION_LABELS)
      .range(["#39594D", "#FF7556", "#D18EE2", "#F0C966"]);

    const pie = d3
      .pie()
      .value((d) => d.value)
      .sort(null)
      .padAngle(0.08);

    const data_ready = pie(chartData.filter((d) => d.value > 0.01));

    const arc = d3
      .arc()
      .innerRadius(radius * 0.75)
      .outerRadius(radius)
      .cornerRadius(20);

    const outerArc = d3
      .arc()
      .innerRadius(radius * 1.1)
      .outerRadius(radius * 1.1);


    const paths = g.selectAll("path").data(data_ready, (d) => d.data.label);
    paths
      .enter()
      .append("path")
      .attr("fill", (d) => color(d.data.label))
      .each(function (d) {
        this._current = { startAngle: d.endAngle, endAngle: d.endAngle };
      })
      .merge(paths)
      .transition("update")
      .duration(750)
      .attrTween("d", function (d) {
        const i = d3.interpolate(this._current, d);
        this._current = d;
        return (t) => arc(i(t));
      });

    paths.exit().remove();
    const updateElements = (selection, elementName, elementClass) => {
      selection
        .exit()
        .transition()
        .duration(350)
        .style("opacity", 0)
        .remove();
      return selection
        .enter()
        .append(elementName)
        .attr("class", elementClass)
        .style("opacity", 0)
        .merge(selection);
    };

    const textValues = g.selectAll("text.value").data(data_ready, (d) => d.data.label);
    updateElements(textValues, "text", "value")
      .attr("transform", (d) => `translate(${arc.centroid(d)})`)
      .text((d) => `${(d.data.value * 100).toFixed(0)}%`)
      .style("opacity", 1)
      .style("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", isDark ? "#222" : "#fff");

    const polylines = g.selectAll("polyline").data(data_ready, (d) => d.data.label);
    updateElements(polylines, "polyline", "lines")
      .attr("stroke", isDark ? "#aaa" : "#555")
      .style("fill", "none")
      .attr("stroke-width", 1)
      .attr("points", (d) => {
        const posA = arc.centroid(d);
        const posB = outerArc.centroid(d);
        const posC = outerArc.centroid(d);
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        posC[0] = radius * 1.2 * (midangle < Math.PI ? 1 : -1);
        return [posA, posB, posC];
      })
      .style("opacity", 1);

    const textLabels = g.selectAll("text.label").data(data_ready, (d) => d.data.label);
    updateElements(textLabels, "text", "label")
      .attr("transform", (d) => {
        const pos = outerArc.centroid(d);
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        pos[0] = radius * 1.25 * (midangle < Math.PI ? 1 : -1);
        return `translate(${pos})`;
      })
      .text((d) => d.data.label)
      .style("text-anchor", (d) =>
        (d.startAngle + d.endAngle) / 2 < Math.PI ? "start" : "end"
      )
      .style("fill", isDark ? theme.palette.text.primary : theme.palette.text.secondary)
      .style("font-size", "14px")
      .style("opacity", 1);
  }, [chartData, isDark, theme]);

  return (
    <Box sx={{ textAlign: "center", mt: 4 }}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: "bold",
          color: isDark ? "#EF9B7D" : "#D95C39",
          mb: 1,
        }}
      >
        Predicted Traffic Probabilities
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{
          color: isDark ? 'grey.400' : 'grey.700',
          mb: 1,
          fontSize: '1rem'
        }}
      >
        A breakdown of predicted network traffic types based on different scenarios.
      </Typography>
      <svg ref={svgRef}></svg>
      <Stack
        direction="row"
        spacing={2}
        justifyContent="center"
        sx={{ mt: 2 }}
      >
        {Object.keys(piePresets).map((presetName) => (
          <Button
            key={presetName}
            variant={activePreset === presetName ? "contained" : "outlined"}
            onClick={() => handlePresetClick(presetName)}
            sx={{
              ...(activePreset === presetName && {
                backgroundColor: isDark ? "#F0C966" : "#000",
                color: isDark ? "#000" : "#FFF",
              }),
              ...(activePreset !== presetName && {
                borderColor: isDark ? "#F0C966" : "#000",
                color: isDark ? "#F0C966" : "#000",
              }),
            }}
          >
            {presetName}
          </Button>
        ))}
      </Stack>
    </Box>
  );
};

export default PieChart;