import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getConfiguredOwnerEmail,
  isOwnerEmail,
} from "@/lib/auth/owner-email";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
  return to;
}

function redirectWithSession(
  request: NextRequest,
  pathname: string,
  sessionResponse: NextResponse
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return copyCookies(sessionResponse, NextResponse.redirect(url));
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function isPublicPage(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/auth");
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isApiPath(request.nextUrl.pathname) || isPublicPage(request.nextUrl.pathname)) {
      return supabaseResponse;
    }
    return redirectWithSession(request, "/login", supabaseResponse);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Las APIs privadas responden JSON en requireOwner. Aquí solo se refresca la sesión.
  if (isApiPath(pathname)) {
    return supabaseResponse;
  }

  const ownerConfigured = Boolean(getConfiguredOwnerEmail());
  const owner = Boolean(user && isOwnerEmail(user.email));

  if (isPublicPage(pathname)) {
    if (owner) {
      return redirectWithSession(request, "/", supabaseResponse);
    }
    return supabaseResponse;
  }

  if (!ownerConfigured || !user || !owner) {
    if (user && !owner) {
      await supabase.auth.signOut();
    }
    return redirectWithSession(request, "/login", supabaseResponse);
  }

  return supabaseResponse;
}
