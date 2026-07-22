import "server-only";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  limitByCredential,
  limitByIp,
  RATE_LIMITS,
} from "@/lib/security/rateLimit";

// Executa o mesmo trabalho de bcrypt quando o e-mail não existe, reduzindo a
// diferença de tempo usada para enumeração de contas.
const dummyPasswordHash = bcrypt.hash("gennys-login-timing-only", 10);

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials, request) {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.senha !== "string"
        ) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const senha = credentials.senha;
        if (
          email.length === 0 ||
          email.length > 254 ||
          senha.length === 0 ||
          Buffer.byteLength(senha, "utf8") > 1_024
        ) {
          return null;
        }

        await limitByIp(request.headers, RATE_LIMITS.loginIp);
        await limitByCredential(
          request.headers,
          email,
          RATE_LIMITS.loginCredential,
        );

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            sessionVersion: true,
          },
        });

        const ok = await bcrypt.compare(
          senha,
          user?.passwordHash ?? (await dummyPasswordHash),
        );
        if (!user || !ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sessionVersion = user.sessionVersion;
        token.invalidated = false;
        return token;
      }

      if (!token.id || typeof token.sessionVersion !== "number") {
        token.invalidated = true;
        return token;
      }

      const current = await prisma.user.findUnique({
        where: { id: token.id },
        select: {
          name: true,
          email: true,
          sessionVersion: true,
        },
      });
      if (!current || current.sessionVersion !== token.sessionVersion) {
        token.invalidated = true;
        delete token.id;
        delete token.sessionVersion;
        return token;
      }

      token.invalidated = false;
      token.name = current.name;
      token.email = current.email;
      return token;
    },
    async session({ session, token }) {
      if (
        !token.invalidated &&
        token.id &&
        typeof token.sessionVersion === "number" &&
        session.user
      ) {
        session.user.id = token.id;
        session.user.sessionVersion = token.sessionVersion;
      } else {
        session.user = undefined;
      }
      return session;
    },
  },
};
