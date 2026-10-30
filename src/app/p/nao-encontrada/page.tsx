import { StatusScreen } from "../status-screen";

export const metadata = { title: "Plaquinha não encontrada" };

export default function Page() {
  return <StatusScreen title="Plaquinha não encontrada" text="Não encontramos este código. Confira se o QR Code está legível." />;
}
