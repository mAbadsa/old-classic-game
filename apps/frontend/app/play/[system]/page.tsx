import { notFound } from "next/navigation";
import { EmulatorPlayer } from "@/components/EmulatorPlayer";
import { EMULATOR_SYSTEMS, isEmulatorSystemKey } from "@/lib/emulator-systems";

interface PlayPageProps {
  params: Promise<{ system: string }>;
  // Example usage: /play/nes?rom=/emulators/roms/nes/game.nes&name=Game
  searchParams: Promise<{ rom?: string; name?: string }>;
}

export default async function PlayPage({ params, searchParams }: PlayPageProps) {
  const { system } = await params;
  const { rom, name } = await searchParams;

  if (!isEmulatorSystemKey(system)) {
    notFound();
  }
  if (!rom) {
    return (
      <main className="flex flex-1 items-center justify-center p-8 text-center">
        <p>
          Pass a ROM to play via the <code>rom</code> query param, e.g.{" "}
          <code>
            /play/{system}?rom=/emulators/roms/{EMULATOR_SYSTEMS[system].romFolder}/game
            {EMULATOR_SYSTEMS[system].extensions[0]}
          </code>
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <EmulatorPlayer
        system={system}
        romUrl={rom}
        gameName={name}
        className="flex-1"
      />
    </main>
  );
}
