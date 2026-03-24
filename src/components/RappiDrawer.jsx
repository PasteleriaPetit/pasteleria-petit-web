// src/components/RappiDrawer.jsx
import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RAPPI_BRANCHES } from "../data/rappiBranches";
import { useTranslation } from "react-i18next";
import LOGORAPPI from "../assets/logo-rappi.png"; 

const RAPPI_LOGO_URL = LOGORAPPI;

export default function RappiDrawer({ open, onClose }) {
  const { t } = useTranslation();
  const drawerRef = useRef(null);
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();

    if (open) {
      lastFocusedRef.current = document.activeElement;
      document.addEventListener("keydown", onKey);

      setTimeout(() => {
        drawerRef.current?.querySelector("button, a")?.focus();
      }, 10);
    }

    return () => {
      document.removeEventListener("keydown", onKey);
      if (lastFocusedRef.current?.focus) lastFocusedRef.current.focus();
    };
  }, [open, onClose]);

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
      // fallback viejo
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    } catch (e) {
      // Si falla, no rompemos UI
      console.error("Copy failed:", e);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="rappi-drawer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex justify-end z-50"
          onClick={onClose}
          aria-modal="true"
          role="dialog"
          aria-label={t("rappi.ariaLabel")}
        >
          <motion.div
            ref={drawerRef}
            onClick={(e) => e.stopPropagation()}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28 }}
            className="bg-cream w-full max-w-sm h-full shadow-xl flex flex-col outline-none"
          >
            {/* Header */}
            <header className="p-4 border-b border-rose flex justify-between items-start sticky top-0 bg-cream">
              <div className="flex gap-3 items-start">
                <div className="h-10 w-10 rounded-xl bg-white border border-rose/30 shadow-sm flex items-center justify-center overflow-hidden">
                  <img
                    src={RAPPI_LOGO_URL}
                    alt="Rappi"
                    className="h-10 w-10 rounded-2xl"
                    loading="lazy"
                    draggable="false"
                  />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-wine">
                    {t("rappi.rappiTitle")}
                  </h2>
                  <p className="text-xs text-wineDark/70 mt-0.5">
                    {t("rappi.chooseBranch")}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="text-wineDark/70 hover:text-red transition focus:outline-none focus:ring-2 focus:ring-rose rounded px-2 py-1"
              >
                ✕
              </button>
            </header>

            {/* Promo message */}
            <section className=" text-center p-4 border-b border-rose/60 bg-cream">
              <div className="bg-white rounded-xl border border-rose/30 p-4 shadow-sm">
                <p className="text-sm font-semibold text-wine">
                  {t("rappi.promo.title")}
                </p>
                <p className="text-sm text-wineDark/80 mt-2 leading-relaxed">
                  {t("rappi.promo.line1")}
                  <br />
                  {t("rappi.promo.line2")}
                  <br />
                  {t("rappi.promo.line3")}
                </p>
                <p className="text-xs font-bold text-wine mt-3">
                  {t("rappi.promo.priceNote")}
                </p>
              </div>
            </section>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {RAPPI_BRANCHES.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-xl border border-rose/30 p-4 shadow-sm"
                >
                  <div className="text-wine font-semibold">{b.name}</div>
                  <div className="text-xs text-wineDark/70 mt-1">
                    {b.address}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-[#F44611] text-white text-sm font-medium hover:opacity-90 transition"
                    >
                      {t("rappi.openInRappi")}
                    </a>

                    <button
                      onClick={() => copyToClipboard(b.url)}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-wine/30 text-wine text-sm hover:bg-rose/10 transition"
                    >
                      {t("rappi.copyLink")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <footer className="p-4 border-t border-rose bg-cream">
              <p className="text-xs text-wineDark/70">{t("rappi.footer")}</p>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
