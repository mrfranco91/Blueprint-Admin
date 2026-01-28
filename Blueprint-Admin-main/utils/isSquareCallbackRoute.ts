export const isSquareCallbackRoute = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/square/callback';
};