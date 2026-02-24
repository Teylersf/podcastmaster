import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Free Podcast Mastering",
  description: "Terms of Service for Free Podcast Mastering. All files are deleted within 24 hours. We never sell, share, or retain your audio files. Built for the good of humanity.",
  openGraph: {
    title: "Terms of Service - Free Podcast Mastering",
    description: "Your privacy matters. All files deleted within 24 hours. We never sell or share your data.",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

