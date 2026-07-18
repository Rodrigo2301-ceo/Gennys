import { withAuth } from "next-auth/middleware";

// Protege as rotas autenticadas, redirecionando para a nossa tela de login
// (sem isso, o next-auth usa a tela padrão em /api/auth/signin).
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/painel/:path*"],
};
