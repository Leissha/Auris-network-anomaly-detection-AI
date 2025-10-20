import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import * as d3 from "d3";

const LiveHistogram = ({ data = [] }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const svgRef = useRef(null);
  const tooltipRef = useRef(null); 
  const [paused, setPaused] = useState(false);
  const TRAFFIC_TYPES = [
    "Audio",
    "Background",
    "Bruteforce",
    "DoS",
    "Information Gathering",
    "Mirai",
    "Text",
    "Video",
  ];
  const MALICIOUS_TYPES = new Set([
    "Bruteforce",
    "DoS",
    "Information Gathering",
    "Mirai",
  ]);
  const typeLookup = TRAFFIC_TYPES.reduce((acc, label) => {
    const key = label.toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
    acc[key] = label;
    return acc;
  }, {});

  const extractType = (d) => {
    const possibleKeys = ["type", "label", "category", "trafficType", "class"];
    for (const key of possibleKeys) {
      if (d && d[key] !== undefined && d[key] !== null && String(d[key]).length > 0) {
        return d[key];
      }
    }
    return null;
  };

  const normalizeType = (rawType) => {
    if (!rawType) return "Background";
    const cleanedKey = String(rawType).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (typeLookup[cleanedKey]) return typeLookup[cleanedKey];
    if (cleanedKey.includes("mirai")) return "Mirai";
    if (cleanedKey.includes("dos")) return "DoS";
    if (cleanedKey.includes("brute")) return "Bruteforce";
    if (cleanedKey.includes("info")) return "Information Gathering";
    if (cleanedKey.includes("audio")) return "Audio";
    if (cleanedKey.includes("video")) return "Video";
    if (cleanedKey.includes("text")) return "Text";
    const pretty = String(rawType)
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return pretty || "Background";
  };

  const computeConfidence = (bytes, observedMax = null) => {
    const b = Math.max(0, Number(bytes) || 0);
    if (b < 2000) return 20 + (b / 2000) * 10;
    if (b >= 8000) {
      if (observedMax && observedMax > 8000) {
        const denom = observedMax - 8000;
        const frac = Math.min((b - 8000) / denom, 1);
        return 90 + frac * 10;
      }
      return 90 + Math.min((b - 8000) / 2000, 1) * 10;
    }
    return 30 + ((b - 2000) / 6000) * 60; 
  };

  useEffect(() => {
    const width = 800;
    const height = 450;
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .style("background-color", isDark ? "#1A1414" : "#EAE6DE")
      .style("border-radius", "12px");
    svg.selectAll("*").remove();
    d3.select("body").selectAll(".d3-tooltip-livehist").remove();
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip-livehist")
      .style("position", "absolute")
      .style("z-index", "9999")
      .style("visibility", "hidden")
      .style("padding", "10px")
      .style("background", "rgba(0,0,0,0.75)")
      .style("border-radius", "6px")
      .style("color", "#fff")
      .style("font-size", "13px")
      .style("font-weight", "500")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.4)");
    tooltipRef.current = tooltip; 

    return () => {
      d3.select("body").selectAll(".d3-tooltip-livehist").remove();
    };
  }, [isDark]); 
  useEffect(() => {
    const width = 800;
    const height = 450;
    const margin = { top: 90, right: 40, bottom: 50, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const svg = d3.select(svgRef.current);
    svg.selectAll(".chart-group").remove();
    const chart = svg.append("g").attr("class", "chart-group").attr("transform", `translate(${margin.left},${margin.top})`);
    svg.selectAll(".chart-title").remove();
    svg
      .append("text")
      .attr("class", "chart-title")
      .attr("x", width / 2)
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .style("font-size", "22px")
      .style("font-weight", "700")
      .style("fill", isDark ? "#F0C966" : "#D95C39")
      .text("Unsupervised Traffic Confidence");

    svg.selectAll(".chart-subtitle").remove();
    svg
      .append("text")
      .attr("class", "chart-subtitle")
      .attr("x", width / 2)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", isDark ? "#AAA" : "#555")
      .text("DBSCAN Live model prediction confidence by traffic type");
    const axisColor = isDark ? "#E0DCC7" : "#444";
    const gridColor = isDark ? "#2A2A2A" : "#E0E0E0";

    const draw = (drawData) => {
      if (!drawData) drawData = [];
      const now = new Date();
      const earliest = new Date(now.getTime() - 20 * 1000);
      const xDomain = drawData.length >= 2 ? d3.extent(drawData, (d) => new Date(d.time)) : [earliest, now];
      const xScale = d3.scaleTime().domain(xDomain).range([0, innerWidth]);
      const observedMaxBytes = d3.max(drawData, (d) => d.bytes) || 1000;
      const yScale = d3.scaleLinear().domain([0, observedMaxBytes]).nice().range([innerHeight, 0]);
      chart.selectAll(".x-axis").remove();
      chart.selectAll(".y-axis").remove();
      chart.selectAll(".grid-lines").remove();
      chart
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat("%H:%M:%S")))
        .selectAll("text")
        .style("fill", axisColor)
        .style("font-size", "12px");

      chart
        .append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale).ticks(4).tickFormat((d) => `${Math.round(d / 1000)}k`))
        .selectAll("text")
        .style("fill", axisColor)
        .style("font-size", "12px");

      chart
        .append("g")
        .attr("class", "grid-lines")
        .selectAll("line")
        .data(yScale.ticks(4))
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", (d) => yScale(d))
        .attr("y2", (d) => yScale(d))
        .attr("stroke", gridColor)
        .attr("stroke-dasharray", "2,2");
      const barWidth = (innerWidth / Math.max(drawData.length, 20)) * 0.7;

      const bars = chart.selectAll(".bar").data(drawData, (d, i) => d.id ?? d.time ?? i);
      bars
        .exit()
        .transition()
        .duration(200)
        .attr("y", yScale(0))
        .attr("height", 0)
        .remove();

      const enter = bars
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => Math.max(xScale(new Date(d.time)) - barWidth / 2, 2))
        .attr("width", barWidth)
        .attr("y", yScale(0))
        .attr("height", 0)
        .style("cursor", "crosshair")
        .attr("fill", (d) => {
          const t = normalizeType(extractType(d));
          return MALICIOUS_TYPES.has(t) ? (isDark ? "#EF9B7D" : "#E2725B") : (isDark ? "#45A587" : "#2D8C6B");
        })
        .on("mouseover", function (event, d) {
          d3.select(this).style("opacity", 0.85);
          const tooltip = tooltipRef.current;
          if (!tooltip) return;
          const rawType = extractType(d);
          const type = normalizeType(rawType);
          const isMal = MALICIOUS_TYPES.has(type);
          const status = isMal ? "Malicious" : "Safe";
          const time = d3.timeFormat("%H:%M:%S")(new Date(d.time));
          const confidence = computeConfidence(d.bytes, observedMaxBytes);
          tooltip
            .html(
              `<div style="font-weight:600;">${status}</div>
               <div>Type: ${type}</div>
               <div>Time Sent: ${time}</div>
               <div>Confidence: ${confidence.toFixed(2)}%</div>`
            )
            .style("visibility", "visible")
            .style("opacity", 1);
        })
        .on("mousemove", (event) => {
          const tooltip = tooltipRef.current;
          if (!tooltip) return;
          tooltip.style("top", `${event.pageY - 10}px`).style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", function () {
          d3.select(this).style("opacity", 1);
          const tooltip = tooltipRef.current;
          if (!tooltip) return;
          tooltip.style("visibility", "hidden").style("opacity", 0);
        });
      const merged = enter.merge(bars);
      merged
        .transition()
        .duration(300)
        .attr("x", (d) => Math.max(xScale(new Date(d.time)) - barWidth / 2, 2))
        .attr("width", barWidth)
        .attr("y", (d) => yScale(d.bytes))
        .attr("height", (d) => innerHeight - yScale(d.bytes))
        .attr("fill", (d) => {
          const t = normalizeType(extractType(d));
          return MALICIOUS_TYPES.has(t) ? (isDark ? "#EF9B7D" : "#E2725B") : (isDark ? "#45A587" : "#2D8C6B");
        });
    };

    draw(data);
    svg.selectAll(".legend-group").remove();
    const legend = svg.append("g").attr("class", "legend-group").attr("transform", `translate(${width / 2 - 70}, 65)`);
    legend.append("rect").attr("x", 0).attr("width", 14).attr("height", 14).attr("fill", isDark ? "#45A587" : "#2D8C6B");
    legend
      .append("text")
      .attr("x", 20)
      .attr("y", 11)
      .style("fill", axisColor)
      .style("font-size", "13px")
      .text("Safe");
    legend.append("rect").attr("x", 90).attr("width", 14).attr("height", 14).attr("fill", isDark ? "#EF9B7D" : "#E2725B");
    legend
      .append("text")
      .attr("x", 110)
      .attr("y", 11)
      .style("fill", axisColor)
      .style("font-size", "13px")
      .text("Malicious");
    svgRef.current.__drawHistogram = draw;
    return () => {
      if (svgRef.current) svgRef.current.__drawHistogram = null;
    };
  }, [isDark]); // only re-create base chart when theme changes
  useEffect(() => {
    const svgEl = svgRef.current;
    const draw = svgEl ? svgEl.__drawHistogram : null;
    if (typeof draw === "function") {
      if (!paused) {
        draw(data);
      } else {
      }
    }
  }, [data, paused]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", p: 4, position: "relative" }}>
      <svg ref={svgRef} />
      <Box sx={{ mt: 2 }}>
        <IconButton
          onClick={() => setPaused((p) => !p)}
          sx={{
            backgroundColor: isDark ? "#333" : "#FFF",
            color: isDark ? "#FFD580" : "#D95C39",
            border: "1px solid",
            borderColor: isDark ? "#555" : "#CCC",
            "&:hover": { backgroundColor: isDark ? "#444" : "#F0F0F0" },
          }}
          aria-label={paused ? "Play updates" : "Pause updates"}
          title={paused ? "Play" : "Pause"}
        >
          {paused ? <PlayArrowIcon /> : <PauseIcon />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default LiveHistogram;