import { Counter } from '@/components/counter';

export default function Home() {
  return (
    <main>
      <p className="eyebrow">React + Next.js + JavaScript</p>
      <h1>{'{{projectName}}'}</h1>
      <p>
        Your project is ready. Edit <code>src/app/page.js</code> to get started.
      </p>
      <Counter />
    </main>
  );
}
