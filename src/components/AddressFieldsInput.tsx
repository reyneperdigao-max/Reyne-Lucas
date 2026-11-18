import React, { useState, useRef } from 'react';
import { MapPin, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  StructuredAddress,
  formatCEP,
  lookupAddressByCEP,
} from '../utils/brFormatters';

interface AddressFieldsInputProps {
  value: StructuredAddress;
  onChange: (next: StructuredAddress) => void;
  required?: boolean;
  isDark?: boolean;
  compact?: boolean;
}

export const AddressFieldsInput: React.FC<AddressFieldsInputProps> = ({
  value,
  onChange,
  required = false,
  isDark = true,
  compact = false,
}) => {
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const lastFetchedCepRef = useRef<string>('');

  const handleCepSearch = async (cepToSearch: string) => {
    const digits = cepToSearch.replace(/\D/g, '');
    if (digits.length !== 8) {
      setCepFeedback({
        type: 'error',
        message: 'Informe os 8 dígitos do CEP para pesquisar.',
      });
      return;
    }

    setIsSearchingCep(true);
    setCepFeedback(null);
    lastFetchedCepRef.current = digits;

    const found = await lookupAddressByCEP(digits);
    setIsSearchingCep(false);

    if (found) {
      onChange({
        ...value,
        cep: found.cep,
        street: found.street || value.street,
        neighborhood: found.neighborhood || value.neighborhood,
        city: found.city || value.city,
        state: found.state || value.state,
      });
      setCepFeedback({
        type: 'success',
        message: found.street
          ? `Endereço localizado: ${found.city}/${found.state}`
          : `Cidade localizada: ${found.city}/${found.state} — complete rua e bairro`,
      });
    } else {
      setCepFeedback({
        type: 'error',
        message: 'CEP não encontrado. Preencha os campos abaixo manualmente.',
      });
    }
  };

  const handleCepChange = (raw: string) => {
    const formatted = formatCEP(raw);
    const digits = formatted.replace(/\D/g, '');
    onChange({ ...value, cep: formatted });

    if (digits.length < 8) {
      setCepFeedback(null);
      lastFetchedCepRef.current = '';
    } else if (digits.length === 8 && lastFetchedCepRef.current !== digits) {
      handleCepSearch(digits);
    }
  };

  const inputClass = cn(
    'w-full rounded-2xl border outline-none transition-all text-sm',
    compact ? 'px-3.5 py-3' : 'px-4 py-3.5',
    isDark
      ? 'bg-white/[0.04] border-white/10 focus:border-[#D4AF37] text-white placeholder:text-slate-600'
      : 'bg-slate-50 border-slate-200 focus:border-[#D4AF37] text-slate-900 placeholder:text-slate-400'
  );

  const labelClass = cn(
    'text-[10px] font-black uppercase tracking-widest ml-1 block',
    isDark ? 'text-slate-400' : 'text-slate-500'
  );

  return (
    <div className="space-y-3.5">
      {/* CEP + Search button */}
      <div className="space-y-1.5">
        <label className={labelClass}>
          CEP (Pesquisa automática de Cidade / Endereço)
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              inputMode="numeric"
              value={value.cep}
              onChange={(e) => handleCepChange(e.target.value)}
              placeholder="00000-000"
              maxLength={9}
              className={cn(inputClass, 'pl-10 font-mono')}
            />
          </div>
          <button
            type="button"
            disabled={isSearchingCep}
            onClick={() => handleCepSearch(value.cep)}
            className={cn(
              'px-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shrink-0',
              isSearchingCep
                ? 'opacity-70 cursor-wait bg-[#D4AF37]/20 border-[#D4AF37]/30 text-[#D4AF37]'
                : 'bg-[#D4AF37]/15 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black border-[#D4AF37]/35'
            )}
          >
            {isSearchingCep ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Buscando</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Buscar CEP</span>
              </>
            )}
          </button>
        </div>

        {cepFeedback && (
          <div
            className={cn(
              'flex items-center gap-1.5 text-[11px] font-bold ml-1 pt-0.5',
              cepFeedback.type === 'success' ? 'text-emerald-400' : 'text-amber-400'
            )}
          >
            {cepFeedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{cepFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Rua & Número */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3 space-y-1.5">
          <label className={labelClass}>
            Rua / Logradouro {required && '*'}
          </label>
          <input
            type="text"
            required={required}
            value={value.street}
            onChange={(e) => onChange({ ...value, street: e.target.value })}
            placeholder="Ex: Rua das Flores, Av. Brasil..."
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>
            Número {required && '*'}
          </label>
          <input
            type="text"
            required={required}
            value={value.number}
            onChange={(e) => onChange({ ...value, number: e.target.value })}
            placeholder="Ex: 123 ou S/N"
            className={inputClass}
          />
        </div>
      </div>

      {/* Bairro & Complemento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={labelClass}>
            Bairro {required && '*'}
          </label>
          <input
            type="text"
            required={required}
            value={value.neighborhood}
            onChange={(e) => onChange({ ...value, neighborhood: e.target.value })}
            placeholder="Ex: Centro"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Complemento (opcional)</label>
          <input
            type="text"
            value={value.complement}
            onChange={(e) => onChange({ ...value, complement: e.target.value })}
            placeholder="Casa, Apto, Quadra, Lote..."
            className={inputClass}
          />
        </div>
      </div>

      {/* Cidade & Estado (UF) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3 space-y-1.5">
          <label className={labelClass}>
            Cidade {required && '*'}
          </label>
          <input
            type="text"
            required={required}
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder="Ex: São Paulo (ou pesquise pelo CEP)"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>UF {required && '*'}</label>
          <input
            type="text"
            required={required}
            maxLength={2}
            value={value.state}
            onChange={(e) =>
              onChange({
                ...value,
                state: e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase(),
              })
            }
            placeholder="SP"
            className={cn(inputClass, 'uppercase text-center font-mono')}
          />
        </div>
      </div>
    </div>
  );
};
