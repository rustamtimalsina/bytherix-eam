"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";

interface TiltCard3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // Maximum tilt angle in degrees (default: 8)
  glare?: boolean; // Enable specular glare highlight
  elevation?: boolean; // Subtle 3D lift on hover
}

export function TiltCard3D({
  children,
  className = "",
  maxTilt = 7,
  glare = true,
  elevation = true,
  ...rest
}: TiltCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Mouse position from 0 to 1
      const mouseX = Math.max(0, Math.min(1, (e.clientX - rect.left) / width));
      const mouseY = Math.max(0, Math.min(1, (e.clientY - rect.top) / height));

      // Calculate rotation angles (-maxTilt to +maxTilt)
      const rotateX = (0.5 - mouseY) * (maxTilt * 2);
      const rotateY = (mouseX - 0.5) * (maxTilt * 2);

      setTilt({ x: rotateX, y: rotateY });

      if (glare) {
        setGlarePos({
          x: mouseX * 100,
          y: mouseY * 100,
          opacity: 0.18,
        });
      }
    },
    [maxTilt, glare, prefersReducedMotion]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // Smooth reset back to flat
    setTilt({ x: 0, y: 0 });
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  if (prefersReducedMotion) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }

  const transformStyle = isHovered
    ? `perspective(1000px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) ${
        elevation ? "scale3d(1.015, 1.015, 1.015) translateZ(8px)" : ""
      }`
    : "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0px)";

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transformStyle: "preserve-3d",
        transition: isHovered
          ? "transform 0.1s ease-out"
          : "transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)",
        willChange: "transform",
      }}
      className={`relative overflow-hidden ${className}`}
      {...rest}
    >
      {/* Specular Glare / Light Reflection Layer */}
      {glare && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
          style={{
            opacity: glarePos.opacity,
            background: `radial-gradient(circle 350px at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.22), transparent 70%)`,
          }}
        />
      )}

      {/* Card Content with subtle 3D depth */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
