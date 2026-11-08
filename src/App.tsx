import { useRef } from 'react';
import { Footer } from './components/Footer';
import { Nav } from './components/Nav';
import { StageProvider, useStage } from './motion/stage';
import { Scene } from './scene/Scene';
import { About } from './sections/About';
import { Audit } from './sections/Audit';
import { Ai } from './sections/Ai';
import { Cases } from './sections/Cases';
import { Faq } from './sections/Faq';
import { Final } from './sections/Final';
import { Hero } from './sections/Hero';
import { Prices } from './sections/Prices';
import { Process } from './sections/Process';
import { Reviews } from './sections/Reviews';
import { Services } from './sections/Services';
import { Stats } from './sections/Stats';
import { Trust } from './sections/Trust';

/**
 * Dark sections stand on the graphite; light ones are sheets laid on it (see Sheet).
 * The live scene is only behind the first screen.
 */
const Page = () => {
  const stage = useStage();
  const stageRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <Nav />
      <main className="ground">
        <div
          ref={stageRef}
          className="stage"
          data-lg-role="stage"
          data-gl={stage.gl ? 'on' : 'off'}
          data-still={stage.still ? '' : undefined}
        >
          <Scene stageRef={stageRef} />
          <Hero />
        </div>
        <Stats />
        <Trust />
        <Services />
        <Ai />
        <Cases />
        <Audit />
        <Process />
        <About />
        <Prices />
        <Reviews />
        <Faq />
        <Final />
      </main>
      <Footer />
    </>
  );
};

export const App = () => (
  <StageProvider>
    <Page />
  </StageProvider>
);
