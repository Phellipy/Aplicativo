import { Check, Sun, Moon } from "lucide-react";
import { accentColors, type Appearance } from "./appearance";
export default function AppearanceSettings({
  value,
  onChange,
}: {
  value: Appearance;
  onChange: (next: Appearance) => void;
}) {
  return (
    <section className="appearance-settings" aria-labelledby="appearance-title">
      <h3 id="appearance-title">Aparência</h3>
      <p>
        As alterações são aplicadas e salvas automaticamente neste navegador.
      </p>
      <div className="period-buttons" role="group" aria-label="Modo de cor">
        <button
          type="button"
          aria-pressed={value.mode === "light"}
          onClick={() => onChange({ ...value, mode: "light" })}
        >
          <Sun size={16} />
          Claro
        </button>
        <button
          type="button"
          aria-pressed={value.mode === "dark"}
          onClick={() => onChange({ ...value, mode: "dark" })}
        >
          <Moon size={16} />
          Escuro
        </button>
      </div>
      <fieldset className="accent-options">
        <legend>Cor dos botões</legend>
        <div>
          {accentColors.map((color) => (
            <button
              type="button"
              key={color.id}
              aria-pressed={value.accent === color.id}
              onClick={() => onChange({ ...value, accent: color.id })}
            >
              <span
                className="accent-swatch"
                style={{ background: color.fill, color: color.text }}
              >
                {value.accent === color.id && <Check size={16} />}
              </span>
              {color.name}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="appearance-preview">
        <span>Prévia</span>
        <button type="button" className="primary">
          Botão principal
        </button>
        <button type="button" className="secondary">
          Botão secundário
        </button>
      </div>
      <small>
        As cores de status, pagamentos e WhatsApp mantêm seu significado.
      </small>
    </section>
  );
}
