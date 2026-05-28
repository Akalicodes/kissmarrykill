import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-32 text-center">
      <span className="label">404 · unknown model</span>
      <h1 className="font-display text-5xl font-black text-white">
        That LLM isn't on the board.
      </h1>
      <p className="max-w-md text-white/60">
        Either we haven't added it yet or you typed the slug wrong. Head back
        to the main board and pick from the official roster.
      </p>
      <Link href="/" className="btn-primary">
        back to the board
      </Link>
    </div>
  );
}
