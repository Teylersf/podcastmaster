import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Caveat, Patrick_Hand } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "@/stack";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false, // Secondary font, don't preload
});

// Fonts for specific themes (hand-written, coloring-book)
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false, // Only used by specific themes
});

const patrickHand = Patrick_Hand({
  variable: "--font-patrick-hand",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: false, // Only used by specific themes
});

export const metadata: Metadata = {
  title: "Free AI Podcast Mastering | Free Online Podcast Mastering Tool",
  description: "Free AI podcast mastering tool. Master your podcast audio to broadcast quality instantly - no signup required. Professional podcast mastering with AI-powered audio processing. Upload, master, download - 100% free.",
  keywords: [
    "free podcast mastering",
    "free AI podcast mastering", 
    "podcast mastering free",
    "free audio mastering",
    "AI podcast mastering",
    "online podcast mastering",
    "free podcast audio mastering",
    "podcast mastering tool",
    "free podcast production",
    "podcast loudness",
    "podcast audio processing",
    "master podcast free",
    "podcast mastering online free",
  ],
  authors: [{ name: "Free Podcast Mastering" }],
  creator: "Free Podcast Mastering",
  publisher: "Free Podcast Mastering",
  metadataBase: new URL("https://freepodcastmastering.com"),
  alternates: {
    canonical: "https://freepodcastmastering.com",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://freepodcastmastering.com",
    siteName: "Free Podcast Mastering",
    title: "Free AI Podcast Mastering - Master Your Podcast Online Free",
    description: "Free AI-powered podcast mastering tool. Get broadcast-ready audio in minutes. No signup, no watermarks, 100% free. Upload your podcast and download professionally mastered audio.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Free AI Podcast Mastering Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free AI Podcast Mastering - Master Your Podcast Free",
    description: "Free AI-powered podcast mastering. Get broadcast-ready audio in minutes. No signup required, 100% free.",
    images: ["/og-image.png"],
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
  verification: {
    // Add your Google Search Console verification code here
    // google: "your-google-verification-code",
  },
};

// JSON-LD structured data for rich snippets
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Free Podcast Mastering",
  "url": "https://freepodcastmastering.com",
  "description": "Free AI-powered podcast mastering tool. Master your podcast audio to broadcast quality instantly with no signup required.",
  "applicationCategory": "MultimediaApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "Free AI podcast mastering",
    "No signup required",
    "Instant audio processing",
    "Professional broadcast quality",
    "Multiple output formats",
    "Loudness optimization"
  ]
};

// Script to prevent flash of wrong theme
// Priority: user's chosen theme > glassmorphism (default)
const themeScript = `
  (function() {
    try {
      var themes = ['glassmorphism','dark','light','pretty-pink','blue','green-ocean','purple-galaxy','boring-enterprise','grey-alien','matrix','hand-written','coloring-book','rainbow','chaos','orange-slim','yellow-sunshine','90s','80s','cringe','black-and-white'];
      var userChosen = localStorage.getItem('podcast-theme-chosen');
      var theme = 'glassmorphism';
      
      if (userChosen && themes.indexOf(userChosen) !== -1) {
        theme = userChosen;
      }
      
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Preload critical assets */}
        <link
          rel="preconnect"
          href="https://teylersf--podcast-mastering-fastapi-app.modal.run"
        />
        <link
          rel="dns-prefetch"
          href="https://teylersf--podcast-mastering-fastapi-app.modal.run"
        />
        
        {/* Inline theme script to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Google Ads (gtag.js) */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-875960507"
          strategy="afterInteractive"
        />
        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-875960507');
            
            // Conversion tracking function for podcast mastering
            function gtag_report_conversion(url) {
              var callback = function () {
                if (typeof(url) != 'undefined') {
                  window.location = url;
                }
              };
              gtag('event', 'conversion', {
                'send_to': 'AW-875960507/Q6kfCMvE-5wbELux2KED',
                'event_callback': callback
              });
              return false;
            }
          `}
        </Script>
      </head>
      <body className={`${dmSans.variable} ${ibmPlexMono.variable} ${caveat.variable} ${patrickHand.variable} antialiased`}>
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <ThemeProvider>
              <div className="noise-texture" />
              {children}
              <Analytics />
            </ThemeProvider>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
