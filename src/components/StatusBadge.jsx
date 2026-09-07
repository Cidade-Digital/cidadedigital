import { Store, Home, Sparkles } from 'lucide-react';

export const STATUS_MAPA = {
  oportunidade: { rotulo: 'Espaço disponível', cor: '#f59e0b', Icone: Sparkles },
  ocupado: { rotulo: 'Comércio ativo', cor: '#2563eb', Icone: Store },
  residencial: { rotulo: 'Residencial', cor: '#94a3b8', Icone: Home },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAPA[status] ?? STATUS_MAPA.residencial;
  const { Icone } = cfg;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
      style={{ backgroundColor: cfg.cor }}
    >
      <Icone size={13} /> {cfg.rotulo}
    </span>
  );
}
