import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import { useLogout } from "./useAuth";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("./auth-api", () => ({
  logout: vi.fn(),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    withBasePath: vi.fn((path: string) => path),
  };
});

import { logout } from "./auth-api";
import { withBasePath } from "@/lib/api-client";

const mockLogout = logout as Mock;

let assignedHref: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  assignedHref = undefined;

  Object.defineProperty(window, "location", {
    value: { href: "http://localhost:3000/dashboard" },
    writable: true,
  });

  Object.defineProperty(window.location, "href", {
    set(value: string) {
      assignedHref = value;
    },
    get() {
      return "http://localhost:3000/dashboard";
    },
    configurable: true,
  });
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useLogout", () => {
  it("ログアウト成功時にwindow.location.hrefでログイン画面へハードナビゲーションする", async () => {
    mockLogout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(assignedHref).toBe("/login");
  });

  it("SageMaker環境ではbasePathを付与してハードナビゲーションする", async () => {
    (withBasePath as Mock).mockImplementation(
      (path: string) => `/codeeditor/default/absports/3000${path}`,
    );

    mockLogout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(assignedHref).toBe("/codeeditor/default/absports/3000/login");
  });

  it("ログアウト成功時にQueryClientのキャッシュがクリアされる", async () => {
    mockLogout.mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(["auth", "me"], { id: "1", name: "Test" });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useLogout(), { wrapper });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(queryClient.getQueryData(["auth", "me"])).toBeUndefined();
  });
});
