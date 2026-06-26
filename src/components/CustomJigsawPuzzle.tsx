import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";

interface CustomJigsawPuzzleProps {
  key?: string | number;
  imageSrc: string;
  rows: number;
  cols: number;
  onSolved: () => void;
}

interface Piece {
  id: number;
  col: number;
  row: number;
  topTab: number;
  rightTab: number;
  bottomTab: number;
  leftTab: number;
  currentX: number;
  currentY: number;
  isPlaced: boolean;
  zIndex: number;
}

function generatePuzzle(
  rows: number,
  cols: number,
): Omit<Piece, "currentX" | "currentY" | "isPlaced" | "zIndex">[] {
  const pieces = [];
  // Generate random tabs for inner edges
  // 1 = out, -1 = in
  const verticalEdges = Array.from({ length: rows }, () =>
    Array.from({ length: cols - 1 }, () => (Math.random() > 0.5 ? 1 : -1)),
  );
  const horizontalEdges = Array.from({ length: rows - 1 }, () =>
    Array.from({ length: cols }, () => (Math.random() > 0.5 ? 1 : -1)),
  );

  let id = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pieces.push({
        id: id++,
        col: c,
        row: r,
        topTab: r === 0 ? 0 : -horizontalEdges[r - 1][c],
        rightTab: c === cols - 1 ? 0 : verticalEdges[r][c],
        bottomTab: r === rows - 1 ? 0 : horizontalEdges[r][c],
        leftTab: c === 0 ? 0 : -verticalEdges[r][c - 1],
      });
    }
  }
  return pieces;
}

const drawEdge = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tabType: number,
  tabSize: number,
) => {
  if (tabType === 0) return `L ${x1} ${y1}`;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L = Math.hypot(dx, dy);
  const nx = dx / L;
  const ny = dy / L;
  const px = ny * tabType;
  const py = -nx * tabType;

  const pt = (t: number, n: number) => {
    const x = x0 + t * dx + n * tabSize * px;
    const y = y0 + t * dy + n * tabSize * py;
    return `${x},${y}`;
  };

  const p1 = pt(0.38, 0);
  const c1_1 = pt(0.38, 0);
  const c1_2 = pt(0.3, 0.2);
  const p2 = pt(0.3, 0.6);

  const c2_1 = pt(0.3, 1.4);
  const c2_2 = pt(0.7, 1.4);
  const p3 = pt(0.7, 0.6);

  const c3_1 = pt(0.7, 0.2);
  const c3_2 = pt(0.62, 0);
  const p4 = pt(0.62, 0);

  const p5 = pt(1, 0);

  return `L ${p1} C ${c1_1} ${c1_2} ${p2} C ${c2_1} ${c2_2} ${p3} C ${c3_1} ${c3_2} ${p4} L ${p5}`;
};

export default function CustomJigsawPuzzle({
  imageSrc,
  rows,
  cols,
  onSolved,
}: CustomJigsawPuzzleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [maxZIndex, setMaxZIndex] = useState(10);
  const [solvedCount, setSolvedCount] = useState(0);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current || !boardRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === containerRef.current) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
        if (entry.target === boardRef.current) {
          setBoardSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    observer.observe(boardRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize
  useEffect(() => {
    if (containerSize.width === 0 || boardSize.width === 0) return;

    const initialPieces = generatePuzzle(rows, cols);

    const boardLeft = boardRef.current
      ? boardRef.current.offsetLeft
      : (containerSize.width - boardSize.width) / 2;
    const boardTop = boardRef.current
      ? boardRef.current.offsetTop
      : (containerSize.height - boardSize.height) / 2;
    const boardRight = boardLeft + boardSize.width;
    const boardBottom = boardTop + boardSize.height;

    // Define the tray area (left 45% of the container, or top area on mobile)
    const isMobile = containerSize.width < 768;
    const trayWidth = isMobile
      ? containerSize.width
      : containerSize.width * 0.45;
    const trayHeight = isMobile ? boardTop : containerSize.height;

    const pw = boardSize.width / cols;
    const ph = boardSize.height / rows;

    const spots: { x: number; y: number }[] = [];

    // Dynamically adjust columns based on number of pieces to fit in tray
    const numPieces = rows * cols;
    let columns = 2;
    if (numPieces > 10) columns = 3;
    if (numPieces > 18) columns = 4;
    
    // On mobile, tray is on top, usually wider.
    if (isMobile) {
      columns = Math.max(columns, 4);
    }

    const paddingX = 20; // padding around columns
    const cellW = (trayWidth - paddingX) / columns;

    // Scale the piece so it fits neatly
    const pieceScale = Math.min(0.6, (cellW - 10) / pw); 
    const cellH = ph * pieceScale + 10;

    for (let i = 0; i < numPieces; i++) {
      const colIndex = i % columns;
      const rowIndex = Math.floor(i / columns);
      // Center the piece inside its cell
      const offsetX = (cellW - pw * pieceScale) / 2;
      // To place visual top-left at exactly colIndex * cellW, we adjust:
      const scaleOffsetW = pw * ((1 - pieceScale) / 2);
      const scaleOffsetH = ph * ((1 - pieceScale) / 2);

      const x = 10 + colIndex * cellW + offsetX - scaleOffsetW;
      const y = 10 + rowIndex * cellH - scaleOffsetH;
      spots.push({ x, y });
    }

    // Shuffle spots
    spots.sort(() => Math.random() - 0.5);

    const scattered = initialPieces.map((p, i) => {
      let x, y;
      if (i < spots.length) {
        x = spots[i].x;
        y = spots[i].y;
      } else {
        // fallback if not enough spots
        x = Math.random() * Math.max(0, trayWidth - cellW);
        y = Math.random() * Math.max(0, trayHeight - cellH);
      }

      // Ensure it's not out of bounds
      x = Math.max(0, Math.min(x, containerSize.width - pw));
      y = Math.max(0, Math.min(y, containerSize.height - ph));

      return {
        ...p,
        currentX: x,
        currentY: y,
        isPlaced: false,
        zIndex: Math.floor(Math.random() * 10),
      };
    });
    setPieces(scattered);
    setSolvedCount(0);
  }, [rows, cols, imageSrc, boardSize.width, containerSize.width]);

  const pw = boardSize.width / cols;
  const ph = boardSize.height / rows;
  const tabSize = Math.min(pw, ph) * 0.25;

  const isMobile = containerSize.width < 768;
  const trayWidth = isMobile ? containerSize.width : containerSize.width * 0.45;
  const numPieces = rows * cols;
  let columns = 2;
  if (numPieces > 10) columns = 3;
  if (numPieces > 18) columns = 4;
  if (isMobile) columns = Math.max(columns, 4);
  const cellW = (trayWidth - 20) / columns;
  const dynamicPieceScale = Math.min(0.6, (cellW - 10) / pw) || 0.6;

  const handleDragStart = (id: number) => {
    setMaxZIndex((prev) => prev + 1);
    setPieces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, zIndex: maxZIndex + 1 } : p)),
    );
  };

  const handleDragEnd = (id: number, event: any, info: any) => {
    const p = pieces.find((x) => x.id === id);
    if (!p) return;

    const boardRect = boardRef.current?.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!boardRect || !containerRect) return;

    // Expected position of the top-left of this piece's square relative to container
    const boardLeftRelative = boardRect.left - containerRect.left;
    const boardTopRelative = boardRect.top - containerRect.top;

    const expectedX = boardLeftRelative + p.col * pw;
    const expectedY = boardTopRelative + p.row * ph;

    // Piece's new logical top-left coordinate
    const newX = p.currentX + info.offset.x;
    const newY = p.currentY + info.offset.y;

    // Snapping distance
    const snapDist = Math.max(40, pw * 0.4);

    if (
      Math.abs(newX - expectedX) < snapDist &&
      Math.abs(newY - expectedY) < snapDist
    ) {
      // Snapped!
      setPieces((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                currentX: expectedX,
                currentY: expectedY,
                isPlaced: true,
              }
            : x,
        ),
      );

      const newSolvedCount = solvedCount + 1;
      setSolvedCount(newSolvedCount);
      if (newSolvedCount === pieces.length) {
        setTimeout(onSolved, 500);
      }
    } else {
      // Keep dropped pos exactly where it was dragged
      setPieces((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                currentX: newX,
                currentY: newY,
              }
            : x,
        ),
      );
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[70vh] min-h-[600px] max-h-[800px] overflow-hidden bg-slate-100 rounded-3xl border-4 border-slate-300"
    >
      {/* Visual Tray Background */}
      <div className="absolute top-0 left-0 w-full md:w-[45%] h-[30%] md:h-full bg-slate-200/60 border-b-4 md:border-b-0 md:border-r-4 border-slate-300 pointer-events-none flex flex-col items-center justify-center">
        <span className="text-slate-400 font-black text-2xl opacity-50 uppercase tracking-widest mt-auto mb-10 md:mb-auto md:mt-auto">
          Khay Chứa
        </span>
      </div>

      <div
        ref={boardRef}
        className="absolute top-auto bottom-5 left-1/2 md:top-1/2 md:right-[5%] md:left-auto md:bottom-auto transform -translate-x-1/2 md:translate-x-0 -translate-y-0 md:-translate-y-1/2 w-[90%] md:w-[45%] max-w-[450px] aspect-square bg-slate-200/50 rounded-lg border-2 border-dashed border-slate-400 shadow-inner"
      >
        {/* Placeholder image ghost */}
        <img
          src={imageSrc}
          className="w-full h-full object-cover opacity-30 pointer-events-none rounded-lg"
        />
      </div>

      {pieces.map((p) => {
        const d = `M 0 0 ${drawEdge(0, 0, pw, 0, p.topTab, tabSize)}${drawEdge(pw, 0, pw, ph, p.rightTab, tabSize)}${drawEdge(pw, ph, 0, ph, p.bottomTab, tabSize)}${drawEdge(0, ph, 0, 0, p.leftTab, tabSize)} Z`;

        return (
          <motion.div
            key={p.id}
            drag={!p.isPlaced}
            dragMomentum={false}
            onDragStart={() => handleDragStart(p.id)}
            onDragEnd={(e, info) => handleDragEnd(p.id, e, info)}
            initial={false}
            animate={{
              x: p.currentX,
              y: p.currentY,
              scale: p.isPlaced ? 1 : dynamicPieceScale, // Smaller when outside
              zIndex: p.isPlaced ? 1 : p.zIndex,
            }}
            whileDrag={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              position: "absolute",
              width: pw,
              height: ph,
              cursor: p.isPlaced ? "default" : "grab",
              pointerEvents: p.isPlaced ? "none" : "auto",
              filter: p.isPlaced
                ? "none"
                : "drop-shadow(2px 4px 6px rgba(0,0,0,0.3))",
            }}
          >
            {/* The SVG wrapper matches the exact bounding box of the piece including tabs */}
            <svg
              style={{
                position: "absolute",
                top: -tabSize,
                left: -tabSize,
                width: pw + 2 * tabSize,
                height: ph + 2 * tabSize,
                pointerEvents: "none",
              }}
              viewBox={`-${tabSize} -${tabSize} ${pw + 2 * tabSize} ${ph + 2 * tabSize}`}
            >
              <defs>
                <clipPath id={`clip-${p.id}`}>
                  <path d={d} />
                </clipPath>
              </defs>
              <g clipPath={`url(#clip-${p.id})`}>
                <image
                  href={imageSrc}
                  x={-p.col * pw}
                  y={-p.row * ph}
                  width={boardSize.width}
                  height={boardSize.height}
                  preserveAspectRatio="xMidYMid slice"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="2"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth="1"
                />
              </g>
            </svg>
          </motion.div>
        );
      })}
    </div>
  );
}
