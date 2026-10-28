export const FEATURES = {
  // En desarrollo/preview puedes dejarlo en true si quieres seguir probando,
  // y en producción dependerá de la variable de entorno de Vercel.
  onlineCheckout: import.meta.env.VITE_ENABLE_ONLINE_CHECKOUT === "true",
};
