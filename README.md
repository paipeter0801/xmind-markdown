# XMind to Markdown Converter

A modern, progressive web application that converts XMind files to Markdown format with real-time preview.

## Features

- Drag-and-drop XMind file upload
- Real-time markdown preview
- Syntax highlighting with Shiki
- Dark mode support
- PWA capabilities for offline use
- Export to .md file

## Tech Stack

- **Astro** - Modern web framework
- **Svelte** - Reactive UI components
- **Tailwind CSS** - Utility-first styling
- **Shiki** - Syntax highlighting
- **Vite PWA** - Progressive Web App support
- **jsZip** - ZIP file handling
- **fast-xml-parser** - XML parsing

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── ui/           # Base UI components (Button, Card, etc.)
│   ├── converter/    # Conversion-related components
│   ├── editor/       # Markdown editor components
│   └── layout/       # Layout components
├── lib/              # Utility functions
├── layouts/          # Astro layouts
├── pages/            # Route pages
├── styles/           # Global styles
└── types/            # TypeScript type definitions

public/
└── icons/            # PWA icons
```

## License

MIT
