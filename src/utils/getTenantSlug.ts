// export function getTenantSlug() {
//     const host = window.location.hostname;
//     const parts = host.split(".");
// 
//    return parts.length >= 3 ? parts[0] : "bezerros";
// }

export function getTenantSlug() {
  const host = window.location.hostname;
  const parts = host.split(".");

  // Ambiente local
  if (host === "localhost" || host === "127.0.0.1") {
    return "bezerros";
  }

  // Ambiente stage
  if (parts[0] === "stage") {
    return "bezerros";
  }

  // Produção SaaS
  if (parts.length >= 3) {
    return parts[0];
  }

  return "bezerros";
}