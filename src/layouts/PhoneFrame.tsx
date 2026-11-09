import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Monitor, Smartphone } from 'lucide-react';
import { format } from 'date-fns';

const PhoneContainerContext = createContext<HTMLElement | null>(null);
/** Elemento raíz del teléfono, para que modales y hojas inferiores se rendericen dentro del marco. */
export const usePhoneContainer = () => useContext(PhoneContainerContext);

/** Pantalla simulada: viewport CSS de 440 × 956 px (incluye la barra de estado). */
const SCREEN_W = 440;
const SCREEN_H = 956;
const BEZEL = 10; // borde del marco (md:border-[10px])
const FRAME_W = SCREEN_W + BEZEL * 2;
const FRAME_H = SCREEN_H + BEZEL * 2;
const FRAME_PAD = 24; // md:py-6 del contenedor

/**
 * Escala del marco en escritorio: la pantalla mantiene siempre 440 × 956 px CSS y,
 * si la ventana es más baja o angosta, el teléfono completo se reduce proporcionalmente
 * (sin cambiar el diseño interno). null = sin marco (dispositivo móvil real).
 */
function useFrameScale(stage: HTMLElement | null) {
  const [scale, setScale] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!stage) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => {
      if (!mq.matches) return setScale(null);
      const h = stage.clientHeight - FRAME_PAD * 2;
      const w = stage.clientWidth - 32;
      setScale(Math.min(1, h / FRAME_H, w / FRAME_W));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(stage);
    mq.addEventListener('change', update);
    return () => {
      ro.disconnect();
      mq.removeEventListener('change', update);
    };
  }, [stage]);
  return scale;
}

/**
 * En escritorio (≥ md) muestra la app dentro de un teléfono centrado con pantalla de 440 × 956 px.
 * En dispositivos móviles reales ocupa la pantalla completa.
 */
export default function PhoneFrame({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [stage, setStage] = useState<HTMLElement | null>(null);
  const scale = useFrameScale(stage);
  const [time, setTime] = useState(() => format(new Date(), 'HH:mm'));
  useEffect(() => {
    const t = window.setInterval(() => setTime(format(new Date(), 'HH:mm')), 30000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div
      ref={setStage}
      className="min-h-[calc(100dvh-var(--demo-h))] bg-canvas md:flex md:h-[calc(100dvh-var(--demo-h))] md:items-center md:justify-center md:gap-12 md:overflow-hidden md:bg-[radial-gradient(circle_at_30%_20%,#2a2c31,#111111_60%)] md:py-6"
    >
      {/* Panel lateral solo en escritorio */}
      <aside className="hidden max-w-64 text-white lg:block">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden /> Volver al inicio
        </Link>
        <div className="mt-8 flex items-center gap-2 text-brand">
          <Smartphone className="size-5" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Vista móvil</span>
        </div>
        <p className="mt-3 text-2xl font-extrabold leading-tight">Aplicación móvil FLP Escondida</p>
        <p className="mt-3 text-sm text-white/60">
          Estás viendo la app en un marco de teléfono. En un smartphone real se muestra a pantalla completa.
        </p>
        <Link to="/web/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
          <Monitor className="size-4" aria-hidden /> Ir a Plataforma Web
        </Link>
      </aside>

      {/* Caja con el tamaño ya escalado, para que el marco transformado ocupe su lugar real en el layout */}
      <div className="md:shrink-0" style={scale ? { width: FRAME_W * scale, height: FRAME_H * scale } : undefined}>
      <div
        ref={setEl}
        style={scale ? { width: FRAME_W, height: FRAME_H, transform: `scale(${scale})`, transformOrigin: 'top left' } : undefined}
        className="relative isolate mx-auto flex h-[calc(100dvh-var(--demo-h))] w-full flex-col overflow-hidden bg-canvas md:mx-0 md:rounded-[3.25rem] md:border-[10px] md:border-ink md:shadow-[0_30px_80px_rgb(0_0_0/0.5),0_0_0_2px_#3a3c42]"
      >
        {/* Barra de estado simulada (solo marco de escritorio) */}
        <div className="relative hidden h-8 shrink-0 items-center justify-between bg-ink px-7 text-xs font-semibold text-white md:flex" aria-hidden>
          <span>{time}</span>
          <span className="absolute left-1/2 top-1.5 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-[3px] border border-white/80 p-px">
              <span className="block h-full w-3/4 rounded-[1px] bg-white" />
            </span>
          </span>
        </div>
        <PhoneContainerContext.Provider value={el}>
          <div className={scroll ? 'no-scrollbar flex-1 overflow-y-auto' : 'flex min-h-0 flex-1 flex-col'}>{children}</div>
        </PhoneContainerContext.Provider>
      </div>
      </div>
    </div>
  );
}
