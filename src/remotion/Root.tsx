import { Composition } from "remotion";
import { PodcastVideo, podcastVideoSchema } from "./PodcastVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* YouTube Format - 1920x1080 */}
      <Composition
        id="PodcastVideo-YouTube"
        component={PodcastVideo}
        durationInFrames={3000}
        fps={30}
        width={1920}
        height={1080}
        schema={podcastVideoSchema}
        defaultProps={{
          audioUrl: "",
          title: "Your Podcast Title",
          subtitle: "Episode 1",
          captions: [],
          backgroundType: "gradient",
          backgroundColor: "#1a1a2e",
          gradientFrom: "#1a1a2e",
          gradientTo: "#16213e",
          accentColor: "#f97316",
          showWaveform: true,
          showProgressBar: true,
          logoUrl: null,
          aspectRatio: "16:9",
          template: "waveform",
          backgroundImageUrl: null,
          captionStyle: "highlight",
        }}
      />
      
      {/* Vertical/Shorts Format - 1080x1920 */}
      <Composition
        id="PodcastVideo-Vertical"
        component={PodcastVideo}
        durationInFrames={3000}
        fps={30}
        width={1080}
        height={1920}
        schema={podcastVideoSchema}
        defaultProps={{
          audioUrl: "",
          title: "Your Podcast",
          subtitle: "",
          captions: [],
          backgroundType: "gradient",
          backgroundColor: "#1a1a2e",
          gradientFrom: "#1a1a2e",
          gradientTo: "#16213e",
          accentColor: "#f97316",
          showWaveform: true,
          showProgressBar: true,
          logoUrl: null,
          aspectRatio: "9:16",
          template: "waveform",
          backgroundImageUrl: null,
          captionStyle: "highlight",
        }}
      />

      {/* High Quality 60fps YouTube */}
      <Composition
        id="PodcastVideo-YouTube-60fps"
        component={PodcastVideo}
        durationInFrames={6000}
        fps={60}
        width={1920}
        height={1080}
        schema={podcastVideoSchema}
        defaultProps={{
          audioUrl: "",
          title: "Your Podcast Title",
          subtitle: "Episode 1",
          captions: [],
          backgroundType: "gradient",
          backgroundColor: "#1a1a2e",
          gradientFrom: "#1a1a2e",
          gradientTo: "#16213e",
          accentColor: "#f97316",
          showWaveform: true,
          showProgressBar: true,
          logoUrl: null,
          aspectRatio: "16:9",
          template: "waveform",
          backgroundImageUrl: null,
          captionStyle: "highlight",
        }}
      />
    </>
  );
};
