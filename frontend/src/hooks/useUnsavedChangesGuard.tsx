"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PendingNavigation = {
  href: string;
} | null;

export function useUnsavedChangesGuard(isDirty: boolean) {
  const router = useRouter();
  const dirtyRef = useRef(isDirty);
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation>(null);

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

    function handleDocumentClick(event: MouseEvent) {
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

      const anchor = target.closest("a");

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

      const currentPath = current.pathname + current.search + current.hash;
      const destinationPath =
        destination.pathname + destination.search + destination.hash;

      if (destinationPath === currentPath) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setPendingNavigation({
        href: destination.pathname + destination.search + destination.hash,
      });
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  function stayOnPage() {
    setPendingNavigation(null);
  }

  function leaveWithoutSaving() {
    if (!pendingNavigation) {
      return;
    }

    const href = pendingNavigation.href;

    dirtyRef.current = false;
    setPendingNavigation(null);
    router.push(href);
  }

  return {
    pendingNavigation,
    stayOnPage,
    leaveWithoutSaving,
  };
}

export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
    >
      <div className="w-full max-w-md border border-[#a79d93] bg-[#f4f0e9] p-6 shadow-2xl md:p-7">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
          Unsaved changes
        </p>

        <p
          id="unsaved-changes-title"
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
