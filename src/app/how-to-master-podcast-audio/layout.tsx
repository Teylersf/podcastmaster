import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Master Podcast Audio for Free | Complete 2025 Guide",
  description: "Learn how to master your podcast audio for free using the professional voice-only method. Step-by-step guides for Audacity, DaVinci Resolve, Premiere Pro, Final Cut, GarageBand, and more. Get broadcast-quality results in minutes.",
  keywords: [
    "how to master podcast audio",
    "podcast mastering tutorial",
    "free podcast mastering",
    "master podcast audio free",
    "podcast audio mastering guide",
    "voice mastering tutorial",
    "podcast production guide",
    "audacity podcast mastering",
    "davinci resolve podcast audio",
    "premiere pro podcast mastering",
    "final cut podcast audio",
    "garageband podcast mastering",
    "logic pro podcast",
    "reaper podcast mastering",
    "pro tools podcast",
    "hindenburg journalist tutorial",
    "descript podcast editing",
    "podcast audio quality",
    "podcast loudness",
    "LUFS podcast",
    "podcast EQ",
    "podcast compression",
    "voice only mastering",
    "podcast mixing and mastering",
    "professional podcast audio",
    "broadcast quality podcast",
    "podcast audio processing",
    "podcast audio editing tutorial",
    "how to improve podcast audio",
    "podcast audio tips",
    "best podcast audio settings",
    "podcast audio export settings",
    "capcut podcast editing",
    "adobe audition podcast",
  ],
  authors: [{ name: "Free Podcast Mastering" }],
  creator: "Free Podcast Mastering",
  publisher: "Free Podcast Mastering",
  alternates: {
    canonical: "https://freepodcastmastering.com/how-to-master-podcast-audio",
  },
  openGraph: {
    type: "article",
    locale: "en_US",
    url: "https://freepodcastmastering.com/how-to-master-podcast-audio",
    siteName: "Free Podcast Mastering",
    title: "How to Master Podcast Audio for Free | Complete 2025 Guide",
    description: "The ultimate guide to professional podcast mastering. Learn the voice-only method used by pro studios. Step-by-step tutorials for 12+ audio and video editors.",
    images: [
      {
        url: "/og-guide.png",
        width: 1200,
        height: 630,
        alt: "How to Master Podcast Audio - Complete Guide",
      },
    ],
    publishedTime: "2025-01-01T00:00:00Z",
    modifiedTime: new Date().toISOString(),
    authors: ["Free Podcast Mastering"],
    section: "Tutorials",
    tags: ["podcast", "audio mastering", "tutorial", "guide", "free tools"],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Master Podcast Audio for Free | Complete 2025 Guide",
    description: "The ultimate guide to professional podcast mastering. Learn the voice-only method with step-by-step tutorials for 12+ editors.",
    images: ["/og-guide.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD structured data for the guide
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Master Podcast Audio for Free",
  "description": "Learn how to master your podcast audio for free using the professional voice-only method. Get broadcast-quality results in minutes.",
  "image": "https://freepodcastmastering.com/og-guide.png",
  "totalTime": "PT30M",
  "estimatedCost": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": "0"
  },
  "supply": [
    {
      "@type": "HowToSupply",
      "name": "Raw podcast audio file"
    },
    {
      "@type": "HowToSupply", 
      "name": "Audio or video editing software"
    }
  ],
  "tool": [
    {
      "@type": "HowToTool",
      "name": "Free Podcast Mastering (freepodcastmastering.com)"
    },
    {
      "@type": "HowToTool",
      "name": "Audio editor (Audacity, GarageBand, etc.)"
    }
  ],
  "step": [
    {
      "@type": "HowToStep",
      "name": "Prepare Your Project",
      "text": "Open your podcast project in your audio or video editor. Make sure all voice tracks are properly labeled.",
      "position": 1
    },
    {
      "@type": "HowToStep",
      "name": "Mute Non-Voice Tracks",
      "text": "Mute or disable all tracks that are not voice recordings, including intro music, background music, and sound effects.",
      "position": 2
    },
    {
      "@type": "HowToStep",
      "name": "Export Voice-Only Audio",
      "text": "Export your project with only voice tracks enabled. Use WAV format at 44.1 kHz or 48 kHz for best quality.",
      "position": 3
    },
    {
      "@type": "HowToStep",
      "name": "Master with Free Podcast Mastering",
      "text": "Upload your voice-only audio file to freepodcastmastering.com, select the voice-optimized preset, and download the mastered file.",
      "position": 4
    },
    {
      "@type": "HowToStep",
      "name": "Import Mastered Audio",
      "text": "Import the mastered audio file back into your project and align it with your timeline.",
      "position": 5
    },
    {
      "@type": "HowToStep",
      "name": "Re-enable Other Tracks",
      "text": "Unmute your music and sound effects tracks. Adjust volume levels as needed.",
      "position": 6
    },
    {
      "@type": "HowToStep",
      "name": "Final Export",
      "text": "Export your complete podcast with all tracks enabled using your platform's recommended settings.",
      "position": 7
    }
  ]
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is Free Podcast Mastering really free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! Free users can master 2 files per week at no cost. There are no watermarks, no quality restrictions, and no signup required. Premium users get unlimited mastering and additional features."
      }
    },
    {
      "@type": "Question",
      "name": "What file formats do you support?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We support WAV, MP3, FLAC, M4A, AIFF, and OGG formats. For best results, we recommend uploading in WAV format at 44.1 kHz or 48 kHz."
      }
    },
    {
      "@type": "Question",
      "name": "How long does mastering take?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Processing time is typically 10-40 minutes per hour of audio, depending on file size and server load. You can sign up for email notifications to be alerted when your file is ready."
      }
    },
    {
      "@type": "Question",
      "name": "Will mastering fix my bad recording?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Mastering can significantly improve good recordings, but it can't fix fundamental issues like heavy background noise, distortion, or room echo. Always aim for the best possible recording quality."
      }
    },
    {
      "@type": "Question",
      "name": "Should I master before or after adding music?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We recommend mastering your voice tracks separately (before adding music), then mixing the mastered voice with your music. This gives the best results."
      }
    },
    {
      "@type": "Question",
      "name": "What's the difference between mixing and mastering?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Mixing involves balancing multiple tracks (adjusting levels, panning, effects). Mastering is the final step that polishes the overall sound, ensures consistent loudness, and prepares audio for distribution."
      }
    },
    {
      "@type": "Question",
      "name": "Can I use this for video podcasts?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Absolutely! Extract or export just the audio track from your video editor, master it with our tool, then import the mastered audio back into your video project."
      }
    },
    {
      "@type": "Question",
      "name": "What loudness level does your mastering target?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our tool targets -16 LUFS, which is the recommended standard for podcasts and compatible with all major platforms including Spotify, Apple Podcasts, and YouTube."
      }
    }
  ]
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Master Podcast Audio for Free - Complete 2025 Guide",
  "description": "Learn how to master your podcast audio for free using the professional voice-only method. Step-by-step guides for 12+ audio and video editors.",
  "image": "https://freepodcastmastering.com/og-guide.png",
  "author": {
    "@type": "Organization",
    "name": "Free Podcast Mastering",
    "url": "https://freepodcastmastering.com"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Free Podcast Mastering",
    "url": "https://freepodcastmastering.com"
  },
  "datePublished": "2025-01-01T00:00:00Z",
  "dateModified": new Date().toISOString(),
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://freepodcastmastering.com/how-to-master-podcast-audio"
  }
};

export default function HowToMasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {children}
    </>
  );
}

