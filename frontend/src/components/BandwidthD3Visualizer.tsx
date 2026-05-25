"use client";

import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";

interface BandwidthD3VisualizerProps {
  numVertices: number;
  edges: number[][];
  order?: number[];
  criticalEdges?: number[][];
  bandwidth?: number;
}

function validOrder(numVertices: number, order?: number[]) {
  if (!order || order.length !== numVertices) {
    return Array.from({ length: numVertices }, (_, i) => i);
  }
  return order;
}

export default function BandwidthD3Visualizer({
  numVertices,
  edges,
  order,
  criticalEdges = [],
  bandwidth,
}: BandwidthD3VisualizerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const displayOrder = useMemo(() => validOrder(numVertices, order), [numVertices, order]);
  const criticalSet = useMemo(() => {
    const set = new Set<string>();
    for (const [u, v] of criticalEdges) {
      set.add(`${Math.min(u, v)}-${Math.max(u, v)}`);
    }
    return set;
  }, [criticalEdges]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth || 900;
    const height = 260;
    const margin = { left: 38, right: 38, top: 36, bottom: 52 };
    const x = d3
      .scalePoint<number>()
      .domain(displayOrder)
      .range([margin.left, width - margin.right])
      .padding(0.45);
    const yBase = height - margin.bottom;
    const position = new Map(displayOrder.map((node, index) => [node, index]));
    const visibleEdges = edges
      .map(([u, v]) => [u, v])
      .filter(([u, v]) => position.has(u) && position.has(v) && u !== v);

    svg.attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("rx", 18)
      .attr("fill", "rgba(2,6,23,0.42)");

    svg
      .append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", yBase)
      .attr("y2", yBase)
      .attr("stroke", "rgba(255,255,255,0.18)")
      .attr("stroke-width", 2);

    const edgeGroup = svg.append("g").attr("fill", "none");
    edgeGroup
      .selectAll("path")
      .data(visibleEdges)
      .join("path")
      .attr("d", ([u, v]) => {
        const xu = x(u) ?? margin.left;
        const xv = x(v) ?? margin.left;
        const span = Math.abs((position.get(u) ?? 0) - (position.get(v) ?? 0));
        const arcHeight = Math.max(28, Math.min(130, span * 16));
        return `M ${xu} ${yBase - 10} Q ${(xu + xv) / 2} ${yBase - arcHeight} ${xv} ${yBase - 10}`;
      })
      .attr("stroke", ([u, v]) => criticalSet.has(`${Math.min(u, v)}-${Math.max(u, v)}`) ? "#facc15" : "rgba(148,163,184,0.28)")
      .attr("stroke-width", ([u, v]) => criticalSet.has(`${Math.min(u, v)}-${Math.max(u, v)}`) ? 3.2 : 1.2)
      .attr("stroke-linecap", "round")
      .attr("stroke-dasharray", function () {
        const length = (this as SVGPathElement).getTotalLength();
        return `${length} ${length}`;
      })
      .attr("stroke-dashoffset", function () {
        return (this as SVGPathElement).getTotalLength();
      })
      .transition()
      .duration(720)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);

    const nodes = svg.append("g").selectAll("g").data(displayOrder).join("g");
    nodes
      .attr("transform", (node) => `translate(${x(node) ?? margin.left},${yBase})`)
      .style("opacity", 0)
      .transition()
      .duration(520)
      .delay((_node, index) => index * 28)
      .style("opacity", 1);

    nodes
      .append("circle")
      .attr("r", 14)
      .attr("fill", (node) => criticalEdges.some(([u, v]) => u === node || v === node) ? "#facc15" : "#22d3ee")
      .attr("stroke", "rgba(255,255,255,0.78)")
      .attr("stroke-width", 2)
      .attr("filter", "drop-shadow(0 0 10px rgba(34,211,238,0.45))");

    nodes
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("fill", "#020617")
      .attr("font-size", 10)
      .attr("font-weight", 800)
      .text((node) => node);

    nodes
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 34)
      .attr("fill", "rgba(255,255,255,0.56)")
      .attr("font-size", 10)
      .text((_node, index) => index);

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 22)
      .attr("fill", "rgba(255,255,255,0.78)")
      .attr("font-size", 12)
      .attr("font-weight", 700)
      .text(`D3 bandwidth layout${bandwidth !== undefined ? ` - bandwidth ${bandwidth}` : ""}`);
  }, [bandwidth, criticalEdges, criticalSet, displayOrder, edges]);

  return (
    <div className="glass overflow-hidden p-3">
      <svg ref={svgRef} className="h-[260px] w-full" />
    </div>
  );
}
