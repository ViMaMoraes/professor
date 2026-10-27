import { redirect } from "next/navigation";

// O proxy já encaminha "/" para o painel, o portal ou o login.
export default function Inicio() {
  redirect("/login");
}
