import { BathroomBoard } from "@/components/BathroomBoard";
import { BoardProvider } from "@/components/BoardProvider";
import { OriginHero } from "@/components/OriginHero";
import { ToastProvider } from "@/components/Toast";

export default function Page() {
  return (
    <ToastProvider>
      <BoardProvider>
        <main>
          <OriginHero />
          <BathroomBoard />
        </main>
      </BoardProvider>
    </ToastProvider>
  );
}
