'use client';

import { Header } from "../components/Header";
import CollaborativeArtCanvas from '../components/CollaborativeArtCanvas';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <CollaborativeArtCanvas />
      </main>
    </div>
  );
}