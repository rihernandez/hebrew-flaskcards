import { useState } from 'react';

const GUIDES = [
  {
    label: '🔤 Cómo leer español',
    file: 'estructura-oraciones-espanol.pdf',
  },
  {
    label: '🔡 Combinaciones especiales',
    file: 'combinaciones-especiales-espanol.pdf',
  },
  {
    label: '📝 Conjugaciones verbales',
    file: 'conjugaciones-verbales-espanol.pdf',
  },
  {
    label: '⚡ Verbos irregulares',
    file: 'verbos-irregulares-espanol.pdf',
  },
];

interface GuidesMenuProps {
  isTauri: boolean;
}

export default function GuidesMenu({ isTauri }: GuidesMenuProps) {
  const [open, setOpen] = useState(false);
  const [modalPdf, setModalPdf] = useState<string | null>(null);

  const handleOpen = async (file: string) => {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_pdf', { pdf: file });
      } catch (e) {
        // fallback al modal si falla
        setModalPdf(file);
      }
    } else {
      setModalPdf(file);
    }
  };

  return (
    <>
      <div className="guides-menu">
        <button
          className="guides-accordion-btn"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <span>📚 Guías de Español</span>
          <span className="guides-chevron">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <ul className="guides-list">
            {GUIDES.map(g => (
              <li key={g.file} onClick={() => handleOpen(g.file)}>
                {g.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal fallback para browser */}
      {modalPdf && (
        <div className="pdf-modal-overlay" onClick={() => setModalPdf(null)}>
          <div className="pdf-modal" onClick={e => e.stopPropagation()}>
            <button className="pdf-modal-close" onClick={() => setModalPdf(null)}>✕</button>
            <iframe
              src={`/docs/${modalPdf}`}
              title="Guía PDF"
              width="100%"
              height="100%"
            />
          </div>
        </div>
      )}
    </>
  );
}
