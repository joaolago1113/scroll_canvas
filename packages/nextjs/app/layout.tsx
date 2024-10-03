import "@rainbow-me/rainbowkit/styles.css";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Collaborative Art Canvas",
  description: "Collaborative Art Canvas is a public, shared space on the Scroll mainnet where individuals can freely express themselves by drawing or placing images on a 64x64 pixel canvas. This can include anything from personal artwork to branded content, effectively turning the canvas into a dynamic advertisement as others view and interact with it. Anyone can draw on the canvas and even paint over existing images. Once 10 million pixels have been painted, the canvas will be permanently preserved, capturing a collective snapshot of creativity and expression.",
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider enableSystem>
          <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
