import { Counter } from '@/components/counter';

export default function Home() {
  return (
    <main>
      <p className="eyebrow">React + Next.js + TypeScript</p>
      <h1>{'{{projectName}}'}</h1>
      <p>
        Your project is ready. Edit <code>src/app/page.tsx</code> to get started.
      </p>
      <Counter />
    </main>
  );
}
