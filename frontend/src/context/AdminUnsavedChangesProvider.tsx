"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type UnsavedChangesContextValue = {
  isDirty: boolean;
  setDirty: (value: boolean) => void;
};

type PendingNavigation =
  | {
      type: "link";
      href: string;
    }
  | {
      type: "browser-back";
    }
  | null;

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null,
);

export function AdminUnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [isDirty, setIsDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation>(null);

  const dirtyRef = useRef(false);

  /*
   * Browser Back handling:
   *
   * popstate cannot be cancelled.
   * When the user presses Back while the page is dirty:
   *
   * 1. Browser briefly moves back.
   * 2. We immediately move forward again to restore this page.
   * 3. Once restoration finishes, show our custom modal.
   * 4. If the admin confirms leaving, we disable the guard and
   *    perform history.back() once more.
   */
  const restoringFromBackRef = useRef(false);
  const allowNextPopRef = useRef(false);

  const setDirty = useCallback((value: boolean) => {
    dirtyRef.current = value;
    setIsDirty(value);
  }, []);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    function handleClick(event: MouseEvent) {
      if (!dirtyRef.current) {
        return;
      }

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);

      if (destination.origin !== current.origin) {
        return;
      }

      const destinationPath =
        destination.pathname + destination.search + destination.hash;

      const currentPath = current.pathname + current.search + current.hash;

      if (destinationPath === currentPath) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      setPendingNavigation({
        type: "link",
        href: destinationPath,
      });
    }

    function handlePopState() {
      /*
       * This popstate was intentionally triggered after the user
       * confirmed "Leave without saving".
       */
      if (allowNextPopRef.current) {
        allowNextPopRef.current = false;
        return;
      }

      /*
       * This is the forward() event used to restore the dirty page
       * after the first Back press.
       */
      if (restoringFromBackRef.current) {
        restoringFromBackRef.current = false;

        setPendingNavigation({
          type: "browser-back",
        });

        return;
      }

      if (!dirtyRef.current) {
        return;
      }

      /*
       * popstate itself is not cancellable, so restore the current
       * history entry first. The next popstate will open the modal.
       */
      restoringFromBackRef.current = true;
      window.history.forward();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const stayOnPage = useCallback(() => {
    setPendingNavigation(null);
  }, []);

  const leaveWithoutSaving = useCallback(() => {
    if (!pendingNavigation) {
      return;
    }

    const navigation = pendingNavigation;

    dirtyRef.current = false;
    setIsDirty(false);
    setPendingNavigation(null);

    if (navigation.type === "link") {
      router.push(navigation.href);
      return;
    }

    /*
     * We already restored the current page with history.forward().
     * Now allow exactly one Back navigation to proceed.
     */
    allowNextPopRef.current = true;
    window.history.back();
  }, [pendingNavigation, router]);

  return (
    <UnsavedChangesContext.Provider
      value={{
        isDirty,
        setDirty,
      }}
    >
      {children}

      {pendingNavigation && (
        <UnsavedChangesDialog
          onStay={stayOnPage}
          onLeave={leaveWithoutSaving}
        />
      )}
    </UnsavedChangesContext.Provider>
  );
}

export function useAdminUnsavedChanges(isDirty: boolean) {
  const context = useContext(UnsavedChangesContext);

  if (!context) {
    throw new Error(
      "useAdminUnsavedChanges must be used inside AdminUnsavedChangesProvider.",
    );
  }

  const { setDirty } = context;

  useEffect(() => {
    setDirty(isDirty);

    return () => {
      setDirty(false);
    };
  }, [isDirty, setDirty]);
}

function UnsavedChangesDialog({
  onStay,
  onLeave,
}: {
  onStay: () => void;
  onLeave: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onStay();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onStay]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#25211d]/35 px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-unsaved-title"
    >
      <div className="w-full max-w-md border border-[#9f958b] bg-[#f4f0e9] p-6 shadow-[0_24px_80px_rgba(37,33,29,0.22)] md:p-7">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
          Unsaved changes
        </p>

        <p
          id="admin-unsaved-title"
          className="mt-3 text-2xl font-medium tracking-[-0.025em] text-[#25211d]"
        >
          Leave this page?
        </p>

        <p className="mt-3 text-sm leading-6 text-[#746c64]">
          You have changes that haven&apos;t been saved. Leaving now will
          discard them.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onStay}
            className="border border-[#8f867d] px-4 py-3 text-sm text-[#4d4640] transition hover:bg-[#ebe4db]"
          >
            Stay on page
          </button>

          <button
            type="button"
            onClick={onLeave}
            className="bg-[#25211d] px-4 py-3 text-sm text-[#f4f0e9] transition hover:bg-[#39332d]"
          >
            Leave without saving
          </button>
        </div>
      </div>
    </div>
  );
}
