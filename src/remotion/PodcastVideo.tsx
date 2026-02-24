"use client";

import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
} from "remotion";
import { z } from "zod";

// Caption segment type
export interface CaptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

// Schema for video props
export const podcastVideoSchema = z.object({
  audioUrl: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  captions: z.array(z.object({
    id: z.number(),
    start: z.number(),
    end: z.number(),
    text: z.string(),
  })).optional(),
  backgroundType: z.enum(["solid", "gradient", "image"]).optional(),
  backgroundColor: z.string().optional(),
  gradientFrom: z.string().optional(),
  gradientTo: z.string().optional(),
  accentColor: z.string().optional(),
  showWaveform: z.boolean().optional(),
  showProgressBar: z.boolean().optional(),
  logoUrl: z.string().nullable().optional(),
  aspectRatio: z.enum(["16:9", "9:16"]).optional(),
  template: z.enum(["waveform", "audiogram", "circles", "bars", "particles"]).optional(),
  backgroundImageUrl: z.string().nullable().optional(),
  captionStyle: z.enum(["highlight", "karaoke", "simple"]).optional(),
});

export type PodcastVideoProps = z.infer<typeof podcastVideoSchema>;

// ==================== VISUALIZATION COMPONENTS ====================

// 1. Classic Waveform
const WaveformVisualizer: React.FC<{
  frame: number;
  durationInFrames: number;
  color: string;
  height: number;
}> = ({ frame, color, height }) => {
  const bars = 48;
  const barWidth = 10;
  const gap = 6;
  
  const waveformData = useMemo(() => {
    return Array.from({ length: bars }, (_, i) => {
      const timeOffset = frame * 0.15;
      const barOffset = i * 0.3;
      
      const value = 
        Math.sin(timeOffset + barOffset) * 0.3 +
        Math.sin(timeOffset * 1.5 + barOffset * 1.2) * 0.2 +
        Math.sin(timeOffset * 0.7 + barOffset * 0.5) * 0.25 +
        0.15;
      
      return Math.max(0.08, Math.min(1, value));
    });
  }, [frame, bars]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: `${gap}px`,
        height: `${height}px`,
      }}
    >
      {waveformData.map((value, i) => (
        <div
          key={i}
          style={{
            width: `${barWidth}px`,
            height: `${value * height}px`,
            backgroundColor: color,
            borderRadius: `${barWidth / 2}px`,
            opacity: 0.7 + value * 0.3,
            boxShadow: `0 0 ${value * 20}px ${color}40`,
          }}
        />
      ))}
    </div>
  );
};

// 2. Circular Audiogram
const CircularAudiogram: React.FC<{
  frame: number;
  color: string;
  size: number;
}> = ({ frame, color, size }) => {
  const rings = 5;
  const barsPerRing = 24;
  
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
      }}
    >
      {Array.from({ length: rings }).map((_, ringIndex) => {
        const ringRadius = (size / 2) * (0.3 + ringIndex * 0.15);
        const ringPhase = frame * 0.1 + ringIndex * 0.5;
        
        return (
          <div
            key={ringIndex}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: ringRadius * 2,
              height: ringRadius * 2,
              transform: "translate(-50%, -50%)",
            }}
          >
            {Array.from({ length: barsPerRing }).map((_, barIndex) => {
              const angle = (barIndex / barsPerRing) * Math.PI * 2;
              const barValue = 
                Math.sin(ringPhase + angle * 2) * 0.3 +
                Math.sin(ringPhase * 1.5 + barIndex * 0.3) * 0.2 +
                0.5;
              const barHeight = Math.max(10, barValue * 60);
              
              return (
                <div
                  key={barIndex}
                  style={{
                    position: "absolute",
                    width: 4,
                    height: barHeight,
                    backgroundColor: color,
                    borderRadius: 2,
                    left: "50%",
                    top: "50%",
                    transformOrigin: "center bottom",
                    transform: `
                      translate(-50%, -100%)
                      rotate(${angle}rad)
                      translateY(-${ringRadius}px)
                    `,
                    opacity: 0.6 + barValue * 0.4,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// 3. Frequency Bars
const FrequencyBars: React.FC<{
  frame: number;
  color: string;
  width: number;
  height: number;
}> = ({ frame, color, width, height }) => {
  const bars = 32;
  const barWidth = (width - (bars - 1) * 4) / bars;
  
  const frequencies = useMemo(() => {
    return Array.from({ length: bars }, (_, i) => {
      const freq = i / bars;
      const timeOffset = frame * 0.12;
      
      const bass = Math.sin(timeOffset * 0.5) * 0.4 + 0.4;
      const mid = Math.sin(timeOffset * 1.2 + i * 0.2) * 0.3 + 0.3;
      const treble = Math.sin(timeOffset * 2 + i * 0.4) * 0.2 + 0.2;
      
      // Mix based on frequency position (bass on left, treble on right)
      const bassWeight = Math.max(0, 1 - freq * 2);
      const trebleWeight = Math.max(0, (freq - 0.5) * 2);
      const midWeight = 1 - bassWeight - trebleWeight;
      
      return Math.max(0.05, bass * bassWeight + mid * midWeight + treble * trebleWeight);
    });
  }, [frame, bars]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: "4px",
        width: width,
        height: height,
      }}
    >
      {frequencies.map((value, i) => (
        <div
          key={i}
          style={{
            width: barWidth,
            height: `${value * 100}%`,
            background: `linear-gradient(to top, ${color}, ${color}60)`,
            borderRadius: barWidth / 2,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  );
};

// 4. Floating Particles
const ParticleField: React.FC<{
  frame: number;
  color: string;
  width: number;
  height: number;
}> = ({ frame, color, width, height }) => {
  const particles = 30;
  
  return (
    <div
      style={{
        width: width,
        height: height,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {Array.from({ length: particles }).map((_, i) => {
        const baseX = (i % 6) / 5;
        const baseY = Math.floor(i / 6) / 4;
        const phase = frame * 0.02 + i * 0.5;
        
        const x = baseX * width + Math.sin(phase) * 30;
        const y = baseY * height + Math.cos(phase * 0.7) * 20;
        const scale = 0.5 + Math.sin(phase * 2) * 0.3 + 0.2;
        const opacity = 0.3 + Math.sin(phase) * 0.2;
        
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 40 * scale,
              height: 40 * scale,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
              left: x,
              top: y,
              opacity,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </div>
  );
};

// 5. Concentric Circles Pulse
const PulseCircles: React.FC<{
  frame: number;
  color: string;
  size: number;
}> = ({ frame, color, size }) => {
  const circles = 6;
  
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
      }}
    >
      {Array.from({ length: circles }).map((_, i) => {
        const pulsePhase = (frame * 0.05 + i * 0.3) % (Math.PI * 2);
        const scale = 0.3 + i * 0.15 + Math.sin(pulsePhase) * 0.1;
        const opacity = 0.1 + Math.sin(pulsePhase) * 0.1;
        
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: size * scale,
              height: size * scale,
              borderRadius: "50%",
              border: `3px solid ${color}`,
              transform: "translate(-50%, -50%)",
              opacity,
            }}
          />
        );
      })}
      
      {/* Center dot */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: color,
          transform: "translate(-50%, -50%)",
          boxShadow: `0 0 40px ${color}`,
        }}
      />
    </div>
  );
};

// ==================== UI COMPONENTS ====================

const ProgressBar: React.FC<{
  progress: number;
  color: string;
  width: number;
}> = ({ progress, color, width }) => {
  return (
    <div
      style={{
        width: `${width}px`,
        height: "8px",
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${color}, ${color}80)`,
          borderRadius: "4px",
          boxShadow: `0 0 10px ${color}50`,
        }}
      />
    </div>
  );
};

const CaptionDisplay: React.FC<{
  captions: CaptionSegment[];
  currentTime: number;
  accentColor: string;
  style: "highlight" | "karaoke" | "simple";
  isVertical: boolean;
}> = ({ captions, currentTime, accentColor, style, isVertical }) => {
  const currentCaption = captions?.find(
    (cap) => currentTime >= cap.start && currentTime <= cap.end
  );

  if (!currentCaption) return null;

  const progressInCaption = 
    (currentTime - currentCaption.start) / 
    (currentCaption.end - currentCaption.start);

  if (style === "karaoke") {
    const words = currentCaption.text.split(" ");
    const wordsToHighlight = Math.floor(progressInCaption * words.length);
    
    return (
      <div
        style={{
          position: "absolute",
          bottom: isVertical ? "12%" : "10%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          maxWidth: "85%",
          padding: isVertical ? "16px 32px" : "20px 40px",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(12px)",
          borderRadius: "16px",
          border: `2px solid ${accentColor}30`,
        }}
      >
        <p style={{ fontSize: isVertical ? "32px" : "40px", fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
          {words.map((word, i) => (
            <span
              key={i}
              style={{
                color: i < wordsToHighlight ? accentColor : "rgba(255,255,255,0.5)",
                transition: "color 0.1s ease",
                marginRight: "0.3em",
              }}
            >
              {word}
            </span>
          ))}
        </p>
      </div>
    );
  }

  if (style === "highlight") {
    return (
      <div
        style={{
          position: "absolute",
          bottom: isVertical ? "12%" : "10%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          maxWidth: "85%",
          padding: isVertical ? "16px 32px" : "20px 40px",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(12px)",
          borderRadius: "16px",
          border: `2px solid ${accentColor}40`,
        }}
      >
        <p
          style={{
            color: "#ffffff",
            fontSize: isVertical ? "32px" : "40px",
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.4,
            textShadow: `0 0 30px ${accentColor}50`,
          }}
        >
          {currentCaption.text}
        </p>
      </div>
    );
  }

  // Simple style
  return (
    <div
      style={{
        position: "absolute",
        bottom: isVertical ? "12%" : "10%",
        left: "50%",
        transform: "translateX(-50%)",
        textAlign: "center",
        maxWidth: "85%",
      }}
    >
      <p
        style={{
          color: "#ffffff",
          fontSize: isVertical ? "28px" : "36px",
          fontWeight: 600,
          margin: 0,
          lineHeight: 1.4,
          textShadow: "0 2px 20px rgba(0,0,0,0.8)",
        }}
      >
        {currentCaption.text}
      </p>
    </div>
  );
};

// ==================== MAIN VIDEO COMPONENT ====================

export const PodcastVideo: React.FC<PodcastVideoProps> = ({
  audioUrl,
  title,
  subtitle,
  captions = [],
  backgroundType = "gradient",
  backgroundColor = "#1a1a2e",
  gradientFrom = "#1a1a2e",
  gradientTo = "#16213e",
  accentColor = "#f97316",
  showWaveform = true,
  showProgressBar = true,
  logoUrl,
  aspectRatio = "16:9",
  template = "waveform",
  backgroundImageUrl,
  captionStyle = "highlight",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();
  
  const currentTime = frame / fps;
  const progress = Math.min(frame / durationInFrames, 1);

  const isVertical = aspectRatio === "9:16";

  // Background style
  const backgroundStyle = useMemo(() => {
    if (backgroundImageUrl) {
      return {
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    
    switch (backgroundType) {
      case "gradient":
        return {
          background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
        };
      case "solid":
        return { backgroundColor };
      default:
        return { backgroundColor };
    }
  }, [backgroundType, backgroundColor, gradientFrom, gradientTo, backgroundImageUrl]);

  // Animation values
  const titleOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Render the selected visualization
  const renderVisualization = () => {
    const vizHeight = isVertical ? 300 : 400;
    const vizWidth = isVertical ? 500 : 900;
    
    switch (template) {
      case "audiogram":
        return (
          <CircularAudiogram
            frame={frame}
            color={accentColor}
            size={isVertical ? 280 : 400}
          />
        );
      case "bars":
        return (
          <FrequencyBars
            frame={frame}
            color={accentColor}
            width={vizWidth}
            height={vizHeight}
          />
        );
      case "particles":
        return (
          <ParticleField
            frame={frame}
            color={accentColor}
            width={vizWidth}
            height={vizHeight}
          />
        );
      case "circles":
        return (
          <PulseCircles
            frame={frame}
            color={accentColor}
            size={isVertical ? 300 : 450}
          />
        );
      case "waveform":
      default:
        return (
          <WaveformVisualizer
            frame={frame}
            durationInFrames={durationInFrames}
            color={accentColor}
            height={vizHeight}
          />
        );
    }
  };

  return (
    <AbsoluteFill style={backgroundStyle}>
      {/* Dark overlay for background image */}
      {backgroundImageUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        />
      )}

      {/* Animated background orbs (only if no background image) */}
      {!backgroundImageUrl && (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: `${Math.random() * 400 + 200}px`,
                height: `${Math.random() * 400 + 200}px`,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${accentColor}12 0%, transparent 70%)`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: `translate(-50%, -50%) scale(${1 + Math.sin(frame * 0.015 + i) * 0.25})`,
                opacity: 0.25 + Math.sin(frame * 0.008 + i) * 0.15,
                filter: "blur(40px)",
              }}
            />
          ))}
        </div>
      )}

      {/* Logo */}
      {logoUrl && (
        <div
          style={{
            position: "absolute",
            top: isVertical ? "6%" : "5%",
            left: "50%",
            transform: "translateX(-50%)",
            opacity: 0.95,
            zIndex: 10,
          }}
        >
          <Img
            src={logoUrl}
            style={{
              width: isVertical ? "100px" : "130px",
              height: isVertical ? "100px" : "130px",
              objectFit: "contain",
              borderRadius: "20px",
            }}
          />
        </div>
      )}

      {/* Title Section */}
      <div
        style={{
          position: "absolute",
          top: isVertical ? "22%" : "15%",
          left: "50%",
          transform: `translateX(-50%) translateY(${titleY}px)`,
          textAlign: "center",
          opacity: titleOpacity,
          width: "88%",
          zIndex: 10,
        }}
      >
        <h1
          style={{
            fontSize: isVertical ? "48px" : "64px",
            fontWeight: 800,
            color: "#ffffff",
            margin: 0,
            marginBottom: "12px",
            textShadow: "0 4px 30px rgba(0,0,0,0.5)",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: isVertical ? "24px" : "28px",
              color: "rgba(255, 255, 255, 0.75)",
              margin: 0,
              fontWeight: 500,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Visualization */}
      {showWaveform && (
        <div
          style={{
            position: "absolute",
            top: isVertical ? "45%" : "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 5,
          }}
        >
          {renderVisualization()}
        </div>
      )}

      {/* Captions */}
      {captions && captions.length > 0 && (
        <CaptionDisplay
          captions={captions}
          currentTime={currentTime}
          accentColor={accentColor}
          style={captionStyle}
          isVertical={isVertical}
        />
      )}

      {/* Progress Bar */}
      {showProgressBar && (
        <div
          style={{
            position: "absolute",
            bottom: isVertical ? "6%" : "5%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
          }}
        >
          <ProgressBar
            progress={progress}
            color={accentColor}
            width={isVertical ? 600 : 900}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "10px",
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "18px",
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(durationInFrames / fps)}</span>
          </div>
        </div>
      )}

      {/* Audio */}
      {audioUrl && <Audio src={audioUrl} />}
    </AbsoluteFill>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
