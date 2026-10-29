import './globals.css';

export const metadata = {
  title: '{{projectName}}',
  description: '{{projectName}}',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
